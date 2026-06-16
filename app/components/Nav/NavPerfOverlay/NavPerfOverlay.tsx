// DEMO-ONLY: floating perf overlay for stack transition comparison videos.
// Remove this component (and mount in App.tsx) before merging to main.
/* eslint-disable @metamask/design-tokens/color-no-hex, react-native/no-color-literals */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  clearNavPerfSamples,
  useJsFps,
  useNavPerfSamples,
} from '../../../util/navigation/navPerf';

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 96,
    right: 8,
    zIndex: 9999,
  },
  panel: {
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    minWidth: 180,
  },
  title: {
    color: '#fff',
    fontSize: 10,
    fontFamily: 'Menlo',
    marginBottom: 4,
  },
  fpsText: {
    fontSize: 12,
    fontFamily: 'Menlo',
  },
  fpsGood: {
    color: '#0f0',
  },
  fpsMid: {
    color: '#ff0',
  },
  fpsBad: {
    color: '#f33',
  },
  empty: {
    color: '#888',
    fontSize: 11,
    fontFamily: 'Menlo',
  },
  sample: {
    color: '#0f0',
    fontSize: 11,
    fontFamily: 'Menlo',
  },
  clearButton: {
    alignSelf: 'flex-end',
    marginTop: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  clearText: {
    color: '#aaa',
    fontSize: 10,
    fontFamily: 'Menlo',
  },
});

const fpsStyle = (fps: number) => {
  if (fps >= 55) {
    return styles.fpsGood;
  }
  if (fps >= 30) {
    return styles.fpsMid;
  }
  return styles.fpsBad;
};

export const NavPerfOverlay: React.FC = () => {
  const samples = useNavPerfSamples();
  const fps = useJsFps();

  return (
    <View pointerEvents="box-none" style={styles.root}>
      <View pointerEvents="none" style={styles.panel}>
        <Text style={styles.title}>NAV PERF (demo)</Text>
        <Text style={[styles.fpsText, fpsStyle(fps)]}>JS FPS: {fps}</Text>
        {samples.length === 0 ? (
          <Text style={styles.empty}>(no transitions yet)</Text>
        ) : (
          samples.map((s) => (
            <Text key={`${s.at}-${s.label}`} style={styles.sample}>
              {s.label}: {s.ms} ms
            </Text>
          ))
        )}
      </View>
      <Pressable onPress={clearNavPerfSamples} style={styles.clearButton}>
        <Text style={styles.clearText}>clear</Text>
      </Pressable>
    </View>
  );
};
