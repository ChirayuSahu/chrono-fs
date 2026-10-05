/*
 * lru.c - fixed-size LRU cache of 4 KiB data blocks.
 *
 * This is the same idea as LRU page replacement: a fixed number of frames,
 * a hash table to find a block quickly, and a doubly linked list ordered by
 * recency.  A hit moves the block to the front; on a miss with no free
 * frame, the block at the back (least recently used) is evicted.
 */
#include <stdlib.h>
#include <string.h>
#include <pthread.h>
#include "chronofs.h"

struct node {
    uint8_t  key[HASH_LEN];
    uint32_t len;
    int      prev, next;        /* recency list (-1 = none) */
    int      hnext;             /* hash chain   (-1 = none) */
    char     data[BLOCK_SIZE];
};

struct lru {
    pthread_mutex_t mu;
    struct node    *nodes;
    int            *buckets;
    size_t          nbuckets, capacity, used;
    int             head, tail;     /* head = most recent */
    uint64_t        hits, misses, evictions;
};

static size_t bucket_of(const struct lru *c, const uint8_t key[HASH_LEN])
{
    uint64_t h;
    memcpy(&h, key, sizeof(h));     /* key is already a SHA-256: well mixed */
    return (size_t)(h & (c->nbuckets - 1));
}

struct lru *lru_create(size_t capacity)
{
    struct lru *c;
    size_t i;

    if (capacity == 0)
        capacity = 1;
    c = calloc(1, sizeof(*c));
    if (!c)
        return NULL;
    c->capacity = capacity;
    c->nbuckets = 1;
    while (c->nbuckets < capacity * 2)
        c->nbuckets <<= 1;
    c->nodes = calloc(capacity, sizeof(*c->nodes));
    c->buckets = malloc(c->nbuckets * sizeof(*c->buckets));
    if (!c->nodes || !c->buckets) {
        free(c->nodes);
        free(c->buckets);
        free(c);
        return NULL;
    }
    for (i = 0; i < c->nbuckets; i++)
        c->buckets[i] = -1;
    c->head = c->tail = -1;
    pthread_mutex_init(&c->mu, NULL);
    return c;
}

void lru_destroy(struct lru *c)
{
    if (!c)
        return;
    pthread_mutex_destroy(&c->mu);
    free(c->nodes);
    free(c->buckets);
    free(c);
}

static void list_unlink(struct lru *c, int i)
{
    struct node *n = &c->nodes[i];
    if (n->prev >= 0) c->nodes[n->prev].next = n->next; else c->head = n->next;
    if (n->next >= 0) c->nodes[n->next].prev = n->prev; else c->tail = n->prev;
    n->prev = n->next = -1;
}

static void list_push_front(struct lru *c, int i)
{
    struct node *n = &c->nodes[i];
    n->prev = -1;
    n->next = c->head;
    if (c->head >= 0)
        c->nodes[c->head].prev = i;
    c->head = i;
    if (c->tail < 0)
        c->tail = i;
}

static int find(struct lru *c, const uint8_t key[HASH_LEN])
{
    int i = c->buckets[bucket_of(c, key)];
    while (i >= 0 && memcmp(c->nodes[i].key, key, HASH_LEN) != 0)
        i = c->nodes[i].hnext;
    return i;
}

static void hash_remove(struct lru *c, int i)
{
    int *pp = &c->buckets[bucket_of(c, c->nodes[i].key)];
    while (*pp >= 0 && *pp != i)
        pp = &c->nodes[*pp].hnext;
    if (*pp == i)
        *pp = c->nodes[i].hnext;
}

int lru_get(struct lru *c, const uint8_t key[HASH_LEN], void *buf, size_t *len)
{
    int i;
    pthread_mutex_lock(&c->mu);
    i = find(c, key);
    if (i < 0) {
        c->misses++;
        pthread_mutex_unlock(&c->mu);
        return 0;
    }
    c->hits++;
    list_unlink(c, i);
    list_push_front(c, i);
    memcpy(buf, c->nodes[i].data, c->nodes[i].len);
    *len = c->nodes[i].len;
    pthread_mutex_unlock(&c->mu);
    return 1;
}

void lru_put(struct lru *c, const uint8_t key[HASH_LEN], const void *data, size_t len)
{
    int i;
    size_t b;

    if (len > BLOCK_SIZE)
        return;
    pthread_mutex_lock(&c->mu);
    i = find(c, key);
    if (i >= 0) {
        list_unlink(c, i);              /* already cached: just refresh */
    } else {
        if (c->used < c->capacity) {
            i = (int)c->used++;         /* free frame available */
        } else {
            i = c->tail;                /* evict the least recently used */
            list_unlink(c, i);
            hash_remove(c, i);
            c->evictions++;
        }
        memcpy(c->nodes[i].key, key, HASH_LEN);
        b = bucket_of(c, key);
        c->nodes[i].hnext = c->buckets[b];
        c->buckets[b] = i;
    }
    memcpy(c->nodes[i].data, data, len);
    c->nodes[i].len = (uint32_t)len;
    list_push_front(c, i);
    pthread_mutex_unlock(&c->mu);
}

void lru_get_stats(struct lru *c, struct lru_stats *out)
{
    pthread_mutex_lock(&c->mu);
    out->hits = c->hits;
    out->misses = c->misses;
    out->evictions = c->evictions;
    out->used = c->used;
    out->capacity = c->capacity;
    pthread_mutex_unlock(&c->mu);
}
