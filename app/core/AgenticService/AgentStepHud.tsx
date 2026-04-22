import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 6,
  },
  stepId: {
    color: '#00FF88',
    fontFamily: 'Courier',
    fontSize: 12,
    fontWeight: '700',
    marginRight: 8,
  },
  description: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
    flexShrink: 1,
  },
});
/* eslint-enable react-native/no-color-literals, @metamask/design-tokens/color-no-hex */

// Inner component — hooks always called unconditionally, per rules of React.
const AgentStepHudInner = () => {
  const [step, setStep] = useState<Step | null>(null);
  const insets = useSafeAreaInsets();

  const containerStyle = useMemo(
    () => [
      styles.container,
      {
        paddingLeft: Math.max(insets.left, 10),
        paddingRight: Math.max(insets.right, 10),
        paddingBottom: insets.bottom > 0 ? insets.bottom : 6,
      },
    ],
    [insets.left, insets.right, insets.bottom],
  );

  useEffect(() => {
    registerStepHudCallback(setStep);
    return () => {
      registerStepHudCallback(null);
    };
  }, []);

  if (!step) return null;

  return (
    <View style={containerStyle} pointerEvents="none">
      <Text style={styles.stepId}>{step.id}</Text>
      <Text style={styles.description} numberOfLines={2}>
        {step.description}
      </Text>
    </View>
  );
};

// Outer guard — never calls hooks, so the __DEV__ early return is fine.
const AgentStepHud = () => {
  if (!__DEV__) return null;
  return <AgentStepHudInner />;
};

export default AgentStepHud;
