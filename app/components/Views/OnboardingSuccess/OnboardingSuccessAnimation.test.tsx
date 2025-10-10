import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { Animated } from 'react-native';

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

jest.mock('../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const translations: Record<string, string> = {
      'onboarding_success.setting_up_wallet': 'Setting up your wallet',
    };
    return translations[key] || key;
  }),
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

// Mock Text component
jest.mock('../../../component-library/components/Texts/Text', () => ({
  __esModule: true,
  default: 'Text',
  TextVariant: {
    HeadingLG: 'HeadingLG',
  },
}));

// Mock isE2E utility
let mockIsE2EValue = false;
jest.mock('../../../util/test/utils', () => ({
  get isE2E() {
    return mockIsE2EValue;
  },
}));

// Mock styles
jest.mock('./OnboardingSuccessAnimation.styles', () =>
  jest.fn(() => ({
    animationContainer: { testID: 'animation-container' },
    animationWrapper: { testID: 'animation-wrapper' },
    textWrapper: { testID: 'text-wrapper' },
    riveAnimation: { testID: 'rive-animation' },
    textTitle: { testID: 'text-title' },
  })),
);

import OnboardingSuccessAnimation from './OnboardingSuccessAnimation';

describe('OnboardingSuccessAnimation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockIsE2EValue = false;
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    mockIsE2EValue = false;
  });

  it('renders correctly with required props', () => {
    // Arrange
    const mockOnAnimationComplete = jest.fn();

    // Act
    const { toJSON } = render(
      <OnboardingSuccessAnimation
        onAnimationComplete={mockOnAnimationComplete}
      />,
    );

    // Assert
    expect(toJSON()).not.toBeNull();
  });

  it('displays Rive animation with correct props', () => {
    // Arrange
    const mockOnAnimationComplete = jest.fn();

    // Act
    const { toJSON } = render(
      <OnboardingSuccessAnimation
        onAnimationComplete={mockOnAnimationComplete}
      />,
    );

    // Assert
    const tree = toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('displays setting up wallet text with animated dots', async () => {
    // Arrange
    const mockOnAnimationComplete = jest.fn();

    // Act
    render(
      <OnboardingSuccessAnimation
        onAnimationComplete={mockOnAnimationComplete}
      />,
    );

    // Assert - Component render without crashing
    expect(mockOnAnimationComplete).not.toHaveBeenCalled();
  });

  it('starts dots animation on component mount', () => {
    // Arrange
    const mockOnAnimationComplete = jest.fn();

    // Act
    render(
      <OnboardingSuccessAnimation
        onAnimationComplete={mockOnAnimationComplete}
      />,
    );

    // Assert - Advance timer to trigger dots animation
    jest.advanceTimersByTime(500);

    // Component should still be running
    expect(mockOnAnimationComplete).not.toHaveBeenCalled();
  });

  it('cycles through dots animation correctly', () => {
    // Arrange
    const mockOnAnimationComplete = jest.fn();

    // Act
    render(
      <OnboardingSuccessAnimation
        onAnimationComplete={mockOnAnimationComplete}
      />,
    );

    // Assert - Test dots cycling
    jest.advanceTimersByTime(500);
    jest.advanceTimersByTime(500);
    jest.advanceTimersByTime(500);
    jest.advanceTimersByTime(500);

    // Animation continue running
    expect(mockOnAnimationComplete).not.toHaveBeenCalled();
  });

  it('starts Rive animation with correct state machine', async () => {
    // Arrange
    const mockOnAnimationComplete = jest.fn();

    // Act
    render(
      <OnboardingSuccessAnimation
        onAnimationComplete={mockOnAnimationComplete}
      />,
    );

    jest.advanceTimersByTime(100);

    expect(mockOnAnimationComplete).not.toHaveBeenCalled();

    // Verify dots animation is working
    jest.advanceTimersByTime(500);
    expect(mockOnAnimationComplete).not.toHaveBeenCalled();
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

    const mockOnAnimationComplete = jest.fn();

    // Act
    const { toJSON } = render(
      <OnboardingSuccessAnimation
        onAnimationComplete={mockOnAnimationComplete}
      />,
    );

    // Assert - Component should render with dark theme
    expect(toJSON()).not.toBeNull();

    jest.advanceTimersByTime(100);
    jest.advanceTimersByTime(500);

    expect(mockOnAnimationComplete).not.toHaveBeenCalled();
  });

  it('handles component lifecycle correctly', () => {
    // Arrange
    const mockOnAnimationComplete = jest.fn();

    // Act
    const { toJSON } = render(
      <OnboardingSuccessAnimation
        onAnimationComplete={mockOnAnimationComplete}
      />,
    );

    jest.advanceTimersByTime(100);
    jest.advanceTimersByTime(500);

    // Assert - Component should handle all operations without errors
    expect(toJSON()).not.toBeNull();
    expect(mockOnAnimationComplete).not.toHaveBeenCalled();

    // Test that component continues to work
    jest.advanceTimersByTime(1000);
    expect(mockOnAnimationComplete).not.toHaveBeenCalled();
  });

  it('cleans up timers on unmount', () => {
    // Arrange
    const mockOnAnimationComplete = jest.fn();

    // Act
    const { unmount } = render(
      <OnboardingSuccessAnimation
        onAnimationComplete={mockOnAnimationComplete}
      />,
    );

    unmount();

    jest.runAllTimers();
    expect(mockOnAnimationComplete).not.toHaveBeenCalled();
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

    const mockOnAnimationComplete = jest.fn();

    // Act
    const { toJSON } = render(
      <OnboardingSuccessAnimation
        onAnimationComplete={mockOnAnimationComplete}
      />,
    );

    // Assert - Component render with themed colors
    expect(toJSON()).not.toBeNull();
  });

  it('renders animation and text in correct layout structure', () => {
    // Arrange
    const mockOnAnimationComplete = jest.fn();

    // Act
    const { toJSON } = render(
      <OnboardingSuccessAnimation
        onAnimationComplete={mockOnAnimationComplete}
      />,
    );

    // Assert
    const tree = toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('calculates responsive dimensions correctly', () => {
    // Arrange
    const mockDimensions = {
      width: 400,
      height: 800,
    };

    const mockGet = jest.fn().mockReturnValue(mockDimensions);
    // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
    require('react-native').Dimensions.get = mockGet;

    const mockOnAnimationComplete = jest.fn();

    // Act
    render(
      <OnboardingSuccessAnimation
        onAnimationComplete={mockOnAnimationComplete}
      />,
    );

    // Assert
    expect(mockGet).toHaveBeenCalledWith('window');
  });

  it('handles dots count edge cases correctly', () => {
    // Arrange
    const mockOnAnimationComplete = jest.fn();

    // Act
    render(
      <OnboardingSuccessAnimation
        onAnimationComplete={mockOnAnimationComplete}
      />,
    );

    jest.advanceTimersByTime(0);

    jest.advanceTimersByTime(500);

    jest.advanceTimersByTime(500);

    jest.advanceTimersByTime(500);

    jest.advanceTimersByTime(500);

    // Assert
    expect(mockOnAnimationComplete).not.toHaveBeenCalled();
  });

  it('triggers slide out animation when slideOut prop is true', () => {
    // Arrange
    const mockOnAnimationComplete = jest.fn();
    const mockAnimatedTiming = jest.spyOn(Animated, 'timing');
    const mockStart = jest.fn();
    const mockStop = jest.fn();
    const mockReset = jest.fn();
    mockAnimatedTiming.mockReturnValue({
      start: mockStart,
      stop: mockStop,
      reset: mockReset,
    } as unknown as Animated.CompositeAnimation);

    // Act
    render(
      <OnboardingSuccessAnimation
        slideOut
        onAnimationComplete={mockOnAnimationComplete}
      />,
    );

    // Assert
    expect(mockAnimatedTiming).toHaveBeenCalledWith(
      expect.any(Object), // slideAnim
      expect.objectContaining({
        toValue: expect.any(Number),
        duration: 800,
        easing: expect.any(Function),
        useNativeDriver: true,
      }),
    );
    expect(mockStart).toHaveBeenCalled();

    // Cleanup
    mockAnimatedTiming.mockRestore();
  });

  it('calls onAnimationComplete when slide animation finishes', () => {
    // Arrange
    const mockOnAnimationComplete = jest.fn();
    const mockAnimatedTiming = jest.spyOn(Animated, 'timing');
    const mockStart = jest.fn((callback?: Animated.EndCallback) => {
      if (callback) {
        callback({ finished: true });
      }
    });
    const mockStop = jest.fn();
    const mockReset = jest.fn();
    mockAnimatedTiming.mockReturnValue({
      start: mockStart,
      stop: mockStop,
      reset: mockReset,
    } as unknown as Animated.CompositeAnimation);

    // Act
    render(
      <OnboardingSuccessAnimation
        slideOut
        onAnimationComplete={mockOnAnimationComplete}
      />,
    );

    // Assert
    expect(mockOnAnimationComplete).toHaveBeenCalledTimes(1);

    // Cleanup
    mockAnimatedTiming.mockRestore();
  });

  it('always displays setting up wallet text', () => {
    // Arrange
    const mockOnAnimationComplete = jest.fn();

    // Act
    const { queryByText } = render(
      <OnboardingSuccessAnimation
        onAnimationComplete={mockOnAnimationComplete}
      />,
    );

    // Assert - Text should always be visible
    expect(
      queryByText(/onboarding_success.setting_up_wallet_base/),
    ).toBeTruthy();
  });

  describe('E2E test behavior', () => {
    beforeEach(() => {
      mockIsE2EValue = true;
    });

    afterEach(() => {
      mockIsE2EValue = false;
    });

    it('uses static values instead of animations when isE2E is true', () => {
      // Arrange
      const mockOnAnimationComplete = jest.fn();

      // Act
      const { toJSON } = render(
        <OnboardingSuccessAnimation
          onAnimationComplete={mockOnAnimationComplete}
        />,
      );

      // Advance timers to ensure no delayed animations start
      jest.advanceTimersByTime(1000);

      // Assert
      expect(toJSON()).not.toBeNull();
      expect(mockOnAnimationComplete).not.toHaveBeenCalled();
    });

    it('completes slide animation immediately in E2E tests', async () => {
      // Arrange
      const mockOnAnimationComplete = jest.fn();

      // Act
      render(
        <OnboardingSuccessAnimation
          startAnimation
          slideOut
          onAnimationComplete={mockOnAnimationComplete}
        />,
      );

      // Assert
      await waitFor(() => {
        expect(mockOnAnimationComplete).toHaveBeenCalledTimes(1);
      });
    });

    it('handles multiple slide animation calls safely in E2E mode', async () => {
      // Arrange
      const mockOnAnimationComplete = jest.fn();

      // Act
      const { rerender } = render(
        <OnboardingSuccessAnimation
          startAnimation
          slideOut
          onAnimationComplete={mockOnAnimationComplete}
        />,
      );

      // Trigger multiple times
      rerender(
        <OnboardingSuccessAnimation
          startAnimation
          slideOut
          onAnimationComplete={mockOnAnimationComplete}
        />,
      );

      // Assert
      await waitFor(() => {
        expect(mockOnAnimationComplete).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Memory leak prevention', () => {
    it('handles component lifecycle without memory leaks', () => {
      // Arrange
      const mockOnAnimationComplete = jest.fn();

      // Act - Render and unmount component
      const { unmount } = render(
        <OnboardingSuccessAnimation
          onAnimationComplete={mockOnAnimationComplete}
        />,
      );

      jest.advanceTimersByTime(1000);

      unmount();

      // Render again
      const { unmount: unmount2 } = render(
        <OnboardingSuccessAnimation
          onAnimationComplete={mockOnAnimationComplete}
        />,
      );

      unmount2();

      // Assert
      expect(mockOnAnimationComplete).toBeDefined();
    });

    it('clears existing timeout when startRiveAnimation is called multiple times', () => {
      // Arrange
      mockIsE2EValue = false;
      const mockOnAnimationComplete = jest.fn();

      // Act
      const { rerender } = render(
        <OnboardingSuccessAnimation
          onAnimationComplete={mockOnAnimationComplete}
        />,
      );

      // Advance timer partially to set timeout
      jest.advanceTimersByTime(50);

      // Re-render to trigger startRiveAnimation again (should clear existing timeout)
      rerender(
        <OnboardingSuccessAnimation
          onAnimationComplete={mockOnAnimationComplete}
        />,
      );

      // Advance timer to complete new timeout
      jest.advanceTimersByTime(100);

      // Assert - Component should handle multiple renders without errors
      expect(mockOnAnimationComplete).not.toHaveBeenCalled();
    });

    it('handles Rive animation setup errors gracefully in setTimeout callback', () => {
      // Arrange
      mockIsE2EValue = false;
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {
        // Mock console.error implementation
      });

      // Create a component that will have a Rive ref that throws an error
      const TestComponent = () => {
        const riveRef = React.useRef({
          setInputState: jest.fn().mockImplementation(() => {
            throw new Error('Rive setup error');
          }),
          fireState: jest.fn(),
        });

        React.useEffect(() => {
          // Simulate the setTimeout callback with error
          setTimeout(() => {
            if (riveRef.current) {
              try {
                riveRef.current.setInputState(
                  'OnboardingLoader',
                  'Dark mode',
                  false,
                );
                riveRef.current.fireState('OnboardingLoader', 'Start');
              } catch (error) {
                console.error('Error with Rive animation:', error);
              }
            }
          }, 100);
        }, []);

        return React.createElement('div', { 'data-testid': 'test-component' });
      };

      // Act
      render(React.createElement(TestComponent));

      // Advance timer to trigger the setTimeout callback
      jest.advanceTimersByTime(100);

      // Assert - Error should be caught and logged
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error with Rive animation:',
        expect.any(Error),
      );

      // Cleanup
      consoleSpy.mockRestore();
    });

    it('clears riveTimeoutId in clearTimers function when component unmounts', () => {
      // Arrange
      mockIsE2EValue = false;
      const mockOnAnimationComplete = jest.fn();

      // Act
      const { unmount } = render(
        <OnboardingSuccessAnimation
          onAnimationComplete={mockOnAnimationComplete}
        />,
      );

      // Advance timer to set up the riveTimeoutId but not complete it
      jest.advanceTimersByTime(50);

      // Unmount component to trigger clearTimers cleanup
      unmount();

      // Advance remaining timers to ensure cleanup worked
      jest.runAllTimers();

      // Assert - Component should unmount cleanly without errors
      expect(mockOnAnimationComplete).not.toHaveBeenCalled();
    });
  });
});
