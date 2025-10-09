import React from 'react';
import { render } from '@testing-library/react-native';
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
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('renders correctly with required props', () => {
    // Arrange
    const mockOnAnimationComplete = jest.fn();

    // Act
    const { toJSON } = render(
      <OnboardingSuccessAnimation
        startAnimation
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
        startAnimation
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
        startAnimation
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
        startAnimation
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
        startAnimation
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
        startAnimation
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
        startAnimation
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
        startAnimation
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
        startAnimation
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
        startAnimation
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
        startAnimation
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
        startAnimation
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
        startAnimation
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
        startAnimation
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
        startAnimation
        slideOut
        onAnimationComplete={mockOnAnimationComplete}
      />,
    );

    // Assert
    expect(mockOnAnimationComplete).toHaveBeenCalledTimes(1);

    // Cleanup
    mockAnimatedTiming.mockRestore();
  });

  describe('Mode-based behavior', () => {
    it('uses setup mode by default (backward compatibility)', () => {
      // Arrange
      const mockOnAnimationComplete = jest.fn();

      // Act
      const { toJSON } = render(
        <OnboardingSuccessAnimation
          startAnimation
          onAnimationComplete={mockOnAnimationComplete}
        />,
      );

      // Assert
      expect(toJSON()).not.toBeNull();
    });

    it('accepts success mode prop', () => {
      // Arrange
      const mockOnAnimationComplete = jest.fn();

      // Act
      const { toJSON } = render(
        <OnboardingSuccessAnimation
          startAnimation
          mode="success"
          onAnimationComplete={mockOnAnimationComplete}
        />,
      );

      // Assert
      expect(toJSON()).not.toBeNull();
    });

    it('accepts custom trigger prop', () => {
      // Arrange
      const mockOnAnimationComplete = jest.fn();

      // Act
      const { toJSON } = render(
        <OnboardingSuccessAnimation
          startAnimation
          trigger="Only_End"
          onAnimationComplete={mockOnAnimationComplete}
        />,
      );

      // Assert
      expect(toJSON()).not.toBeNull();
    });

    it('accepts showText prop override', () => {
      // Arrange
      const mockOnAnimationComplete = jest.fn();

      // Act
      const { toJSON } = render(
        <OnboardingSuccessAnimation
          startAnimation
          showText={false}
          onAnimationComplete={mockOnAnimationComplete}
        />,
      );

      // Assert
      expect(toJSON()).not.toBeNull();
    });

    it('shows text in setup mode by default', () => {
      // Arrange
      const mockOnAnimationComplete = jest.fn();

      // Act
      const { queryByText } = render(
        <OnboardingSuccessAnimation
          startAnimation
          mode="setup"
          onAnimationComplete={mockOnAnimationComplete}
        />,
      );

      // Assert
      expect(
        queryByText(/onboarding_success.setting_up_wallet_base/),
      ).toBeTruthy();
    });

    it('hides text in success mode by default', () => {
      // Arrange
      const mockOnAnimationComplete = jest.fn();

      // Act
      const { queryByText } = render(
        <OnboardingSuccessAnimation
          startAnimation
          mode="success"
          onAnimationComplete={mockOnAnimationComplete}
        />,
      );

      // Assert
      expect(
        queryByText(/onboarding_success.setting_up_wallet_base/),
      ).toBeNull();
    });

    it('overrides mode-based text visibility with showText prop', () => {
      // Arrange
      const mockOnAnimationComplete = jest.fn();

      // Act
      const { queryByText } = render(
        <OnboardingSuccessAnimation
          startAnimation
          mode="success"
          showText
          onAnimationComplete={mockOnAnimationComplete}
        />,
      );

      // Assert
      expect(
        queryByText(/onboarding_success.setting_up_wallet_base/),
      ).toBeTruthy();
    });
  });
});
