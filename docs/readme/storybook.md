### Storybook

Storybook is a great tool for working on UI in isolation. Generally all UI should have a storybook file so it can easily be updated and it's a great way to break up a feature into smaller PRs.

#### Getting Started with Storybook

Storybook uses the same entry point as our main app (`index.js`), so you'll need to temporarily modify the entry point to run Storybook.

##### Steps to Run Storybook:

1. **Modify the entry point** - Open `index.js` in the project root

2. **Enable Storybook imports** - Uncomment the following lines:

   ```javascript
   import Storybook from './.storybook';
   AppRegistry.registerComponent(name, () => Storybook);
   ```

3. **Disable the regular app registration** - Comment out the following lines:

   ```javascript
   // AppRegistry.registerComponent(name, () =>
   //   // Disable Sentry for E2E tests
   //   isE2E ? Root : Sentry.wrap(Root),
   // );
   ```

4. **Run the app** - Start the app as you normally would

5. **View Storybook** - The app will now launch with the Storybook UI instead of the regular app

##### Updating Storybook requires

Whenever you add, remove, or move `*.stories.*` files, regenerate Storybook's requires list:

```bash
yarn storybook-generate
```

This ensures Storybook picks up all stories correctly in the app.

##### Reverting Back to Normal App

When you're done with Storybook:

1. **Re-comment the Storybook imports**:

   ```javascript
   // import Storybook from './.storybook';
   // AppRegistry.registerComponent(name, () => Storybook);
   ```

2. **Uncomment the regular app registration**:
   ```javascript
   AppRegistry.registerComponent(name, () =>
     // Disable Sentry for E2E tests
     isE2E ? Root : Sentry.wrap(Root),
   );
   ```

> **Note**: Make sure not to commit these changes to `index.js` as they are only for local development with Storybook.
