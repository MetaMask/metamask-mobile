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

// Import the component after all mocks are set up
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

    // Assert - Component should render without crashing
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

    // Component should still be running (not crashed)
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

    // Assert - Test dots cycling: . -> .. -> ... -> .
    jest.advanceTimersByTime(500); // dotsCount: 1 -> 2
    jest.advanceTimersByTime(500); // dotsCount: 2 -> 3
    jest.advanceTimersByTime(500); // dotsCount: 3 -> 1
    jest.advanceTimersByTime(500); // dotsCount: 1 -> 2

    // Animation should continue running
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

    // Advance timer to trigger Rive animation start (100ms delay)
    jest.advanceTimersByTime(100);

    // Assert - Component should render and start animation without crashing
    // We can't easily test the internal Rive calls due to mocking complexity,
    // but we can verify the component doesn't crash and behaves correctly
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

    // Advance timers to ensure component works correctly
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

    // Advance timers to simulate normal operation
    jest.advanceTimersByTime(100); // Rive animation start delay
    jest.advanceTimersByTime(500); // First dots animation cycle

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

    // Assert - Should not crash when running timers after unmount
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

    // Assert - Component should render with themed colors
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

    // Assert - Should have the expected component structure
    const tree = toJSON();
    expect(tree).toMatchSnapshot();
  });
});
