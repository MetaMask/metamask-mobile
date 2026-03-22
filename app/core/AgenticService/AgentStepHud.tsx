import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../util/theme';
import { Theme } from '../../util/theme/models';
import { registerStepHudCallback } from './AgenticService';

interface Step {
  id: string;
  description: string;
}

const createStyles = (colors: Theme['colors']) =>
  StyleSheet.create({
    container: {
      position: 'absolute',
      top: 110,
      left: 0,
      right: 0,
      backgroundColor: colors.overlay.default,
      paddingVertical: 8,
      paddingHorizontal: 12,
    },
    stepId: {
      color: colors.text.alternative,
      fontFamily: 'Courier',
      fontSize: 11,
      marginBottom: 2,
    },
    description: {
      color: colors.text.default,
      fontSize: 13,
    },
  });

// Inner component — hooks always called unconditionally, per rules of React.
const AgentStepHudInner = () => {
  const { colors } = useTheme();
  const [step, setStep] = useState<Step | null>(null);

  useEffect(() => {
    registerStepHudCallback(setStep);
    return () => {
      registerStepHudCallback(null);
    };
  }, []);

  if (!step) return null;

  const styles = createStyles(colors);

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
