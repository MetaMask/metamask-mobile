/* eslint-disable react/display-name */
import React, { useState, useCallback, useEffect } from 'react';
import { View } from 'react-native';
import RewardPointsAnimationComponent, { RewardAnimationState } from './index';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Button,
  ButtonSize,
  ButtonVariant,
} from '@metamask/design-system-react-native';

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
  },
};

export default RewardPointsAnimationMeta;

const InteractiveStory = (args: { value: number; duration: number }) => {
  const tw = useTailwind();
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
  const simulateApiCall = useCallback(async () => {
    setAnimationState(RewardAnimationState.RefreshLoading);

    const randomPromiseMSLength = Math.floor(Math.random() * 1000) + 1000;
    const randomPoints = Math.floor(Math.random() * 10000);
    try {
      const response = await new Promise<{ points: number }>((resolve) => {
        setTimeout(() => {
          resolve({ points: Math.floor(Math.random() * randomPoints) });
        }, randomPromiseMSLength);
      });

      setCurrentValue(response.points);
      setAnimationState(RewardAnimationState.RefreshFinished);
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

  useEffect(() => {
    handleIdle();
  }, [handleIdle]);

  return (
    <View style={tw`p-6`}>
      {/* Animation display */}
      <View
        style={tw`w-full items-center justify-center self-center p-5 px-[50px]`}
      >
        <RewardPointsAnimationComponent
          {...args}
          value={currentValue}
          state={animationState}
        />
      </View>

      {/* Control buttons for state demonstration */}
      <View style={tw`mt-5 gap-2`}>
        <View style={tw`flex-row gap-2`}>
          <Button size={ButtonSize.Md} onPress={handleLoading}>
            Loading
          </Button>
          <Button
            variant={ButtonVariant.Secondary}
            size={ButtonSize.Md}
            onPress={simulateApiCall}
          >
            Simulate API call
          </Button>
          <Button
            variant={ButtonVariant.Secondary}
            size={ButtonSize.Md}
            onPress={handleError}
          >
            Error
          </Button>
        </View>
        <View style={tw`flex-row gap-2`}>
          <Button size={ButtonSize.Md} onPress={handleIdle}>
            Set random value
          </Button>
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
