### Storybook

Storybook is a great tool for working on UI in isolation. Generally all UI should have a storybook file so it can easily be updated and it's a great way to break up a feature into smaller PRs.

On-device Storybook is `@storybook/react-native` 10. Config lives in `.rnstorybook/`.

#### Getting Started with Storybook

Storybook does not share the wallet entry. When it is enabled, Metro swaps `index.js` for `.rnstorybook/index.tsx`, so the wallet registration in `index.js` stays as it is. Do not import Storybook from `index.js`.

##### Steps to Run Storybook:

1. **Start Metro with Storybook enabled**

   ```bash
   yarn storybook
   ```

   That sets `STORYBOOK_ENABLED=true` and starts the watcher. `STORYBOOK_ENABLED=true yarn watch` does the same thing.

2. **Open the app** the same way you normally would (`yarn start:ios` or `yarn start:android`). The simulator launches the Storybook UI instead of the wallet.

`STORYBOOK_ENABLED` is read by Metro when the config loads. Restart Metro after changing it. With the variable unset, Metro leaves the wallet entry in place and Storybook stays out of the bundle.

##### Updating Storybook requires

Whenever you add, remove, or move `*.stories.*` files, regenerate Storybook's requires list:

```bash
yarn storybook-generate
```

Metro also regenerates that file when it starts with `STORYBOOK_ENABLED=true`.

##### Reverting Back to Normal App

Stop Metro and start it again without `STORYBOOK_ENABLED`. No `index.js` edit is required.
