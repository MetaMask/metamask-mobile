import React from 'react';
import { render } from '@testing-library/react-native';
import OnboardingSuccessEndAnimation from './index';

// Controllable riveViewRef so tests can simulate the view not being ready.
// Extends the global @rive-app/react-native mock (whose riveViewRef is
// non-null immediately and whose methods are private).
let mockRiveViewRef: {
  setBooleanInputValue: jest.Mock;
  triggerInput: jest.Mock;
} | null = null;

jest.mock('@rive-app/react-native', () => {
  const actual = jest.requireActual(
    '../../../../__mocks__/rive-app-react-native',
  );
  return {
    ...actual,
    useRive: () => ({
      riveRef: { current: mockRiveViewRef },
      riveViewRef: mockRiveViewRef,
      setHybridRef: { f: jest.fn() },
    }),
  };
});

jest.mock('../../../../util/theme', () => {
  const { mockTheme } = jest.requireActual('../../../../util/theme');
  return {
    useTheme: () => mockTheme,
  };
});

// Mock E2E utils
let mockHasTestOverridesValue = false;
jest.mock('../../../../util/test/utils', () => ({
  get hasTestOverrides() {
    return mockHasTestOverridesValue;
  },
}));

// Mock Rive file
jest.mock(
  '../../../../animations/onboarding_loader.riv',
  () => 'mocked-rive-file',
);

describe('OnboardingSuccessEndAnimation', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockHasTestOverridesValue = false;
    // Reset mock Rive view ref
    mockRiveViewRef = null;
  });

  afterEach(() => {
    jest.useRealTimers();
    mockHasTestOverridesValue = false;
    mockRiveViewRef = null;
  });

  it('renders successfully', () => {
    // Arrange
    const mockOnAnimationComplete = jest.fn();

    // Act
    const { getByTestId } = render(
      <OnboardingSuccessEndAnimation
        onAnimationComplete={mockOnAnimationComplete}
      />,
    );

    // Assert
    expect(getByTestId('onboarding-success-end-animation')).toBeTruthy();
  });

  it('handles E2E mode correctly', () => {
    // Arrange
    mockHasTestOverridesValue = true;
    const mockOnAnimationComplete = jest.fn();

    // Act
    const { getByTestId } = render(
      <OnboardingSuccessEndAnimation
        onAnimationComplete={mockOnAnimationComplete}
      />,
    );

    // Assert
    expect(getByTestId('onboarding-success-end-animation')).toBeTruthy();
  });

  it('skips animation setup in E2E mode', () => {
    // Arrange
    mockHasTestOverridesValue = true;
    const mockSetBooleanInputValue = jest.fn();
    const mockTriggerInput = jest.fn();

    // Mock Rive view ref with methods
    mockRiveViewRef = {
      setBooleanInputValue: mockSetBooleanInputValue,
      triggerInput: mockTriggerInput,
    };

    const mockOnAnimationComplete = jest.fn();

    // Act
    render(
      <OnboardingSuccessEndAnimation
        onAnimationComplete={mockOnAnimationComplete}
      />,
    );

    // Assert - In E2E mode, no Rive methods should be called
    expect(mockSetBooleanInputValue).not.toHaveBeenCalled();
    expect(mockTriggerInput).not.toHaveBeenCalled();
  });

  it('handles early return when riveViewRef is null in non-E2E mode', () => {
    // Arrange
    mockHasTestOverridesValue = false;
    mockRiveViewRef = null;
    const mockOnAnimationComplete = jest.fn();

    // Act
    render(
      <OnboardingSuccessEndAnimation
        onAnimationComplete={mockOnAnimationComplete}
      />,
    );

    // Advance timers to flush any scheduled work
    jest.advanceTimersByTime(100);

    // Assert
    expect(mockOnAnimationComplete).toBeDefined();
  });

  it('triggers the animation once and not again on rerender', () => {
    // Arrange
    mockHasTestOverridesValue = false;
    const mockSetBooleanInputValue = jest.fn();
    const mockTriggerInput = jest.fn();

    mockRiveViewRef = {
      setBooleanInputValue: mockSetBooleanInputValue,
      triggerInput: mockTriggerInput,
    };

    const mockOnAnimationComplete = jest.fn();

    // Act
    const { rerender } = render(
      <OnboardingSuccessEndAnimation
        onAnimationComplete={mockOnAnimationComplete}
      />,
    );

    // Re-render — effect deps (isDarkMode, riveViewRef) are unchanged
    rerender(
      <OnboardingSuccessEndAnimation
        onAnimationComplete={mockOnAnimationComplete}
      />,
    );

    // Assert - triggerInput takes only the trigger name; the state machine is
    // now the stateMachineName view prop, and dark mode is set via
    // setBooleanInputValue
    expect(mockSetBooleanInputValue).toHaveBeenCalledTimes(1);
    expect(mockTriggerInput).toHaveBeenCalledTimes(1);
    expect(mockSetBooleanInputValue).toHaveBeenCalledWith('Dark mode', false);
    expect(mockTriggerInput).toHaveBeenCalledWith('Only_End');
  });

  it('handles animation lifecycle without memory leaks', () => {
    // Arrange
    const mockOnAnimationComplete = jest.fn();

    // Act
    const { unmount } = render(
      <OnboardingSuccessEndAnimation
        onAnimationComplete={mockOnAnimationComplete}
      />,
    );

    jest.advanceTimersByTime(1000);

    unmount();

    // Render again
    const { unmount: unmount2 } = render(
      <OnboardingSuccessEndAnimation
        onAnimationComplete={mockOnAnimationComplete}
      />,
    );

    unmount2();

    // Assert
    expect(mockOnAnimationComplete).toBeDefined();
  });

  it('handles Rive animation errors gracefully', () => {
    // Arrange
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    const mockSetBooleanInputValue = jest.fn(() => {
      throw new Error('Rive animation error');
    });
    const mockTriggerInput = jest.fn();

    mockRiveViewRef = {
      setBooleanInputValue: mockSetBooleanInputValue,
      triggerInput: mockTriggerInput,
    };

    const mockOnAnimationComplete = jest.fn();

    // Act
    render(
      <OnboardingSuccessEndAnimation
        onAnimationComplete={mockOnAnimationComplete}
      />,
    );

    // Assert
    expect(consoleSpy).toHaveBeenCalledWith(
      'Error with Rive animation:',
      expect.any(Error),
    );

    // Cleanup
    consoleSpy.mockRestore();
  });

  it('applies the current theme when triggering the animation', () => {
    // Arrange
    const mockSetBooleanInputValue = jest.fn();
    const mockTriggerInput = jest.fn();

    mockRiveViewRef = {
      setBooleanInputValue: mockSetBooleanInputValue,
      triggerInput: mockTriggerInput,
    };

    const mockOnAnimationComplete = jest.fn();

    // Act - Initial render with light theme
    render(
      <OnboardingSuccessEndAnimation
        onAnimationComplete={mockOnAnimationComplete}
      />,
    );

    // Verify light theme was used
    expect(mockSetBooleanInputValue).toHaveBeenCalledWith('Dark mode', false);
    expect(mockTriggerInput).toHaveBeenCalledWith('Only_End');

    // Assert - useEffect was triggered exactly once
    expect(mockSetBooleanInputValue).toHaveBeenCalledTimes(1);
    expect(mockTriggerInput).toHaveBeenCalledTimes(1);
  });
});
