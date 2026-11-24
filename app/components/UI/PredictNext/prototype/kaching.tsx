import React from 'react';
import { StyleSheet } from 'react-native';
import Video, { type ReactVideoSource } from 'react-native-video';

/* eslint-disable import-x/no-commonjs, @typescript-eslint/no-require-imports */
const KACHING: ReactVideoSource = require('./assets/kaching.wav');

const styles = StyleSheet.create({
  player: { height: 1, opacity: 0, width: 1 },
});

/** Plays the confirmation chime once. Mount it when an order is confirmed. */
export const ConfirmationChime = () => (
  <Video
    testID="confirmation-chime"
    source={KACHING}
    paused={false}
    repeat={false}
    volume={0.8}
    ignoreSilentSwitch="ignore"
    mixWithOthers="mix"
    disableFocus
    playInBackground={false}
    pointerEvents="none"
    style={styles.player}
  />
);
