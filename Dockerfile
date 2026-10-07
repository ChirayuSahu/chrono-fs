# Linux build/run environment for ChronoFS (FUSE needs a Linux kernel).
FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential pkg-config libfuse3-dev fuse3 libncurses-dev tzdata \
        tree less vim-tiny procps ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /src
CMD ["/bin/bash"]
