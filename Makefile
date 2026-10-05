CC      ?= gcc
CFLAGS  ?= -O2 -g
override CFLAGS += -std=gnu11 -Wall -Wextra -Wno-format-truncation -Iinclude -D_FILE_OFFSET_BITS=64 -D_GNU_SOURCE \
                   $(shell pkg-config --cflags fuse3)
override LDLIBS += $(shell pkg-config --libs fuse3) -lpthread

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
