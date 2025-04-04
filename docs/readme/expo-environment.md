# Expo Environment Setup

### watchman

Make sure you have `brew` package manager installed:
_NOTE:_ To successfully run the iOS e2e tests, it is essential to install the brew package manager.
[How to install brew](https://brew.sh/#install)

Now install Watchman. Watchman is a tool by Facebook for watching changes in the filesystem. It is highly recommended you install it for better performance.

```bash
brew install watchman
```

### Node

It is recommended to install a Node version manager such as [nodenv](https://github.com/nodenv/nodenv?tab=readme-ov-file#installation), [nvm](https://github.com/nvm-sh/nvm?tab=readme-ov-file#installing-and-updating), [asdf](https://asdf-vm.com/guide/getting-started.html#_3-install-asdf)

Install node version defined in the file `.nvmrc`

### Yarn v1

Ensure you are using the correct yarn version (yarn v1) as noted in the `package.json`.

<details>
  <summary>Install Yarn using corepack (recommended)</summary>

  ```bash
  corepack enable

  # check yarn version
  yarn --version
  ```
</details>

<details>
  <summary>Install Yarn V1 with NPM</summary>

  ```bash
  npm install -g yarn

  # check yarn version
  yarn --version
  ```
</details>