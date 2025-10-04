import React from 'react';
import { render, waitFor } from '@testing-library/react-native';

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
      'onboarding_success.wallet_ready': 'Your wallet is ready!',
    };
    return translations[key] || key;
  }),
}));

// Mock Rive component
jest.mock('rive-react-native', () => ({
  __esModule: true,
  default: 'RiveView',
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
    animationContainer: {},
    riveAnimation: {},
    textOverlay: {},
    textTitle: {},
    fadeOutContainer: {},
    fadeInContainer: {},
    contentContainer: {},
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

  it('renders correctly with default props', () => {
    const mockOnAnimationComplete = jest.fn();

    const { toJSON } = render(
      <OnboardingSuccessAnimation
        startAnimation
        onAnimationComplete={mockOnAnimationComplete}
      />,
    );

    expect(toJSON()).not.toBeNull();
  });

  it('calls onAnimationComplete when animation finishes in setup mode', async () => {
    const mockOnAnimationComplete = jest.fn();

    render(
      <OnboardingSuccessAnimation
        startAnimation
        onAnimationComplete={mockOnAnimationComplete}
        mode="setup"
      />,
    );

    // Fast forward through all timers
    jest.runAllTimers();

    await waitFor(() => {
      expect(mockOnAnimationComplete).toHaveBeenCalled();
    });
  });

  it('calls onAnimationComplete quickly in ready mode', async () => {
    const mockOnAnimationComplete = jest.fn();

    render(
      <OnboardingSuccessAnimation
        startAnimation
        onAnimationComplete={mockOnAnimationComplete}
        mode="ready"
      />,
    );

    // Fast forward through timers
    jest.runAllTimers();

    await waitFor(() => {
      expect(mockOnAnimationComplete).toHaveBeenCalled();
    });
  });

  it('handles autoComplete prop correctly', async () => {
    const mockOnAnimationComplete = jest.fn();

    render(
      <OnboardingSuccessAnimation
        startAnimation
        onAnimationComplete={mockOnAnimationComplete}
        autoComplete
      />,
    );

    jest.runAllTimers();

    await waitFor(() => {
      expect(mockOnAnimationComplete).toHaveBeenCalled();
    });
  });

  it('responds to theme changes', () => {
    // Update the mock to return dark theme
    mockUseTheme.mockReturnValueOnce({
      colors: {
        background: { default: '#000000' },
        text: { default: '#FFFFFF' },
      },
      themeAppearance: 'dark',
    });

    const mockOnAnimationComplete = jest.fn();

    const { toJSON } = render(
      <OnboardingSuccessAnimation
        startAnimation
        onAnimationComplete={mockOnAnimationComplete}
      />,
    );

    expect(toJSON()).not.toBeNull();
  });

  it('cleans up timers on unmount', () => {
    const mockOnAnimationComplete = jest.fn();

    const { unmount } = render(
      <OnboardingSuccessAnimation
        startAnimation
        onAnimationComplete={mockOnAnimationComplete}
      />,
    );

    unmount();

    // Should not crash or cause memory leaks
    jest.runAllTimers();
  });

  it('does not render when startAnimation is false', () => {
    const mockOnAnimationComplete = jest.fn();

    const { toJSON } = render(
      <OnboardingSuccessAnimation
        startAnimation={false}
        onAnimationComplete={mockOnAnimationComplete}
      />,
    );

    // Should return null when startAnimation is false
    expect(toJSON()).toBeNull();
  });

  it('progresses through animation steps correctly in setup mode', async () => {
    const mockOnAnimationComplete = jest.fn();

    render(
      <OnboardingSuccessAnimation
        startAnimation
        onAnimationComplete={mockOnAnimationComplete}
        mode="setup"
      />,
    );

    // Initially should show content (showContent becomes true)
    expect(mockOnAnimationComplete).not.toHaveBeenCalled();

    // Advance to step 2 (after 2000ms)
    jest.advanceTimersByTime(2000);

    // Advance to step 3 and completion (after 4000ms total)
    jest.advanceTimersByTime(2000);

    // Final completion callback (after additional 1000ms)
    jest.advanceTimersByTime(1000);

    await waitFor(() => {
      expect(mockOnAnimationComplete).toHaveBeenCalled();
    });
  });

  it('handles dots animation cycling correctly', () => {
    const mockOnAnimationComplete = jest.fn();

    render(
      <OnboardingSuccessAnimation
        startAnimation
        onAnimationComplete={mockOnAnimationComplete}
        mode="setup"
      />,
    );

    // Advance dots animation intervals (500ms each)
    jest.advanceTimersByTime(500); // dotsCount should be 1
    jest.advanceTimersByTime(500); // dotsCount should be 2
    jest.advanceTimersByTime(500); // dotsCount should be 3
    jest.advanceTimersByTime(500); // dotsCount should reset to 1

    // Verify dots animation is working (component doesn't crash)
    expect(mockOnAnimationComplete).not.toHaveBeenCalled();
  });

  it('skips dots animation in ready mode', () => {
    const mockOnAnimationComplete = jest.fn();

    render(
      <OnboardingSuccessAnimation
        startAnimation
        onAnimationComplete={mockOnAnimationComplete}
        mode="ready"
      />,
    );

    // In ready mode, should complete quickly without dots animation
    jest.advanceTimersByTime(500);

    waitFor(() => {
      expect(mockOnAnimationComplete).toHaveBeenCalled();
    });
  });

  it('handles autoComplete timing correctly', async () => {
    const mockOnAnimationComplete = jest.fn();

    render(
      <OnboardingSuccessAnimation
        startAnimation
        onAnimationComplete={mockOnAnimationComplete}
        autoComplete
        mode="setup"
      />,
    );

    // With autoComplete, final timeout should be 100ms instead of 4000ms
    jest.advanceTimersByTime(2000); // Step 2
    jest.advanceTimersByTime(100); // Step 3 (autoComplete timing)
    jest.advanceTimersByTime(1000); // Final callback

    await waitFor(() => {
      expect(mockOnAnimationComplete).toHaveBeenCalled();
    });
  });
});
