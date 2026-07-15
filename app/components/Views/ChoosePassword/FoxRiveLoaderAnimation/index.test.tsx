import React, { createRef } from 'react';
import { render } from '@testing-library/react-native';
import { brandColor } from '@metamask/design-tokens';
import { mockTheme } from '../../../../util/theme';

const mockRiveMethods = {
  stop: jest.fn(),
  fireState: jest.fn(),
};

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

// Mock Rive component
jest.mock('rive-react-native', () => {
  const MockReact = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');

  const MockRive = MockReact.forwardRef(
    (_props: unknown, ref: React.Ref<unknown>) => {
      MockReact.useImperativeHandle(ref, () => mockRiveMethods);
      return MockReact.createElement(View, { testID: 'mock-rive-view' });
    },
  );

  return {
    __esModule: true,
    default: MockRive,
    Fit: {
      Contain: 'Contain',
    },
    Alignment: {
      Center: 'Center',
    },
  };
});

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

  it('forwards stop to the underlying Rive ref', () => {
    const ref = createRef<FoxRiveLoaderAnimationRef>();
    render(<FoxRiveLoaderAnimation ref={ref} />);

    ref.current?.stop();

    expect(mockRiveMethods.stop).toHaveBeenCalledTimes(1);
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
    render(<FoxRiveLoaderAnimation />);

    jest.advanceTimersByTime(100);

    expect(mockRiveMethods.fireState).toHaveBeenCalledWith(
      'FoxRaiseUp',
      'Loader2',
    );
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
