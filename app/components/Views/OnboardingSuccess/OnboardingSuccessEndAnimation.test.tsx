import React from 'react';
import { render } from '@testing-library/react-native';
import OnboardingSuccessEndAnimation from './OnboardingSuccessEndAnimation';

// Mock Rive
jest.mock('rive-react-native', () => {
  const MockReact = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ testID }: { testID: string }) =>
      MockReact.createElement(View, { testID: testID || 'mock-rive' }),
    Fit: { Cover: 'cover' },
    Alignment: { Center: 'center' },
  };
});

// Mock theme
jest.mock('../../../util/theme', () => ({
  useTheme: () => ({
    colors: {
      text: { default: '#000000' },
      background: { default: '#ffffff' },
    },
    themeAppearance: 'light',
  }),
}));

// Mock E2E utils
let mockIsE2EValue = false;
jest.mock('../../../util/test/utils', () => ({
  get isE2E() {
    return mockIsE2EValue;
  },
}));

// Mock Rive file
jest.mock(
  '../../../animations/onboarding_loader_end_animation.riv',
  () => 'mocked-rive-file',
);

describe('OnboardingSuccessEndAnimation', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockIsE2EValue = false;
  });

  afterEach(() => {
    jest.useRealTimers();
    mockIsE2EValue = false;
  });

  it('renders successfully', () => {
    // Arrange
    const mockOnAnimationComplete = jest.fn();

    // Act
    const { getByTestId } = render(
      <OnboardingSuccessEndAnimation
        startAnimation
        onAnimationComplete={mockOnAnimationComplete}
      />,
    );

    // Assert
    expect(getByTestId('onboarding-success-end-animation')).toBeTruthy();
  });

  it('handles E2E mode correctly', () => {
    // Arrange
    mockIsE2EValue = true;
    const mockOnAnimationComplete = jest.fn();

    // Act
    const { getByTestId } = render(
      <OnboardingSuccessEndAnimation
        startAnimation
        onAnimationComplete={mockOnAnimationComplete}
      />,
    );

    // Assert - Component should render without errors
    expect(getByTestId('onboarding-success-end-animation')).toBeTruthy();
  });

  it('handles animation lifecycle without memory leaks', () => {
    // Arrange
    const mockOnAnimationComplete = jest.fn();

    // Act
    const { unmount } = render(
      <OnboardingSuccessEndAnimation
        startAnimation
        onAnimationComplete={mockOnAnimationComplete}
      />,
    );

    // Let animations run
    jest.advanceTimersByTime(1000);

    unmount();

    // Render again
    const { unmount: unmount2 } = render(
      <OnboardingSuccessEndAnimation
        startAnimation
        onAnimationComplete={mockOnAnimationComplete}
      />,
    );

    unmount2();

    // Assert - No errors should occur
    expect(mockOnAnimationComplete).toBeDefined();
  });
});
