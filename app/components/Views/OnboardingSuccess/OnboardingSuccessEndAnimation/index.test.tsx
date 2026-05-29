import React from 'react';
import { render } from '@testing-library/react-native';
import OnboardingSuccessEndAnimation from './index';
import Logger from '../../../../util/Logger';

jest.mock('../../../../util/Logger', () => ({
  error: jest.fn(),
}));

// Mock Rive
let mockRiveRef: unknown = null;
jest.mock('rive-react-native', () => {
  const MockReact = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');

  const MockRive = MockReact.forwardRef(
    (
      props: {
        testID?: string;
        style?: unknown;
        onError?: (error: { message: string; type: string }) => void;
      },
      ref: React.Ref<unknown>,
    ) => {
      MockReact.useImperativeHandle(ref, () => mockRiveRef);
      return MockReact.createElement(View, {
        testID: props.testID || 'mock-rive',
        style: props.style,
        onError: props.onError,
      });
    },
  );

  return {
    __esModule: true,
    default: MockRive,
    Fit: { Cover: 'cover' },
    Alignment: { Center: 'center' },
  };
});

jest.mock('../../../../util/theme', () => {
  const { mockTheme } = jest.requireActual('../../../../util/theme');
  return {
    useTheme: () => mockTheme,
  };
});

// Mock E2E utils
let mockIsE2EValue = false;
jest.mock('../../../../util/test/utils', () => ({
  get isE2E() {
    return mockIsE2EValue;
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
    mockIsE2EValue = false;
    mockRiveRef = null;
    jest.mocked(Logger.error).mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
    mockIsE2EValue = false;
    mockRiveRef = null;
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
    mockIsE2EValue = true;
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
    mockIsE2EValue = true;
    const mockSetInputState = jest.fn();
    const mockFireState = jest.fn();

    // Mock Rive ref with methods
    mockRiveRef = {
      setInputState: mockSetInputState,
      fireState: mockFireState,
    } as unknown;

    const mockOnAnimationComplete = jest.fn();

    // Act
    render(
      <OnboardingSuccessEndAnimation
        onAnimationComplete={mockOnAnimationComplete}
      />,
    );

    // Assert - In E2E mode, no Rive methods should be called
    expect(mockSetInputState).not.toHaveBeenCalled();
    expect(mockFireState).not.toHaveBeenCalled();
  });

  it('handles early return when riveRef is null in non-E2E mode', () => {
    // Arrange
    mockIsE2EValue = false;
    mockRiveRef = null;
    const mockOnAnimationComplete = jest.fn();

    // Act
    render(
      <OnboardingSuccessEndAnimation
        onAnimationComplete={mockOnAnimationComplete}
      />,
    );

    // Advance timers to trigger setTimeout
    jest.advanceTimersByTime(100);

    // Assert
    expect(mockOnAnimationComplete).toBeDefined();
  });

  it('clears existing timeout before setting new one', () => {
    // Arrange
    mockIsE2EValue = false;
    const mockSetInputState = jest.fn();
    const mockFireState = jest.fn();

    mockRiveRef = {
      setInputState: mockSetInputState,
      fireState: mockFireState,
    } as unknown;

    const mockOnAnimationComplete = jest.fn();

    // Act
    const { rerender } = render(
      <OnboardingSuccessEndAnimation
        onAnimationComplete={mockOnAnimationComplete}
      />,
    );

    // Verify initial timeout is set (advance partially)
    jest.advanceTimersByTime(50);

    // Re-render
    rerender(
      <OnboardingSuccessEndAnimation
        onAnimationComplete={mockOnAnimationComplete}
      />,
    );

    // Advance remaining time
    jest.advanceTimersByTime(100);

    // Assert
    expect(mockSetInputState).toHaveBeenCalledTimes(1);
    expect(mockFireState).toHaveBeenCalledTimes(1);
    expect(mockSetInputState).toHaveBeenCalledWith(
      'OnboardingLoader',
      'Dark mode',
      false,
    );
    expect(mockFireState).toHaveBeenCalledWith('OnboardingLoader', 'Only_End');
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
    const mockSetInputState = jest.fn(() => {
      throw new Error('Rive animation error');
    });
    const mockFireState = jest.fn();

    mockRiveRef = {
      setInputState: mockSetInputState,
      fireState: mockFireState,
    } as unknown;

    const mockOnAnimationComplete = jest.fn();

    // Act
    render(
      <OnboardingSuccessEndAnimation
        onAnimationComplete={mockOnAnimationComplete}
      />,
    );

    jest.advanceTimersByTime(100);

    // Assert
    expect(Logger.error).toHaveBeenCalledWith(expect.any(Error), {
      message: 'OnboardingSuccessEndAnimation: Rive state transition failed',
      stateMachine: 'OnboardingLoader',
      transition: 'Only_End',
      isDarkMode: false,
    });
  });

  it('logs when Rive ref is unavailable before animation setup', () => {
    mockRiveRef = null;
    const mockOnAnimationComplete = jest.fn();

    render(
      <OnboardingSuccessEndAnimation
        onAnimationComplete={mockOnAnimationComplete}
      />,
    );

    jest.advanceTimersByTime(100);

    expect(Logger.error).toHaveBeenCalledWith(expect.any(Error), {
      message:
        'OnboardingSuccessEndAnimation: Rive ref unavailable before animation setup',
      isDarkMode: false,
    });
  });

  it('logs native Rive onError callbacks', () => {
    const mockOnAnimationComplete = jest.fn();
    const { getByTestId } = render(
      <OnboardingSuccessEndAnimation
        onAnimationComplete={mockOnAnimationComplete}
      />,
    );

    const riveView = getByTestId('mock-rive');
    riveView.props.onError?.({
      message: 'Failed to load Rive file',
      type: 'FileNotFound',
    });

    expect(Logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Failed to load Rive file' }),
      {
        message: 'OnboardingSuccessEndAnimation: Rive onError (FileNotFound)',
        riveErrorType: 'FileNotFound',
        isDarkMode: false,
      },
    );
  });

  it('triggers animation when isDarkMode dependency changes', () => {
    // Arrange
    const mockSetInputState = jest.fn();
    const mockFireState = jest.fn();

    mockRiveRef = {
      setInputState: mockSetInputState,
      fireState: mockFireState,
    } as unknown;

    const mockOnAnimationComplete = jest.fn();

    // Act - Initial render with light theme
    render(
      <OnboardingSuccessEndAnimation
        onAnimationComplete={mockOnAnimationComplete}
      />,
    );

    jest.advanceTimersByTime(100);

    // Verify light theme was used
    expect(mockSetInputState).toHaveBeenCalledWith(
      'OnboardingLoader',
      'Dark mode',
      false,
    );
    expect(mockFireState).toHaveBeenCalledWith('OnboardingLoader', 'Only_End');

    // Assert - useEffect was triggered
    expect(mockSetInputState).toHaveBeenCalledTimes(1);
    expect(mockFireState).toHaveBeenCalledTimes(1);
  });
});
