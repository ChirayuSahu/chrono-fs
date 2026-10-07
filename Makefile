CC      ?= gcc
CFLAGS  ?= -O2 -g
override CFLAGS += -std=gnu11 -Wall -Wextra -Wno-format-truncation -Iinclude -D_FILE_OFFSET_BITS=64 -D_GNU_SOURCE \
                   $(shell pkg-config --cflags fuse3)
override LDLIBS += $(shell pkg-config --libs fuse3) -lpthread

# Optional ncurses timeline browser (`chronofs tui`).
#   The core filesystem has no dependency on ncurses; if it is missing, `tui`
#   is compiled as a stub that explains how to enable it.
#   Force with:  make HAVE_NCURSES=0   or   make HAVE_NCURSES=1
NCURSES_CFLAGS ?= $(shell pkg-config --cflags ncursesw 2>/dev/null || pkg-config --cflags ncurses 2>/dev/null)
NCURSES_LIBS   ?= $(shell pkg-config --libs   ncursesw 2>/dev/null || pkg-config --libs   ncurses 2>/dev/null)
HAVE_NCURSES   ?= $(shell pkg-config --exists ncursesw 2>/dev/null && echo 1 || (pkg-config --exists ncurses 2>/dev/null && echo 1 || echo 0))
ifeq ($(HAVE_NCURSES),1)
override CFLAGS += -DHAVE_NCURSES $(NCURSES_CFLAGS)
override LDLIBS += $(NCURSES_LIBS)
endif

SRCS    := $(wildcard src/*.c)
OBJS    := $(SRCS:src/%.c=build/%.o)

chronofs: $(OBJS)
	$(CC) $(CFLAGS) -o $@ $^ $(LDLIBS)

build/%.o: src/%.c include/chronofs.h | build
	$(CC) $(CFLAGS) -c -o $@ $<

build:
	mkdir -p build

demo: chronofs
	./scripts/demo.sh

clean:
	rm -rf build chronofs

.PHONY: demo clean
