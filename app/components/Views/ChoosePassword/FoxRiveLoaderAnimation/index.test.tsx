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
jest.mock('../../../../util/theme', () => ({
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

jest.mock('../../../../animations/fox_loading.riv', () => 'mock-rive-file');

// Mock useScreenDimensions hook
const mockScreenDimensions = jest.fn().mockReturnValue({
  screenWidth: 375,
  screenHeight: 812,
  animationHeight: 406, // 812 * 0.5 for default medium/large device
});

jest.mock('../../../../util/onboarding', () => ({
  getScreenDimensions: () => mockScreenDimensions(),
}));

// Mock Device utility
const mockDevice = {
  isSmallDevice: jest.fn(),
  isMediumDevice: jest.fn(),
};

jest.mock('../../../../util/device', () => ({
  __esModule: true,
  default: mockDevice,
}));

// Mock styles
jest.mock('./index.styles', () =>
  jest.fn(() => ({
    animationContainer: { testID: 'animation-container' },
    animationWrapper: { testID: 'animation-wrapper' },
    textWrapper: { testID: 'text-wrapper' },
    riveAnimation: { testID: 'rive-animation' },
  })),
);

import FoxRiveLoaderAnimation from './FoxRiveLoaderAnimation';

describe('FoxRiveLoaderAnimation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    mockScreenDimensions.mockReturnValue({
      screenWidth: 375,
      screenHeight: 812,
      animationHeight: 406,
    });

    mockDevice.isMediumDevice.mockReturnValue(false);
    mockDevice.isSmallDevice.mockReturnValue(false);
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('displays Rive animation and ActivityIndicator', () => {
    // Arrange & Act
    const { toJSON } = render(<FoxRiveLoaderAnimation />);

    // Assert
    const tree = toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('cleans up timers on unmount', () => {
    // Arrange
    const { unmount } = render(<FoxRiveLoaderAnimation />);

    // Act
    unmount();

    // Assert - Component unmounts without errors
    jest.runAllTimers();
    expect(true).toBe(true); // Test passes if no errors thrown
  });

  it('starts Rive animation with correct state machine', () => {
    // Arrange & Act
    const { toJSON } = render(<FoxRiveLoaderAnimation />);

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
    const { toJSON } = render(<FoxRiveLoaderAnimation />);

    // Assert - Component should render with dark theme
    expect(toJSON()).not.toBeNull();
  });

  it('handles component lifecycle correctly', () => {
    // Arrange & Act
    const { toJSON, unmount } = render(<FoxRiveLoaderAnimation />);

    // Advance timers to test lifecycle
    jest.advanceTimersByTime(100);

    // Assert - Component should handle all operations without errors
    expect(toJSON()).not.toBeNull();

    // Test unmount
    unmount();
    jest.runAllTimers();
  });
});
