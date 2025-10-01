/* eslint-disable react/display-name */
/* eslint-disable react-native/no-inline-styles */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-native/no-color-literals */
// Third party dependencies.
import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';

// Internal dependencies.
import { default as RewardPointsAnimationComponent } from './index';

const RewardPointsAnimationMeta = {
  title: 'Components Temp / RewardPointsAnimation',
  component: RewardPointsAnimationComponent,
  argTypes: {
    value: {
      control: { type: 'number' },
      description: 'The target value to animate to',
    },
    duration: {
      control: { type: 'number' },
      description: 'Animation duration in milliseconds',
    },
    variant: {
      control: { type: 'select' },
      options: ['BodyMD', 'BodyLG', 'HeadingMd'],
      description: 'Text variant for styling',
    },
  },
};

export default RewardPointsAnimationMeta;

const styles = StyleSheet.create({
  container: {
    padding: 20,
    alignItems: 'center',
  },
  buttonContainer: {
    marginTop: 20,
    gap: 10,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    padding: 10,
    borderRadius: 5,
    minWidth: 100,
    alignItems: 'center',
  },
  secondaryButton: {
    backgroundColor: '#6C757D',
    padding: 10,
    borderRadius: 5,
    minWidth: 100,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});

const InteractiveStory = (args: {
  value: number;
  duration: number;
  variant?: any;
}) => {
  const [currentValue, setCurrentValue] = useState(0);

  return (
    <View style={styles.container}>
      <RewardPointsAnimationComponent {...args} value={currentValue} />
      <View style={styles.buttonContainer}>
        <View style={styles.buttonRow}>
          <View style={styles.primaryButton}>
            <Text
              style={styles.buttonText}
              onPress={() => setCurrentValue(Math.floor(Math.random() * 10000))}
            >
              Random Value
            </Text>
          </View>
          <View style={styles.secondaryButton}>
            <Text style={styles.buttonText} onPress={() => setCurrentValue(0)}>
              Reset to 0
            </Text>
          </View>
          <View style={styles.secondaryButton}>
            <Text
              style={styles.buttonText}
              onPress={() => setCurrentValue(1234567)}
            >
              Large Number
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

export const RewardPointsAnimation = {
  render: InteractiveStory,
  args: {
    value: 0,
    duration: 1000,
  },
};
