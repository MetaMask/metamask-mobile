# Working with Rive animations

This directory contains most Rive runtime files used by MetaMask Mobile. Some
feature-owned files are colocated with their feature, such as the Perps files in
`app/components/UI/Perps/animations/`; follow the neighboring convention when
adding a file.

A `.riv` file is a binary runtime export. Author and inspect it in the
[Rive Editor](https://rive.app/), then export it with **Publish** or
**Export > For runtime**. Do not try to edit the exported file as text.

## At a glance

> **Use `@rive-app/react-native`.** The repository uses Rive's Nitro React
> Native runtime. The legacy `rive-react-native` component, ref, callback, and
> data-binding APIs are not compatible.

- Import bundled `.riv` files statically; shared assets belong in
  `app/animations/`, while feature-owned assets should follow their neighboring
  convention.
- Prefer View Model data binding for new integrations. Keep runtime-facing
  artboard, state machine, input, trigger, and binding names together in code.
- Load files with `useRiveFile`, render `RiveView`, and wait for
  `useRive().riveViewRef` before sending imperative inputs.
- Always provide a non-Rive fallback for essential content and handle native
  errors, Reduce Motion, timeouts, and detached refs.
- Jest validates the React component contract only. It cannot inspect the
  binary, render the animation, or verify runtime-facing names.
- Validate every changed `.riv` file in the Rive Editor and on both iOS and
  Android before merging.

Jump to [adding or updating a file](#add-or-update-a-file),
[rendering a bundled file](#render-a-bundled-file),
[data binding](#use-data-binding),
[fallbacks](#error-handling-and-fallbacks),
[unit tests](#unit-tests), or the
[manual test checklist](#manual-test-checklist).

## Runtime used by this repository

MetaMask Mobile uses the Nitro-based `@rive-app/react-native` package. The main
API used here is:

- `useRiveFile(asset)` to load a bundled file, then `RiveView` with `file`,
  `autoPlay`, and optional `artboardName` / `stateMachineName`
- `useRive()` for `riveRef`, readiness-aware `riveViewRef`, and `setHybridRef`
  passed to `RiveView` as `hybridRef`
- `useViewModelInstance(riveFile, { artboardName, async: true })` with
  `RiveView`'s `dataBind` prop
- `useRiveString`, `useRiveNumber`, `useRiveBoolean`, and `useRiveTrigger` for
  View Model properties and events

The Nitro runtime does not expose the legacy `onPlay`, `onStateChanged`,
`animationName`, `source`, `dataBinding`, `autoplay`, `AutoBind`, `RiveRef`, or
`fireState` APIs. Treat a non-null `riveViewRef` as the view-ready signal and
model completion with View Model triggers or a bounded timer.

Check `package.json` and `yarn.lock` before relying on version-specific Rive
features.

## Tools

- **Rive Editor:** author artboards, state machines, View Models, animations,
  and runtime exports. Use the Data Binding Preview toggle and test every View
  Model instance before exporting.
- **iOS simulator/device and Android emulator/device:** validate the real native
  runtimes. Jest does not parse or render the contents of a `.riv` file.
- **Jest and React Native Testing Library:** test the React component contract,
  callbacks, fallback UI, and calls into the mocked Rive API.
- **Metro:** bundles local `.riv` imports. `metro.config.js` already registers
  `riv` as an asset extension.

There is no repository CLI that validates artboard, state machine, input, or
binding names inside a `.riv` file. The Rive Editor and native runtime are the
source of truth for those names.

## Add or update a file

1. In the Rive Editor, verify:
   - Any artboard, state machine, View Model, or instance omitted from the
     runtime props is configured as the default. Otherwise, pass its name
     explicitly.
   - Runtime-facing names are stable and use consistent casing.
   - New integrations use View Model data binding. Legacy state machine inputs
     remain supported for existing files.
   - Layouts work at small and large phone aspect ratios.
   - Raster assets are compressed and unused artboards/assets are removed.
2. Export a runtime `.riv` file.
3. Put a shared file in `app/animations/`. Use lower snake case and add a
   version suffix when its runtime contract changes, for example
   `account_intro_v2.riv`.
4. Import the asset statically. No native Xcode or Gradle resource entry is
   required:

   ```tsx
   import AccountIntroAnimation from '../../../animations/account_intro_v2.riv';
   ```

   Bundled assets are preferred over remote URLs for predictable offline,
   startup, and OTA behavior. The import type is declared in
   [`app/types/rive.d.ts`](../types/rive.d.ts).

5. Keep all runtime-facing names together near the component, or in a small
   `*RiveConstants.ts` file:

   ```ts
   const RIVE_ARTBOARD_NAME = 'AccountIntro';
   const RIVE_STATE_MACHINE_NAME = 'AccountIntroState';
   const RIVE_START_TRIGGER = 'start';
   const RIVE_TITLE_PATH = 'content/title';
   ```

6. Implement error and accessibility fallbacks, add tests, and manually validate
   both platforms.
7. If Metro continues to serve an old export, restart it with
   `yarn watch:clean`.

When replacing a file without changing its filename, confirm that every
artboard, state machine, trigger, input, binding path, and referenced asset used
by TypeScript still exists. A typo or designer-side rename is invisible to
Jest and is only detected by the native runtime.

## Render a bundled file

Use `useRive()` when code needs to control playback or state machine inputs.
Pass `setHybridRef` to `RiveView`, and fire inputs only after `riveViewRef`
becomes non-null; calling the native ref before Nitro resolves
`awaitViewReady()` can be silently dropped. For delayed View Model reveal
triggers, reuse
[`useRiveRevealTrigger`](../components/UI/Money/hooks/useRiveRevealTrigger.ts).

```tsx
import React, { useCallback, useEffect, useState } from 'react';
import { Image, StyleSheet } from 'react-native';
import {
  Alignment,
  Fit,
  RiveView,
  useRive,
  useRiveFile,
  type RiveError,
} from '@rive-app/react-native';
import Logger from '../../../util/Logger';
import AccountIntroAnimation from '../../../animations/account_intro_v2.riv';
import AccountIntroFallback from '../../../images/account_intro.png';

const RIVE_STATE_MACHINE_NAME = 'AccountIntroState';
const RIVE_START_TRIGGER = 'start';

const styles = StyleSheet.create({
  animation: { width: 240, height: 240 },
});

const AccountIntro = () => {
  const { riveFile } = useRiveFile(AccountIntroAnimation);
  const { riveRef, riveViewRef, setHybridRef } = useRive();
  const [hasRiveError, setHasRiveError] = useState(false);

  useEffect(() => {
    if (!riveViewRef) return;

    try {
      riveRef.current?.triggerInput(RIVE_START_TRIGGER);
    } catch (error) {
      Logger.error(error as Error, 'AccountIntro: Rive trigger failed');
      setHasRiveError(true);
    }
  }, [riveRef, riveViewRef]);

  const handleError = useCallback((riveError: RiveError) => {
    Logger.error(
      new Error(riveError.message),
      `AccountIntro: Rive error (${riveError.type})`,
    );
    setHasRiveError(true);
  }, []);

  if (hasRiveError) {
    return (
      <Image
        source={AccountIntroFallback}
        style={styles.animation}
        accessible={false}
        testID="account-intro-fallback"
      />
    );
  }

  if (!riveFile) return null;

  return (
    <RiveView
      hybridRef={setHybridRef}
      file={riveFile}
      stateMachineName={RIVE_STATE_MACHINE_NAME}
      autoPlay
      fit={Fit.Contain}
      alignment={Alignment.Center}
      style={styles.animation}
      onError={handleError}
      testID="account-intro-animation"
    />
  );
};
```

Use `Fit.Layout` with `layoutScaleFactor={PixelRatio.get()}` for an artboard
authored as a responsive layout. Otherwise, choose `Fit.Contain`,
`Fit.FitWidth`, or another fit explicitly and give `RiveView` deterministic
dimensions.

Existing examples:

- Basic state machine inputs and readiness:
  [`OnboardingAnimation`](../components/UI/OnboardingAnimation/OnboardingAnimation.tsx)
- Responsive data-bound screen:
  [`MoneyOnboardingView`](../components/UI/Money/Views/MoneyOnboardingView/MoneyOnboardingView.tsx)
- High-frequency numeric data and static fallback:
  [`MoneyCardTiltAnimation`](../components/UI/Money/components/MoneyCardTiltAnimation/MoneyCardTiltAnimation.tsx)
- Loading timeout, first-frame fallback, and native error handling:
  [`FoxLoader`](../components/UI/FoxLoader/FoxLoader.tsx)

## Use data binding

Prefer View Models and data binding for new files. In the Rive Editor, attach a
default View Model and default instance to the artboard, then bind its
properties. In React Native, create the instance from the loaded file, pass it
to `RiveView.dataBind`, and access properties by their exact paths. The example
omits the error fallback already shown above.

```tsx
import React, { useEffect } from 'react';
import { PixelRatio, StyleSheet } from 'react-native';
import {
  Fit,
  RiveView,
  useRiveFile,
  useRiveNumber,
  useRiveString,
  useRiveTrigger,
  useViewModelInstance,
} from '@rive-app/react-native';
import AccountIntroAnimation from '../../../animations/account_intro_v2.riv';

interface DataBoundAccountIntroProps {
  title: string;
  onComplete: () => void;
}

const DataBoundAccountIntro = ({
  title,
  onComplete,
}: DataBoundAccountIntroProps) => {
  const { riveFile } = useRiveFile(AccountIntroAnimation);
  const { instance } = useViewModelInstance(riveFile, {
    artboardName: 'AccountIntro',
    async: true,
  });
  const { setValue: setTitle } = useRiveString('content/title', instance);
  const { setValue: setProgress } = useRiveNumber('progress', instance);

  useRiveTrigger('complete', instance, { onTrigger: onComplete });

  useEffect(() => {
    if (!instance) return;
    setTitle(title);
    setProgress(50);
  }, [instance, setProgress, setTitle, title]);

  return riveFile && instance ? (
    <RiveView
      file={riveFile}
      artboardName="AccountIntro"
      stateMachineName="AccountIntroState"
      dataBind={instance}
      autoPlay
      fit={Fit.Layout}
      layoutScaleFactor={PixelRatio.get()}
      style={StyleSheet.absoluteFill}
      testID="account-intro-animation"
    />
  ) : null;
};
```

For high-frequency writes such as device orientation, avoid a data-binding hook
that mirrors every value into React state. Cache
`instance.numberProperty(path)` handles and call their `set(value)` methods
directly. See
[`useRiveParallaxTilt`](../components/UI/Money/hooks/useRiveParallaxTilt.ts).

If changing `artboardName` leaves bindings attached to the previous artboard,
key `RiveView` by artboard so React remounts the native view. Pass
`referencedAssets` on the first `useRiveFile` render and keep the mapping
stable; Nitro installs the asset loader at file-load time, so updating the
mapping after the file loads does not rebind assets.

## Error handling and fallbacks

Treat a Rive animation as a native dependency that can fail independently of
the surrounding React screen.

- Implement `onError`. Decide which `RiveErrorType` values are fatal for the
  flow and which only affect optional content.
- Never block navigation or app startup indefinitely on `riveViewRef`, a View
  Model trigger, or a state transition. Add a timeout for critical flows.
- Use a static image or normal React Native UI for essential content when
  animation is disabled, Reduce Motion is enabled, the file fails, or a feature
  flag is off. Decorative animations can be omitted.
- Keep interactive controls and accessibility labels in React Native. Do not
  rely on visual elements inside the Rive artboard as the only accessible
  representation of content or actions.
- For first-frame black flashes, render a matching static image or background
  behind `RiveView`; after `riveViewRef` becomes non-null, allow a frame or a
  short fade before hiding the static layer.
- Wrap imperative ref calls in `try/catch`; a valid TypeScript string does not
  prove that the name exists in the binary.
- Validate every state machine input and View Model property on Android and
  iOS; incorrect runtime names may throw or arrive through `onError`.
- Do not dispatch through a detached native view. Gate imperative work on
  `riveViewRef`, and stop sensors, timers, and subscriptions during cleanup.
- Add a `testID` to the Rive view and separate IDs for fallback content.

For onboarding performance traces, use
[`useRivePerformance`](../hooks/performance/useRivePerformance.ts) rather than
introducing a second instrumentation pattern.

## Unit tests

[`jest.config.js`](../../jest.config.js):

- Maps `@rive-app/react-native` to the
  [`Nitro Rive mock`](../__mocks__/rive-app-react-native.tsx).
- Transforms `.riv` imports with
  [`assetFileTransformer.js`](../util/test/assetFileTransformer.js).

A component test therefore does not load the binary or native runtime.

The shared mock renders `RiveView` as a `View`, supplies stable loaded-file,
View Model, and ready-view values, and exposes helpers for imperative methods,
property setters, and trigger callbacks:

```tsx
import { render } from '@testing-library/react-native';
import {
  __mockRiveTriggerInput,
  __resetRiveMocks,
} from '../../../__mocks__/rive-app-react-native';

beforeEach(() => {
  __resetRiveMocks();
});

it('fires the start input when the Rive view is ready', () => {
  render(<AccountIntro />);

  expect(__mockRiveTriggerInput).toHaveBeenCalledWith('start');
});
```

Use `__getLastRiveViewMethods()` for view-method assertions,
`__getRivePropertySetter(path)` for bound-value writes, and
`__fireRiveTrigger(path)` for Rive-to-React Native callbacks. Use a test-local
`jest.mock('@rive-app/react-native', factory)` only when a test needs loading,
error, or delayed-readiness behavior not represented by the shared mock.
Examples:

- Shared mock:
  [`RiveOnboardingStepper.test.tsx`](../components/UI/RiveOnboardingStepper/RiveOnboardingStepper.test.tsx)
- Data-binding hooks:
  [`MoneyFirstTimeDepositView.test.tsx`](../components/UI/Money/Views/MoneyFirstTimeDepositView/MoneyFirstTimeDepositView.test.tsx)
- Loading, readiness, and error behavior:
  [`FoxLoader.test.tsx`](../components/UI/FoxLoader/FoxLoader.test.tsx)

Run the focused unit test:

```bash
nvm use
yarn jest app/path/to/Component.test.tsx --no-coverage
```

Unit tests must cover application behavior, not merely that the mocked Rive
`RiveView` exists. Depending on the integration, cover:

- Runtime props and data-binding paths sent by the component.
- Inputs/triggers fired in response to user or runtime events.
- Trigger callbacks received from the Rive file.
- `onError`, timeout, feature-flag, and Reduce Motion fallbacks.
- Guards for an unready or detached `riveViewRef`.

Unit tests cannot verify visuals, file compatibility, fonts, asset loading,
animation timing, or whether a runtime-facing name exists in the binary.

## Manual test checklist

Before merging a new or replaced `.riv` file:

1. Preview every artboard, state machine, transition, View Model instance, and
   bound value in the Rive Editor.
2. Run the actual screen on both iOS and Android. Do not approve an asset after
   testing only one native runtime.
3. Check small and large devices, light and dark themes, orientation changes if
   supported, and long localized strings.
4. Exercise every trigger/input used by the component, including both
   React Native-to-Rive and Rive-to-React Native communication when applicable.
5. Enable Reduce Motion, then temporarily use an invalid runtime name or shorten
   the timeout to verify the non-Rive path remains usable. Do not commit that
   fault injection.
6. Background and foreground the app and navigate away during playback to catch
   detached-ref calls and duplicate callbacks.
7. Check startup/render time and interaction smoothness on a lower-end Android
   device for large or continuously running files.
8. Include the Rive source-project link when available, changed runtime
   contract, file-size change, and tested devices in the PR description.

The entry-point `import 'expo-asset'` in [`index.js`](../../index.js) is required
for `.riv` assets delivered through EAS Updates. Keep it when changing asset or
Metro configuration.

For deterministic E2E tests, complex or nonessential Rive playback may be
skipped when `hasTestOverrides` is enabled, but the fallback must preserve the
same navigation and completion behavior.

## Troubleshooting

- **The animation is blank or `onError` reports an incorrect name:** compare
  `artboardName`, `stateMachineName`, input names, and binding paths against the
  exported file. Names are case-sensitive.
- **The editor works but the app reports an unsupported runtime version:** the
  file uses a feature newer than the native runtime bundled by
  `@rive-app/react-native`. Check the Rive feature support matrix before
  changing native runtime versions.
- **Data-bound values do not change:** verify `useViewModelInstance` resolved
  for the correct artboard, `dataBind={instance}` is set, and the complete
  property path matches the exported View Model.
- **An imperative input is ignored:** pass `setHybridRef` as `hybridRef` and
  wait for `riveViewRef` before calling `riveRef.current`.
- **Calls fail after navigation:** the native view detached. Stop sensors,
  timers, and subscriptions during cleanup and gate new calls on `riveViewRef`.
- **The first frame flashes black:** keep a matching background/static image
  visible until `riveViewRef` is non-null, then fade it out after Rive has had
  time to composite a frame.
- **Jest cannot import a `.riv` file:** retain the `.riv` transform in
  [`jest.config.js`](../../jest.config.js). Do not parse the binary in a unit
  test.
- **An updated export does not appear:** restart Metro with
  `yarn watch:clean`, rebuild if the runtime dependency changed, and verify that
  the expected asset is imported.

When upgrading `@rive-app/react-native`, use the
[native development setup](../../README.md#native-development), rebuild both
platforms, and test iOS and Android separately.

## References

- [Rive Editor](https://rive.app/)
- [Exporting for runtime](https://rive.app/docs/editor/exporting/exporting-for-runtime)
- [Rive best practices](https://rive.app/docs/getting-started/best-practices)
- [Data binding in the editor](https://rive.app/docs/editor/data-binding/overview)
- [React Native runtime documentation](https://rive.app/docs/runtimes/react-native/react-native)
- [React Native migration guide](https://rive.app/docs/runtimes/react-native/migration-guide)
- [Rive runtime feature support](https://rive.app/docs/feature-support)
- [MetaMask unit testing guidelines](../../docs/testing/unit-testing.md)
