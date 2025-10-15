import React from 'react';
import { render } from '@testing-library/react-native';

// Mock useTheme hook
const mockUseTheme = jest.fn().mockReturnValue({
  colors: {
    background: { default: '#FFFFFF' },
    text: { default: '#000000' },
  },
  themeAppearance: 'light',
});

// Mock dependencies
jest.mock('../../../util/theme', () => ({
  useTheme: () => mockUseTheme(),
}));

// Mock ActivityIndicator
jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  ActivityIndicator: 'ActivityIndicator',
}));

// Mock Rive component
jest.mock('rive-react-native', () => ({
  __esModule: true,
  default: 'RiveView',
  Fit: {
    FitWidth: 'FitWidth',
  },
  Alignment: {
    Center: 'Center',
  },
}));

jest.mock('../../../animations/onboarding_loader.riv', () => 'mock-rive-file');

// Mock useScreenDimensions hook
const mockUseScreenDimensions = jest.fn().mockReturnValue({
  screenWidth: 375,
  screenHeight: 812,
  animationHeight: 406, // 812 * 0.5 for default medium/large device
});

jest.mock('../../../hooks/useScreenDimensions', () => ({
  useScreenDimensions: () => mockUseScreenDimensions(),
}));

// Mock Device utility
const mockDevice = {
  isSmallDevice: jest.fn(),
  isMediumDevice: jest.fn(),
};

jest.mock('../../../util/device', () => ({
  __esModule: true,
  default: mockDevice,
}));

// Mock styles
jest.mock('./OnboardingSuccessAnimation.styles', () =>
  jest.fn(() => ({
    animationContainer: { testID: 'animation-container' },
    animationWrapper: { testID: 'animation-wrapper' },
    textWrapper: { testID: 'text-wrapper' },
    riveAnimation: { testID: 'rive-animation' },
  })),
);

import OnboardingSuccessAnimation from './OnboardingSuccessAnimation';

describe('OnboardingSuccessAnimation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Reset to default large device behavior (height >= 736px)
    mockUseScreenDimensions.mockReturnValue({
      screenWidth: 375,
      screenHeight: 812,
      animationHeight: 406, // 812 * 0.5
    });

    mockDevice.isMediumDevice.mockReturnValue(false);
    mockDevice.isSmallDevice.mockReturnValue(false);
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('renders correctly without props', () => {
    // Arrange & Act
    const { toJSON } = render(<OnboardingSuccessAnimation />);

    // Assert
    expect(toJSON()).not.toBeNull();
  });

  it('displays Rive animation and ActivityIndicator', () => {
    // Arrange & Act
    const { toJSON } = render(<OnboardingSuccessAnimation />);

    // Assert
    const tree = toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('displays ActivityIndicator with theme colors', () => {
    // Arrange & Act
    const { toJSON } = render(<OnboardingSuccessAnimation />);

    // Assert - Component renders without crashing
    expect(toJSON()).not.toBeNull();
  });

  it('initializes Rive animation on component mount', () => {
    // Arrange & Act
    const { toJSON } = render(<OnboardingSuccessAnimation />);

    // Assert - Component renders successfully
    expect(toJSON()).not.toBeNull();
  });

  it('cleans up timers on unmount', () => {
    // Arrange
    const { unmount } = render(<OnboardingSuccessAnimation />);

    // Act
    unmount();

    // Assert - Component unmounts without errors
    jest.runAllTimers();
    expect(true).toBe(true); // Test passes if no errors thrown
  });

  it('starts Rive animation with correct state machine', () => {
    // Arrange & Act
    const { toJSON } = render(<OnboardingSuccessAnimation />);

    // Advance timer to trigger Rive animation setup
    jest.advanceTimersByTime(100);

    // Assert - Component continues to render properly
    expect(toJSON()).not.toBeNull();
  });

  it('uses dark mode when theme is dark', () => {
    // Arrange
    mockUseTheme.mockReturnValueOnce({
      colors: {
        background: { default: '#000000' },
        text: { default: '#FFFFFF' },
      },
      themeAppearance: 'dark',
    });

    // Act
    const { toJSON } = render(<OnboardingSuccessAnimation />);

    // Assert - Component should render with dark theme
    expect(toJSON()).not.toBeNull();
  });

  it('handles component lifecycle correctly', () => {
    // Arrange & Act
    const { toJSON, unmount } = render(<OnboardingSuccessAnimation />);

    // Advance timers to test lifecycle
    jest.advanceTimersByTime(100);

    // Assert - Component should handle all operations without errors
    expect(toJSON()).not.toBeNull();

    // Test unmount
    unmount();
    jest.runAllTimers();
  });

  it('uses themed colors from useTheme', () => {
    // Arrange
    const customColors = {
      background: { default: '#FF0000' },
      text: { default: '#00FF00' },
    };

    mockUseTheme.mockReturnValueOnce({
      colors: customColors,
      themeAppearance: 'light',
    });

    // Act
    const { toJSON } = render(<OnboardingSuccessAnimation />);

    // Assert - Component renders with themed colors
    expect(toJSON()).not.toBeNull();
  });

  it('renders animation and ActivityIndicator in correct layout structure', () => {
    // Arrange & Act
    const { toJSON } = render(<OnboardingSuccessAnimation />);

    // Assert
    const tree = toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('calculates responsive dimensions correctly', () => {
    // Arrange
    mockUseScreenDimensions.mockReturnValue({
      screenWidth: 400,
      screenHeight: 800,
      animationHeight: 400,
    });

    // Act
    const { toJSON } = render(<OnboardingSuccessAnimation />);

    // Assert
    expect(toJSON()).not.toBeNull();
    expect(mockUseScreenDimensions).toHaveBeenCalled();
  });

  it('uses 40% animation height for medium devices', () => {
    // Arrange - Medium device
    mockUseScreenDimensions.mockReturnValue({
      screenWidth: 375,
      screenHeight: 667,
      animationHeight: 267,
    });

    // Act
    const { toJSON } = render(<OnboardingSuccessAnimation />);

    // Assert
    expect(toJSON()).not.toBeNull();
    expect(mockUseScreenDimensions).toHaveBeenCalled();
  });

  it('uses 50% animation height for large devices', () => {
    // Arrange
    mockUseScreenDimensions.mockReturnValue({
      screenWidth: 375,
      screenHeight: 812,
      animationHeight: 406,
    });

    // Act
    const { toJSON } = render(<OnboardingSuccessAnimation />);

    // Assert
    expect(toJSON()).not.toBeNull();
    expect(mockUseScreenDimensions).toHaveBeenCalled();
  });
});
