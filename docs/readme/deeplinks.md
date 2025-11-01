# Deeplinks

The mobile app supports two types of deeplinks for each platform:

- iOS
  - [Universal Links](#universal-links--app-links)
  - [Basic Deep links](#basic-deep-links)
- Android
  - [App Links](#universal-links--app-links)
  - [Basic Deep links](#basic-deep-links)

We also use a deeplinking service called [Branch](https://branch.io/) for providing a seamless deeplinking experience. Under the hood, Branch handles the following features for us:

- [Basic deep links](https://www.branch.io/glossary/uri-schemes/)
- [Deferred deep links](https://www.branch.io/glossary/deferred-deep-linking/)
- [Universal links](https://www.branch.io/glossary/universal-links/) (iOS) & [App Links](https://www.branch.io/glossary/app-links/) (Android)

## Universal Links & App Links

Both Universal Links (iOS) and App Links (Android) are standardized ways for each platform to seamlessly handle transitioning between web and mobile apps. They are most commonly recognized by using the `https://` or `https://` scheme in the URL and essentially function the same way, respectively.

### Expected Behavior

When a user clicks on this type of deeplink, the app will open and the user will initially experience one of the following conditions:

- **Unsigned/Public links** - The user will see an interstitial page with a message reminding them of the risks of clicking on an untrusted links. Proceeding forward will reroute the user to the link's destination.
- **Signed/Private links** - The user will see a page with a message confirming where the user will be redirected to with the ability to check a box to not be reminded again. Proceeding forward will reroute the user to the link's destination.
- **Invalid links** - The user will see a page with a message stating that the page is not found.

### Usage

All deeplinks are parsed by the [DeeplinkManager](../../app/core/DeeplinkManager/DeeplinkManager.ts) service, which is responsible triaging them into their appropriate handlers. Since these links use `https://` and `http://` schemes, they are routed to the [handleUniversalLink](../../app/core/DeeplinkManager/ParseManager/handleUniversalLink.ts) utility function, which further triages them into their respective handlers based on the parsed action. **Each handler is implemented and owned by their respective teams.**

For example, if the link is `https://link.metamask.io/swaps`, the parsed action will be `swaps`:

To handle a new action:

```javascript
// app/core/DeeplinkManager/ParseManager/handleUniversalLink.ts

async function handleUniversalLink(/* ... */) {
  /* ... */
  if (action === SUPPORTED_ACTIONS.SWAPS) {
    // Handle swaps
    instance.handleSwaps();
  } else if (
    // Add your new action here
    action === SUPPORTED_ACTIONS.NEW_ACTION
  ) {
    // Handle your new action here
    instance.handleNewAction();
  }
}
```

### Troubleshooting

- Link routes to the page not found interstitial
  - Verify that the link format is correct
  - Verify that the link's action is handled
- Interstitial appears after clicking on a deeplink
  - As long as the user has not checked the box to not be reminded again, the interstitial is expected to appear
- Interstitial does not appear after clicking on a deeplink
  - Verify that the user has checked the box to not be reminded again
  - Verify that you are clicking on a deeplink with the `https://` or `http://` scheme
- Clicking on a deeplink does not open the app
  - Verify that you are clicking on a deeplink with the `https://` or `http://
  - Verify that the hostname is either `link.metamask.io` or `metamask.app.link` in production builds
  - Verify that the hostname is either `link-test.metamask.io` or `metamask.test-app.link` for development builds

## Basic Deep Links

Traditionally, deeplinks utilized custom URI schemes in place of the protocol. For example, a basic deep link might've started with `metamask://...`.

### Expected Behavior

WIP - We are working on adding better documentation. Thank you for your patience.

### Usage

WIP - We are working on adding better documentation. Thank you for your patience.

## Troubleshooting

WIP - We are working on adding better documentation. Thank you for your patience.
