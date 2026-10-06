# Gacha module foundation

This module registers `GachaController` in Engine, a Gacha navigation stack,
an empty Packs tab, an empty My cards tab and a homepage entry point.
The homepage title and button both open the Packs tab.

## Feature flag

Both the homepage section and the main navigator registration are gated only
by the version-gated LaunchDarkly flag `gachaEnabled`:

```json
{ "enabled": true, "minimumVersion": "8.15.0" }
```

Missing, invalid or disabled flags keep the feature hidden. The shared flag
validator compares `minimumVersion` with the installed native app version.
Visibility does not depend on the selected account or its network.

## Controller lifecycle

`GachaController` extends `BaseController` and starts with an empty state.
It uses the regular Engine initialization, `getState` action, `stateChanged`
event, Redux state projection and wallet-reset lifecycle. With no state
fields yet, there is no application data to persist or restore. The next
change introduces real state fields through the standard Engine persistence
path, without a shared persistence override or immediate disk flush.

This foundation contains no provider, API service, wallet signing, funding,
pack artwork, onboarding or purchase logic. These belong to the next change.

## Validation

- Unit tests cover the controller, messenger, initializer, feature flag,
  navigation registration and homepage integration.
- Component-view tests cover the homepage entry points, empty tabs and back
  navigation using real Redux state and navigation.
