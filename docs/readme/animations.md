# Animations

The two out-of-the-box animation libraries available in MetaMask mobile are [Lottie](https://github.com/lottie-react-native/lottie-react-native) and [Rive](https://github.com/rive-app/rive-nitro-react-native).

This guide provides a high-level overview of the animation libraries, including how to use them in the mobile app and how to troubleshoot common issues.

- [Lottie](#lottie)
- [Rive](#rive) (Experimental)

## Lottie

According to the Lottie [website](https://lottiefiles.com/what-is-lottie): A Lottie is a JSON-based animation file format. Originally, Lottie files were created in Adobe After Effects through the [Bodymovin](https://aescripts.com/bodymovin/) plugin. As the ecosystem matured over the years, support was added for other tools such as Figma and Lottie Creator. Read more [here](https://lottiefiles.com/lottie-creator).

### Usage

Read more on React native documentation for Lottie [here](https://airbnb.io/lottie/#/react-native).

Declarative:

```javascript
import React from 'react';
import LottieView from 'lottie-react-native';

export default function Animation() {
  return (
    <LottieView source={require('../path/to/animation.json')} autoPlay loop />
  );
}
```

Imperative:

```javascript
import React, { useEffect, useRef } from 'react';
import LottieView from 'lottie-react-native';

export default function AnimationWithImperativeApi() {
  const animationRef = useRef < LottieView > null;

  useEffect(() => {
    animationRef.current?.play();

    // Or set a specific startFrame and endFrame with:
    animationRef.current?.play(30, 120);
  }, []);

  return (
    <LottieView
      ref={animationRef}
      source={{ uri: 'https://lottiefileexample.com/animation.json' }}
    />
  );
}
```

### Troubleshooting

Read more about troubleshooting [here](https://airbnb.io/lottie/#/react-native?id=troubleshooting).

## Rive

Rive is a design and animation application for building interactive, real-time motion graphics for apps, websites, and games. It allows designers to create animated characters, UI components, and other dynamic content that can respond to user input and data. Key features include a state machine for managing complex interactions without code, open-source runtimes for broad compatibility, and a runtime-focused editor with a familiar interface similar to Figma and Illustrator.

The app uses the Nitro-based runtime, [`@rive-app/react-native`](https://github.com/rive-app/rive-nitro-react-native) (the legacy `rive-react-native` package was replaced in the Rive Nitro migration).

### Usage

Read more on the React Native documentation for Rive [here](https://rive.app/docs/runtimes/react-native/react-native).

Declarative — load a bundled `.riv` with `useRiveFile` and render a `RiveView`:

```tsx
import { RiveView, useRiveFile } from '@rive-app/react-native';

function App() {
  const { riveFile } = useRiveFile(MyAnimation); // a bundled .riv asset

  return (
    riveFile && <RiveView file={riveFile} stateMachineName="avatar" autoPlay />
  );
}
```

Imperative inputs: pass `useRive()`'s `setHybridRef` to `<RiveView hybridRef={...}>`, wait for `riveViewRef` to become non-null (the Nitro equivalent of the legacy `onPlay` signal), then fire inputs with `riveRef.current?.triggerInput('Start')` / `setBooleanInputValue(...)`. See `app/components/UI/FoxLoader/FoxLoader.tsx`.

Data binding: for `.riv` files authored with view models, bind an instance with `useViewModelInstance(riveFile, { artboardName, async: true })`, pass it to `<RiveView dataBind={instance}>`, and use the property hooks (`useRiveString`, `useRiveNumber`, `useRiveBoolean`, `useRiveTrigger`). See `app/components/UI/Money/Views/MoneyOnboardingView/MoneyOnboardingView.tsx`.

### Testing

Jest maps `@rive-app/react-native` to `app/__mocks__/rive-app-react-native.tsx` (see `moduleNameMapper` in `jest.config.js`). The mock renders plain `View`s and exposes helpers (`__mockRiveTriggerInput`, `__getLastRiveViewMethods`, `__getRivePropertySetter`, `__fireRiveTrigger`, `__resetRiveMocks`) for asserting trigger/property interactions.

### Troubleshooting

App crashes or `onError` fires when accessing an animation, state machine, or input?

- Ensure that the artboard, state machine, view-model property, or input name exists in the Rive file (`strings file.riv | grep <name>` is a quick sanity check).
- Note the Nitro runtime has no `onStateChanged` or `animationName` prop — drive behavior through state machine inputs, view-model triggers, or timers.
