import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import WalletHomeOnboardingProgressBar from './WalletHomeOnboardingProgressBar';

jest.mock('react-native-reanimated', () => {
  const { View } = jest.requireActual('react-native');

  return {
    __esModule: true,
    default: {
      View,
      createAnimatedComponent: (component: unknown) => component,
    },
    useAnimatedStyle: jest.fn((updater: () => unknown) => updater()),
  };
});

const createProgressRatio = (value: number): SharedValue<number> =>
  ({ value }) as unknown as SharedValue<number>;

describe('WalletHomeOnboardingProgressBar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the progress track with accessibility props', () => {
    const progressRatio = createProgressRatio(0.25);

    render(
      <WalletHomeOnboardingProgressBar
        progressRatio={progressRatio}
        accessibilityLabel="Onboarding progress"
        testID="onboarding-progress-bar"
      />,
    );

    expect(screen.getByTestId('onboarding-progress-bar')).toBeTruthy();
    expect(screen.getByLabelText('Onboarding progress')).toBeTruthy();
  });

  it('derives fill width from the shared progress ratio', () => {
    const progressRatio = createProgressRatio(0.4);

    render(
      <WalletHomeOnboardingProgressBar
        progressRatio={progressRatio}
        accessibilityLabel="Onboarding progress"
        testID="onboarding-progress-bar"
      />,
    );

    expect(useAnimatedStyle).toHaveBeenCalled();
    const styleUpdater = jest.mocked(useAnimatedStyle).mock.calls[0][0];
    expect(styleUpdater()).toEqual({ width: '40%' });
  });
});
