import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { registerStepHudCallback } from './AgenticService';

interface Step {
  id: string;
  description: string;
}

// Debug-only overlay — intentionally uses hardcoded colors for guaranteed
// contrast on both light and dark themes. Design tokens would defeat the purpose.
/* eslint-disable react-native/no-color-literals, @metamask/design-tokens/color-no-hex */
const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 90,
    left: 0,
    right: 0,
    zIndex: 9999,
    backgroundColor: '#000000',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  stepId: {
    color: '#00FF88',
    fontFamily: 'Courier',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  description: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
});
/* eslint-enable react-native/no-color-literals, @metamask/design-tokens/color-no-hex */

// Inner component — hooks always called unconditionally, per rules of React.
const AgentStepHudInner = () => {
  const [step, setStep] = useState<Step | null>(null);

  useEffect(() => {
    registerStepHudCallback(setStep);
    return () => {
      registerStepHudCallback(null);
    };
  }, []);

  if (!step) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      <Text style={styles.stepId}>{step.id}</Text>
      <Text style={styles.description}>{step.description}</Text>
    </View>
  );
};

// Outer guard — never calls hooks, so the __DEV__ early return is fine.
const AgentStepHud = () => {
  if (!__DEV__) return null;
  return <AgentStepHudInner />;
};

export default AgentStepHud;
