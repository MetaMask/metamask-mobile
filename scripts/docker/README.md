The Dockerfile in this directory is intended for local dev.

It has a `docker.io/node` debian base, with MetaMask Mobile build dependencies installed and sudo for the default user enabled.

## Using
### Building
```
$ docker buildx build --pull --build-arg UID=$(id -u) --build-arg GID=$(id -g) -t mm-mobile-build:debian -f scripts/docker/Dockerfile .
```

### Running
```
$ docker run --rm -it \
  -u $(id -u) \
  -v "$(pwd)":/app -w /app \
  mm-mobile-build:debian \
  /bin/bash

# To reuse host yarn cache
$ docker run --rm -it \
  -u $(id -u) \
  -v "$(pwd)":/app -w /app \
  -v ~/.cache/yarn:/home/node/.cache/yarn \
  mm-mobile-build:debian \
  /bin/bash

# shell inside container
$ yarn setup --build-ios
```

### Filesystem permissions
Building the image locally maps the default user UID and GID to the `UID` and `GID` build-args (default `1000`). This means that when you run and mount the image with your local git repository with the same owner, permissions will map semlessly.
You may need to adjust the `--build-arg UID=` and `--build-arg GID=` flags in the following cases:

- The UID/GID of the user running the image is different from the one building it
- You are running rootless docker or podman
- You are getting filesystem permission errors when running the image
- You are using some exotic container runtime
