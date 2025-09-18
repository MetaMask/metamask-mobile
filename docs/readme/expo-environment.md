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

### Yarn v3

Ensure you are using the correct yarn version (yarn v3.8.7) as noted in the `package.json`.

<details>
  <summary>Install Yarn v3 using corepack (recommended)</summary>

```bash
corepack enable
corepack prepare yarn@3.8.7 --activate

# check yarn version (should show 3.8.7)
yarn --version
```

</details>

<details>
  <summary>Install Yarn v3 with NPM</summary>

```bash
npm install -g yarn@3.8.7

# check yarn version (should show 3.8.7)
yarn --version
```

</details>

<details>
  <summary>Use project's bundled Yarn (no global install needed)</summary>

The project includes its own Yarn v3.8.7 binary at `.yarn/releases/yarn-3.8.7.cjs`. If you have any version of Yarn installed, the project will automatically use the correct version thanks to the `.yarnrc.yml` configuration.

```bash
# check yarn version (should show 3.8.7 when run from project directory)
yarn --version
```

</details>
