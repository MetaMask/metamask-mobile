# Animations

The two out-of-the-box animation libraries available in MetaMask mobile are [Lottie](https://github.com/lottie-react-native/lottie-react-native) and [Rive](https://github.com/rive-app/rive-react-native).

This guide provides a high-level overview of the animation libraries, including how to use them in the mobile app and how to troubleshoot common issues.

- [Lottie](#lottie)
- [Rive](#rive)

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

For the repository-specific workflow, API examples, data binding, testing,
performance guidance, fallbacks, and troubleshooting, see
[Working with Rive animations](../../app/animations/README.md).

> MetaMask Mobile currently uses the legacy `rive-react-native` API. Rive's
> documentation shows the newer `@rive-app/react-native` runtime first; do not
> mix the two APIs.
