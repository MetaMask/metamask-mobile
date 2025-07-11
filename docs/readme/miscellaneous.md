#### Miscellaneous

- [Troubleshooting for React Native](https://facebook.github.io/react-native/docs/troubleshooting#content)

### Changing dependencies

Whenever you change dependencies (adding, removing, or updating, either in `package.json` or `yarn.lock`), there are various files that must be kept up-to-date.

- `yarn.lock`:
  - Run `yarn setup` again after your changes to ensure `yarn.lock` has been properly updated.
- The `allow-scripts` configuration in `package.json`

  - Run `yarn allow-scripts auto` to update the `allow-scripts` configuration automatically. This config determines whether the package's install/postinstall scripts are allowed to run. Review each new package to determine whether the install script needs to run or not, testing if necessary.
  - Unfortunately, `yarn allow-scripts auto` will behave inconsistently on different platforms. macOS and Windows users may see extraneous changes relating to optional dependencies.

- The Attributions file
  - If you are a MetaMask team member and your PR is on a repository branch, you can use the bot command `@metamaskbot update-attributions` to ask the MetaMask bot to automatically update the attributions file for you.
  - Manual update: run `yarn build:attribution`.

### Other Docs

- [Adding Confirmations](./docs/confirmations.md)
