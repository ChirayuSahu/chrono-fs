/*
 * journal.c - the append-only version journal and its in-memory index.
 *
 * Every change to the filesystem (new file version, delete, mkdir, rmdir)
 * becomes one fixed-size record appended to <store>/journal.log.  On open,
 * the whole journal is replayed into a hash table mapping each path to its
 * sorted list of versions, so "what did /a.txt look like at time T" is a
 * hash lookup plus a binary search.
 */
#include <errno.h>
#include <fcntl.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/stat.h>
#include <time.h>
#include <unistd.h>
#include "chronofs.h"

_Static_assert(sizeof(struct jrec) == 1096, "journal record layout changed");

int64_t now_ns(void)
{
    struct timespec ts;
    clock_gettime(CLOCK_REALTIME, &ts);
    return (int64_t)ts.tv_sec * NS_PER_SEC + ts.tv_nsec;
}

int normalize_path(const char *in, char *out, size_t n)
{
    size_t o = 0;
    const char *p = in;

    if (n < 2)
        return -1;
    out[o++] = '/';
    while (*p) {
        while (*p == '/')
            p++;
        if (!*p)
            break;
        if (o > 1) {
            if (o + 1 >= n)
                return -1;
            out[o++] = '/';
        }
        while (*p && *p != '/') {
            if (o + 1 >= n)
                return -1;
            out[o++] = *p++;
        }
    }
    out[o] = '\0';
    return 0;
}

int store_path(const struct store *st, char *out, size_t n, const char *sub)
{
    int r = snprintf(out, n, "%s/%s", st->root, sub);
    return (r < 0 || (size_t)r >= n) ? -ENAMETOOLONG : 0;
}

/* Maps a filesystem path like "/a/b" to "<store>/current/a/b". */
int store_real_path(const struct store *st, char *out, size_t n, const char *fpath)
{
    int r = snprintf(out, n, "%s/current%s", st->root, strcmp(fpath, "/") ? fpath : "");
    return (r < 0 || (size_t)r >= n) ? -ENAMETOOLONG : 0;
}

/* ------------------------------------------------------------------ */
/* Index: path -> sorted version list                                 */
/* ------------------------------------------------------------------ */

static uint64_t fnv1a(const char *s)
{
    uint64_t h = 1469598103934665603ULL;
    while (*s) {
        h ^= (unsigned char)*s++;
        h *= 1099511628211ULL;
    }
    return h;
}

void index_init(struct index *idx)
{
    memset(idx, 0, sizeof(*idx));
    idx->nbuckets = 1024;
    idx->buckets = calloc(idx->nbuckets, sizeof(*idx->buckets));
}

void index_free(struct index *idx)
{
    size_t i;
    for (i = 0; i < idx->nall; i++) {
        free(idx->all[i]->path);
        free(idx->all[i]->v);
        free(idx->all[i]);
    }
    free(idx->all);
    free(idx->buckets);
    memset(idx, 0, sizeof(*idx));
}

static void index_rehash(struct index *idx)
{
    size_t nb = idx->nbuckets * 2, i;
    struct pentry **b = calloc(nb, sizeof(*b));
    if (!b)
        return;
    for (i = 0; i < idx->nall; i++) {
        struct pentry *p = idx->all[i];
        size_t k = fnv1a(p->path) & (nb - 1);
        p->next = b[k];
        b[k] = p;
    }
    free(idx->buckets);
    idx->buckets = b;
    idx->nbuckets = nb;
}

struct pentry *index_find(const struct index *idx, const char *path)
{
    struct pentry *p = idx->buckets[fnv1a(path) & (idx->nbuckets - 1)];
    while (p && strcmp(p->path, path) != 0)
        p = p->next;
    return p;
}

int index_add(struct index *idx, const char *path, const struct version *v)
{
    struct pentry *p = index_find(idx, path);
    size_t i;

    if (!p) {
        size_t k;
        p = calloc(1, sizeof(*p));
        if (!p || !(p->path = strdup(path))) {
            free(p);
            return -ENOMEM;
        }
        if (idx->nall == idx->capall) {
            size_t nc = idx->capall ? idx->capall * 2 : 256;
            struct pentry **na = realloc(idx->all, nc * sizeof(*na));
            if (!na) {
                free(p->path);
                free(p);
                return -ENOMEM;
            }
            idx->all = na;
            idx->capall = nc;
        }
        idx->all[idx->nall++] = p;
        k = fnv1a(path) & (idx->nbuckets - 1);
        p->next = idx->buckets[k];
        idx->buckets[k] = p;
        if (idx->nall > idx->nbuckets)
            index_rehash(idx);
    }

    if (p->n == p->cap) {
        size_t nc = p->cap ? p->cap * 2 : 4;
        struct version *nv = realloc(p->v, nc * sizeof(*nv));
        if (!nv)
            return -ENOMEM;
        p->v = nv;
        p->cap = nc;
    }
    /* Records normally arrive in time order; insertion sort handles the rest. */
    i = p->n;
    while (i > 0 && p->v[i - 1].ts_ns > v->ts_ns) {
        p->v[i] = p->v[i - 1];
        i--;
    }
    p->v[i] = *v;
    p->n++;
    idx->nrecords++;
    return 0;
}

/* Latest version with ts <= t (binary search), or NULL. */
const struct version *pentry_at(const struct pentry *p, int64_t t)
{
    size_t lo = 0, hi;
    if (!p || p->n == 0)
        return NULL;
    hi = p->n;
    while (lo < hi) {
        size_t mid = (lo + hi) / 2;
        if (p->v[mid].ts_ns <= t)
            lo = mid + 1;
        else
            hi = mid;
    }
    return lo ? &p->v[lo - 1] : NULL;
}

const struct version *index_at(const struct index *idx, const char *path, int64_t t)
{
    return pentry_at(index_find(idx, path), t);
}

int version_live(const struct version *v)
{
    return v && (v->op == OP_WRITE || v->op == OP_MKDIR);
}

/* ------------------------------------------------------------------ */
/* Journal file                                                       */
/* ------------------------------------------------------------------ */

int journal_read_all(const char *store_root, struct jrec **out, size_t *n)
{
    char path[PATH_MAX];
    struct stat sb;
    struct jrec *recs;
    size_t count, got = 0, i, valid;
    int fd;

    *out = NULL;
    *n = 0;
    snprintf(path, sizeof(path), "%s/journal.log", store_root);
    fd = open(path, O_RDONLY);
    if (fd < 0)
        return errno == ENOENT ? 0 : -errno;
    if (fstat(fd, &sb) < 0) {
        close(fd);
        return -errno;
    }
    count = (size_t)sb.st_size / sizeof(struct jrec);
    if (count == 0) {
        close(fd);
        return 0;
    }
    recs = malloc(count * sizeof(*recs));
    if (!recs) {
        close(fd);
        return -ENOMEM;
    }
    while (got < count * sizeof(*recs)) {
        ssize_t r = read(fd, (char *)recs + got, count * sizeof(*recs) - got);
        if (r <= 0)
            break;
        got += (size_t)r;
    }
    close(fd);

    /* Keep only complete, well-formed records (a crash may leave a torn tail). */
    count = got / sizeof(*recs);
    for (i = 0, valid = 0; i < count; i++) {
        if (recs[i].magic != JREC_MAGIC)
            continue;
        recs[i].path[JPATH_MAX - 1] = '\0';
        recs[valid++] = recs[i];
    }
    *out = recs;
    *n = valid;
    return 0;
}

static int mkdir_p(const char *path)
{
    if (mkdir(path, 0755) < 0 && errno != EEXIST)
        return -errno;
    return 0;
}

int store_open(struct store *st, const char *dir, int create)
{
    static const char *subdirs[] = { "current", "objects", "manifests" };
    char p[PATH_MAX];
    struct jrec *recs;
    size_t n, i;
    int r;

    memset(st, 0, sizeof(*st));
    st->jfd = -1;
    st->lockfd = -1;
    pthread_rwlock_init(&st->lock, NULL);
    index_init(&st->idx);
    if (!st->idx.buckets)
        return -ENOMEM;

    if (create && mkdir_p(dir) < 0)
        return -errno;
    if (!realpath(dir, st->root))
        return -errno;
    if (!create) {
        snprintf(p, sizeof(p), "%s/journal.log", st->root);
        if (access(p, F_OK) < 0) {
            fprintf(stderr, "chronofs: %s is not a ChronoFS store (no journal.log)\n", st->root);
            return -ENOENT;
        }
    }
    for (i = 0; i < sizeof(subdirs) / sizeof(subdirs[0]); i++) {
        store_path(st, p, sizeof(p), subdirs[i]);
        if ((r = mkdir_p(p)) < 0)
            return r;
    }

    store_path(st, p, sizeof(p), "journal.log");
    st->jfd = open(p, O_RDWR | O_APPEND | O_CREAT, 0644);
    if (st->jfd < 0)
        return -errno;

    if ((r = journal_read_all(st->root, &recs, &n)) < 0)
        return r;
    for (i = 0; i < n; i++) {
        struct version v = {
            .ts_ns = recs[i].ts_ns, .mtime_ns = recs[i].mtime_ns,
            .size = recs[i].size, .mode = recs[i].mode, .op = recs[i].op,
        };
        memcpy(v.manifest, recs[i].manifest, HASH_LEN);
        index_add(&st->idx, recs[i].path, &v);
        if (recs[i].ts_ns > st->last_ts)
            st->last_ts = recs[i].ts_ns;
    }
    free(recs);
    return 0;
}

void store_close(struct store *st)
{
    if (st->jfd >= 0)
        close(st->jfd);
    if (st->lockfd >= 0)
        close(st->lockfd);
    index_free(&st->idx);
    pthread_rwlock_destroy(&st->lock);
    st->jfd = st->lockfd = -1;
}

int store_append_locked(struct store *st, int op, const char *path, uint32_t mode,
                        int64_t mtime_ns, uint64_t size, const uint8_t *manifest)
{
    struct jrec rec;
    struct version v;
    int64_t ts = now_ns();
    ssize_t w;

    if (strlen(path) >= JPATH_MAX)
        return -ENAMETOOLONG;
    /* Timestamps are strictly increasing so every record has its own instant. */
    if (ts <= st->last_ts)
        ts = st->last_ts + 1;

    memset(&rec, 0, sizeof(rec));
    rec.magic = JREC_MAGIC;
    rec.op = (uint16_t)op;
    rec.mode = mode;
    rec.ts_ns = ts;
    rec.mtime_ns = mtime_ns;
    rec.size = size;
    if (manifest)
        memcpy(rec.manifest, manifest, HASH_LEN);
    strcpy(rec.path, path);

    /* One write() of the whole record with O_APPEND: no interleaving. */
    w = write(st->jfd, &rec, sizeof(rec));
    if (w != (ssize_t)sizeof(rec))
        return w < 0 ? -errno : -EIO;

    memset(&v, 0, sizeof(v));
    v.ts_ns = ts;
    v.mtime_ns = mtime_ns;
    v.size = size;
    v.mode = mode;
    v.op = (uint16_t)op;
    memcpy(v.manifest, rec.manifest, HASH_LEN);
    st->last_ts = ts;
    return index_add(&st->idx, path, &v);
}

int store_append(struct store *st, int op, const char *path, uint32_t mode,
                 int64_t mtime_ns, uint64_t size, const uint8_t *manifest)
{
    int r;
    pthread_rwlock_wrlock(&st->lock);
    r = store_append_locked(st, op, path, mode, mtime_ns, size, manifest);
    pthread_rwlock_unlock(&st->lock);
    return r;
}
