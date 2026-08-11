// TEMP on-screen perf readout (Remove before merge).
//
// Prod/minified bundles strip console.log, so this floating overlay surfaces the
// last CTA->VISIBLE measurement (from perf-marker.ts) directly on screen. Mounted
// once at the app root; ignores touches so it never blocks the UI.
//
// Throwaway QA-only component: the design-token / color-literal lint rules are
// disabled deliberately rather than wiring it into the theme system.
/* eslint-disable react-native/no-color-literals, @metamask/design-tokens/color-no-hex */
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { subscribePerf } from './perf-marker';

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.85)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    zIndex: 99999,
  },
  text: {
    color: '#00FF00',
    fontSize: 14,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
});

export function PerfOverlay(): React.ReactElement | null {
  const [ms, setMs] = useState<number | null>(null);

  useEffect(() => subscribePerf(setMs), []);

  if (ms === null) {
    return null;
  }

  return (
    <View pointerEvents="none" style={styles.container}>
      <Text style={styles.text}>{`CTA→VISIBLE: ${ms}ms`}</Text>
    </View>
  );
}
