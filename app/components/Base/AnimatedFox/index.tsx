/* eslint-disable react/prop-types */
import React, { useEffect, useRef } from 'react';
import {
  gyroscope,
  SensorTypes,
  setUpdateIntervalForType,
} from 'react-native-sensors';
import { getTotalMemorySync } from 'react-native-device-info';

interface AnimatedFoxProps {
  bgColor: string;
}
const round = (value: number, decimals: number): number =>
  Number(Math.round(Number(value + 'e' + decimals)) + 'e-' + decimals);

const styles = { flex: 1 };

const AnimatedFox: React.FC<AnimatedFoxProps> = ({ bgColor }) => {
  const webviewRef = useRef<WebView>(null);
  const position = useRef({ beta: 0, gamma: 0 });

  /**
   * If a device have lower than 2GB Ram we consider a low end device
   * @returns boolean
   */
  const isLowEndDevice = () => {
    // Total device memory in bytes.
    const totalMemory = getTotalMemorySync();
    const oneGigaByte = 1024 * 1024 * 1024;
    return totalMemory <= 2 * oneGigaByte;
  };

  useEffect(() => {
    const updateInterval = isLowEndDevice() ? 1000 / 30 : 1000 / 60; // 30Hz for low-end, 60Hz for others.
    setUpdateIntervalForType(SensorTypes.gyroscope, updateInterval);

    const subscription = gyroscope.subscribe({
      next: ({ x, y }) => {
        position.current = {
          beta: position.current.beta - round(x * -10, 4),
          gamma: position.current.gamma - round(y * -10, 4),
        };

        requestAnimationFrame(() => {
          const JS = `
          (function () {
            const event = new CustomEvent('nativedeviceorientation', {
              detail: {
                beta:${position.current.beta},
                gamma:${position.current.gamma}
              }
            });

            window.dispatchEvent(event);
          })();
        `;
          webviewRef.current?.injectJavaScript(JS);
        });
      },
      error: () => {
        // gyroscope is not available
      },
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return null
};

AnimatedFox.defaultProps = {
  bgColor: 'white',
};

export default AnimatedFox;
