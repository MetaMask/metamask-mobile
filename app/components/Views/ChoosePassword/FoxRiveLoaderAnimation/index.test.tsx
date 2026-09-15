import React, { createRef } from 'react';
import { render } from '@testing-library/react-native';
import { brandColor } from '@metamask/design-tokens';
import { mockTheme } from '../../../../util/theme';

// Methods handed out by the mocked useRive hook — the component drives the
// animation through riveRef/riveViewRef, not through the RiveView element.
const mockUseRiveMethods = {
  pause: jest.fn(),
  triggerInput: jest.fn(),
};

// Extend the global @rive-app/react-native mock with a useRive whose methods
// are reachable from the test (the global mock keeps them private).
jest.mock('@rive-app/react-native', () => {
  const actual = jest.requireActual(
    '../../../../__mocks__/rive-app-react-native',
  );
  return {
    ...actual,
    useRive: () => ({
      riveRef: { current: mockUseRiveMethods },
      riveViewRef: mockUseRiveMethods,
      setHybridRef: { f: jest.fn() },
    }),
  };
});

// Mock useTheme hook
const mockUseTheme = jest.fn().mockReturnValue(mockTheme);

jest.mock('../../../../util/theme', () => {
  const actual = jest.requireActual('../../../../util/theme');
  return {
    ...actual,
    useTheme: () => mockUseTheme(),
  };
});

// Mock ActivityIndicator
jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  ActivityIndicator: 'ActivityIndicator',
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

import FoxRiveLoaderAnimation, {
  type FoxRiveLoaderAnimationRef,
} from './FoxRiveLoaderAnimation';

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
    const { getByTestId } = render(<FoxRiveLoaderAnimation />);
    expect(getByTestId('fox-rive-loader-animation')).toBeOnTheScreen();
  });

  it('forwards stop to the underlying Rive ref as pause', () => {
    const ref = createRef<FoxRiveLoaderAnimationRef>();
    render(<FoxRiveLoaderAnimation ref={ref} />);

    ref.current?.stop();

    // The nitro runtime has no stop(); the component pauses instead
    expect(mockUseRiveMethods.pause).toHaveBeenCalledTimes(1);
  });

  it('cleans up on unmount without errors', () => {
    // Arrange
    const { unmount } = render(<FoxRiveLoaderAnimation />);

    // Act
    unmount();

    // Assert - Component unmounts without errors
    jest.runAllTimers();
    expect(true).toBe(true); // Test passes if no errors thrown
  });

  it('fires the Loader2 trigger once the view is ready', () => {
    render(<FoxRiveLoaderAnimation />);

    // triggerInput takes only the trigger name; the state machine is the
    // stateMachineName view prop in the nitro runtime
    expect(mockUseRiveMethods.triggerInput).toHaveBeenCalledWith('Loader2');
  });

  it('uses dark mode when theme is dark', () => {
    // Arrange
    mockUseTheme.mockReturnValueOnce({
      colors: {
        background: { default: brandColor.black },
        text: { default: brandColor.white },
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
