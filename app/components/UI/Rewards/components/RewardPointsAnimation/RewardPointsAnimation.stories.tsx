/* eslint-disable react/display-name */
/* eslint-disable react-native/no-inline-styles */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-native/no-color-literals */
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import RewardPointsAnimationComponent, { RewardAnimationState } from './index';

/**
 * Storybook configuration for RewardPointsAnimation component
 * Demonstrates different animation states and usage patterns
 */
const RewardPointsAnimationMeta = {
  title: 'Rewards / RewardPointsAnimation',
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
    padding: 24,
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
  animationContainer: {
    padding: 20,
    paddingHorizontal: 50,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
});

const InteractiveStory = (args: {
  value: number;
  duration: number;
  variant?: any;
}) => {
  const [currentValue, setCurrentValue] = useState(0);
  const [animationState, setAnimationState] = useState<RewardAnimationState>(
    RewardAnimationState.Idle,
  );

  const handleLoading = useCallback(() => {
    setAnimationState(RewardAnimationState.Loading);
  }, []);

  /**
   * Example: How to use with API requests
   * 1. Set loading state before API call
   * 2. On success: update value and set to idle
   * 3. On error: set error state
   */
  const handleRefresh = useCallback(async () => {
    setAnimationState(RewardAnimationState.Loading);

    try {
      const response = await new Promise<{ points: number }>((resolve) => {
        setTimeout(() => {
          resolve({ points: Math.floor(Math.random() * 10000) });
        }, 1000);
      });

      setCurrentValue(response.points);
      setAnimationState(RewardAnimationState.Idle);
    } catch (error) {
      setAnimationState(RewardAnimationState.ErrorState);
    }
  }, []);

  const handleError = useCallback(() => {
    setAnimationState(RewardAnimationState.ErrorState);
  }, []);

  const handleIdle = useCallback(() => {
    setAnimationState(RewardAnimationState.Idle);
    const newValue = Math.floor(Math.random() * 10000);
    setCurrentValue(newValue);
  }, []);

  return (
    <View style={styles.container}>
      {/* Animation display */}
      <View style={styles.animationContainer}>
        <RewardPointsAnimationComponent
          {...args}
          value={currentValue}
          state={animationState}
        />
      </View>

      {/* Control buttons for state demonstration */}
      <View style={styles.buttonContainer}>
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleLoading}
          >
            <Text style={styles.buttonText}>Loading</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleRefresh}
          >
            <Text style={styles.buttonText}>Simulate API call</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleError}
          >
            <Text style={styles.buttonText}>Error</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.primaryButton} onPress={handleIdle}>
            <Text style={styles.buttonText}>Set random value</Text>
          </TouchableOpacity>
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
