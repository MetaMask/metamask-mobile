# syntax=docker/dockerfile:1.4
FROM node:20-bookworm

RUN apt-get update \
  && apt-get install -y \
    git curl jq time \
    sudo locales \
    build-essential ccache cmake cmake-format distcc \
  && sed -i '/en_US.UTF-8/s/^# //' /etc/locale.gen \
  && locale-gen

# Enable corepack to use Yarn v3 as specified in package.json
RUN corepack enable \
  && corepack prepare yarn@3.8.7 --activate \
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
ARG RBENV_COMMIT=3bac268cdb81dd745ce13a1cf6ff4a286336ab3b
ARG RUBY_BUILD_COMMIT=aab1b8d0e7e814f200320749501ba57e2fae20d0
RUN (mkdir /home/node/.rbenv \
    && curl -sL https://github.com/rbenv/rbenv/archive/${RBENV_COMMIT}.tar.gz \
    | tar --strip-components=1 -C /home/node/.rbenv/ -xzf - \
  ) && (mkdir -p /home/node/.rbenv/plugins/ruby-build \
    && curl -sL https://github.com/rbenv/ruby-build/archive/${RUBY_BUILD_COMMIT}.tar.gz \
    | tar --strip-components=1 -C /home/node/.rbenv/plugins/ruby-build -xzf - \
  ) \
  && echo 'eval "$(/home/node/.rbenv/bin/rbenv init -)"' >> /home/node/.bashrc

RUN bash -c 'eval "$(/home/node/.rbenv/bin/rbenv init -)" \
    && rbenv install \
    && gem install bundler -v 2.5.8 \
    && gem install bigdecimal cocoapods \
    && bundle install'

# fix broken ipv6 on nodejs v20
ENV NODE_OPTIONS="--no-network-family-autoselection --trace-warnings"
# minimize ruby memory usage
ENV MALLOC_ARENA_MAX=1
ENV PATH=/home/node/.rbenv/shims/:$PATH
ENV LANG=en_US.UTF-8

WORKDIR /app
