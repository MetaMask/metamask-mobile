// DEMO-ONLY: floating perf overlay for showcasing JS-stack vs native-stack.
// Remove this component (and the surrounding usages) before merging.

import React from 'react';
import { Text, View } from 'react-native';
import { useJsFps, useNavPerfSamples } from '../../utils/navPerf';

const fpsColor = (fps: number): string => {
  if (fps >= 55) return '#0f0';
  if (fps >= 30) return '#ff0';
  return '#f33';
};

export const NavPerfOverlay: React.FC = () => {
  const samples = useNavPerfSamples();
  const fps = useJsFps();

  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: 96,
        right: 8,
        backgroundColor: 'rgba(0,0,0,0.75)',
        paddingHorizontal: 8,
        paddingVertical: 6,
        borderRadius: 6,
        zIndex: 9999,
        minWidth: 160,
      }}
    >
      <Text
        style={{ color: fpsColor(fps), fontSize: 12, fontFamily: 'Menlo' }}
      >
        JS FPS: {fps}
      </Text>
      {samples.length === 0 ? (
        <Text style={{ color: '#888', fontSize: 11, fontFamily: 'Menlo' }}>
          (no transitions yet)
        </Text>
      ) : (
        samples.map((s) => (
          <Text
            key={`${s.at}-${s.label}`}
            style={{ color: '#0f0', fontSize: 11, fontFamily: 'Menlo' }}
          >
            {s.label}: {s.ms} ms
          </Text>
        ))
      )}
    </View>
  );
};
