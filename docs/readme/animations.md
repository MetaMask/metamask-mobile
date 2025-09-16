# Animations

The two out-of-the-box animation libraries available in MetaMask mobile are [Lottie](https://github.com/lottie-react-native/lottie-react-native) and [Rive](https://github.com/rive-app/rive-react-native).

This guide provides a high-level overview of the animation libraries, including how to use them in the mobile app and how to troubleshoot common issues.

- [Lottie](#lottie)
- [Rive](#tools-for-identifying-re-renders) (Experimental)

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

> **Experimental**: Rive is a new implementation in the mobile app. Its capabilities and usage is still being explored. Please consult with your team before using it in production.
>
> **!! USE AT YOUR OWN RISK !!**

According to the Lottie [website](https://lottiefiles.com/what-is-lottie): A Lottie is a JSON-based animation file format. Originally, Lottie files were created in Adobe After Effects through the [Bodymovin](https://aescripts.com/bodymovin/) plugin. As the ecosystem matured over the years, support was added for other tools such as Figma and Lottie Creator. Read more [here](https://lottiefiles.com/lottie-creator).

### Usage

Read more on React native documenation for Rive [here](https://rive.app/docs/runtimes/react-native/react-native). Instructions on loading Rive files both locally and remotely [here](https://rive.app/docs/runtimes/react-native/loading-rive-to-expo).

```javascript
import Rive from 'rive-react-native';

function App() {
  return (
    <Rive
      url="https://public.rive.app/community/runtime-files/2195-4346-avatar-pack-use-case.riv"
      artboardName="Avatar 1"
      stateMachineName="avatar"
      style={{ width: 400, height: 400 }}
    />
  );
}
```

Imperative:

```javascript
import React, { useEffect, useRef } from 'react';
import Rive from 'react-native-rive';

export default function AnimationWithImperativeApi() {
  const animationRef = useRef < Rive > null;

  useEffect(() => {
    animationRef.current?.play();
  }, []);

  return (
    <Rive
      url="https://public.rive.app/community/runtime-files/2195-4346-avatar-pack-use-case.riv"
      artboardName="Avatar 1"
      stateMachineName="avatar"
      style={{ width: 400, height: 400 }}
    />
  );
}
```

### Troubleshooting

Explore more on React native documenation for Rive [here](https://rive.app/docs/runtimes/react-native/react-native).

App crashes when accessing an animation, state machine, or input?

- Ensure that the animation, state machine, or input name exists in the Rive file.
