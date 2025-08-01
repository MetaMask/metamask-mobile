import React, { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import Device from '../../../util/device';
import ConfettiNormal from 'react-native-confetti';
import ConfettiCannon from 'react-native-confetti-cannon';

const isAndroid = Platform.OS === 'android';
const ORIGIN = { x: Device.getDeviceWidth() / 2, y: 0 };

const Confetti = (props) => {
  const confettiViewRef = useRef(null);

  useEffect(() => {
    if (isAndroid && confettiViewRef.current) {
      confettiViewRef.current.startConfetti();
    }
  }, []);

  return isAndroid ? (
    <ConfettiNormal ref={confettiViewRef} {...props} />
  ) : (
    <ConfettiCannon fadeOut count={300} origin={ORIGIN} {...props} />
  );
};

export default Confetti;
