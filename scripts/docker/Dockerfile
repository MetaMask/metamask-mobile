# syntax=docker/dockerfile:1.4

###### Foundry builder
ARG FOUNDRY_BUILDER_ALPINE_VERSION=3.19
ARG FOUNDRY_BUILDER_RUST_VERSION=1.81
ARG NODE_VERSION=20
ARG DEBIAN_VERSION=bookworm
FROM rust:${FOUNDRY_BUILDER_RUST_VERSION}-alpine${FOUNDRY_BUILDER_ALPINE_VERSION} as foundry-build-environment

WORKDIR /opt

ARG FOUNDRY_COMMIT=a17869a6dcce7ce3765c5ed521d40ddb572de9f0
RUN apk add --no-cache clang lld curl build-base linux-headers git \
  && mkdir foundry \
  && cd foundry \
  && git init \
  && git remote add origin https://github.com/foundry-rs/foundry.git \
  && git fetch --depth 1 origin "${FOUNDRY_COMMIT}" \
  && git checkout FETCH_HEAD

ARG TARGETARCH
RUN [[ "$TARGETARCH" = "arm64" ]] && echo "export CFLAGS=-mno-outline-atomics" >> $HOME/.profile || touch $HOME/.profile

WORKDIR /opt/foundry

RUN --mount=type=cache,target=/root/.cargo/registry --mount=type=cache,target=/root/.cargo/git --mount=type=cache,target=/opt/foundry/target \
    source $HOME/.profile \
    && cargo build --release -p anvil \
    && mkdir out \
    #&& mv target/release/forge out/forge \
    #&& mv target/release/cast out/cast \
    && mv target/release/anvil out/anvil \
    #&& mv target/release/chisel out/chisel \
    #&& strip out/forge \
    #&& strip out/cast \
    #&& strip out/chisel \
    && strip out/anvil;

###### Split base image for compatibly parallelizable builds
FROM node:${NODE_VERSION}-${DEBIAN_VERSION} as base

RUN apt-get update \
  && apt-get install -y \
    git curl jq time \
    sudo locales \
    build-essential ccache cmake cmake-format distcc \
  && sed -i '/en_US.UTF-8/s/^# //' /etc/locale.gen \
  && locale-gen

ARG YARN_VERSION=1.22.22
ENV YARN_VERSION ${YARN_VERSION}
# replace base image yarn 1.19
# checksums and sigs for 1.22 not available as of now...
# https://github.com/nodejs/docker-node/blob/07bd7414c9eeb7a134951122e1105e8c849f770e/Dockerfile-debian.template
COPY scripts/docker/yarn-v$YARN_VERSION.tar.gz.sha256 .
RUN curl -fsSLO --compressed "https://yarnpkg.com/downloads/$YARN_VERSION/yarn-v$YARN_VERSION.tar.gz" \
  && sha256sum yarn-v$YARN_VERSION.tar.gz.sha256 \
  && tar -xzf yarn-v$YARN_VERSION.tar.gz -C /opt/ \
  && ln -sf /opt/yarn-v$YARN_VERSION/bin/yarn /usr/local/bin/yarn \
  && ln -sf /opt/yarn-v$YARN_VERSION/bin/yarnpkg /usr/local/bin/yarnpkg \
  && rm yarn-v$YARN_VERSION.tar.gz.sha256 yarn-v$YARN_VERSION.tar.gz \
  && yarn --version

ARG UID=1000
ARG GID=1000
# if UID differs from default: create new user/group; take over /home/node
RUN  bash -c "[ ${GID} != \"1000\" ] && groupadd -g ${GID} -U node userz || true" \
  && bash -c "[ ${UID} != \"1000\" ] && useradd -u ${UID} -g ${GID} -d /home/node user && chown -R ${UID}:${GID} /home/node || true" \
  && usermod -G sudo -a $(id -un ${UID}) \
  && echo '%sudo ALL=(ALL) NOPASSWD: ALL' >> /etc/sudoers

# install ruby deps
COPY --chown=${UID}:${GID} ios/Gemfile* .ruby-version /tmp/app/
WORKDIR /tmp/app

####
USER $UID:$GID
ENV BUNDLE_PATH=/home/node/.bundle
ENV HOME=/home/node
# distro rbenv and ruby are out of date - install rbenv from git and manage ruby
# RUBY_BUILD_VERSION=v20240501
ARG RBENV_COMMIT=c3ba994ec2daccf4d160aea7f55dd5cc6fc873ef
ARG RUBY_BUILD_COMMIT=263640c9fe1d44e6fc8f86fc56a67ee58e7b22f7
RUN (mkdir /home/node/.rbenv \
    && curl -sL https://github.com/rbenv/rbenv/archive/${RBENV_COMMIT}.tar.gz \
    | tar --strip-components=1 -C /home/node/.rbenv/ -xzf - \
  ) && (mkdir -p /home/node/.rbenv/plugins/ruby-build \
    && curl -sL https://github.com/rbenv/ruby-build/archive/${RUBY_BUILD_COMMIT}.tar.gz \
    | tar --strip-components=1 -C /home/node/.rbenv/plugins/ruby-build -xzf - \
  ) \
  && echo 'eval "$(/home/node/.rbenv/bin/rbenv init -)"' >> /home/node/.bashrc

ARG BUNDLER_VERSION=2.5.8
RUN bash -c 'eval "$(/home/node/.rbenv/bin/rbenv init -)" \
    && rbenv install \
    && gem install bundler -v ${BUNDLER_VERSION} \
    && gem install bigdecimal cocoapods \
    && bundle install'

###### Final image
FROM base

COPY --from=foundry-build-environment /opt/foundry/out/anvil /usr/local/bin/anvil
#COPY --from=foundry-build-environment /opt/foundry/out/cast /usr/local/bin/cast
#COPY --from=foundry-build-environment /opt/foundry/out/chisel /usr/local/bin/chisel
#COPY --from=foundry-build-environment /opt/foundry/out/forge /usr/local/bin/forge

# fix broken ipv6 on nodejs v20
ENV NODE_OPTIONS="--no-network-family-autoselection --trace-warnings"
# minimize ruby memory usage
ENV MALLOC_ARENA_MAX=1
ENV PATH=/home/node/.rbenv/shims/:$PATH
ENV LANG=en_US.UTF-8

WORKDIR /app
