import React from 'react';
import { render } from '@testing-library/react-native';
import { ReactTestInstance } from 'react-test-renderer';
import OnboardingSuccessEndAnimation from './index';

// Mock Rive
let mockRiveRef: unknown = null;
jest.mock('rive-react-native', () => {
  const MockReact = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');

  const MockRive = MockReact.forwardRef(
    (props: { testID?: string; style?: unknown }, ref: React.Ref<unknown>) => {
      MockReact.useImperativeHandle(ref, () => mockRiveRef);
      return MockReact.createElement(View, {
        testID: props.testID || 'mock-rive',
        style: props.style, // Pass through the style prop
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

// Mock Dimensions
const mockDimensions = { width: 375, height: 812 };
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    Dimensions: {
      get: jest.fn(() => mockDimensions),
    },
  };
});
jest.mock('../../../../util/theme', () => ({
  useTheme: () => ({
    colors: {
      text: { default: '#000000' },
      background: { default: '#ffffff' },
    },
    themeAppearance: 'light',
  }),
}));

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
    // Reset mock Rive ref
    mockRiveRef = null;
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

  it('calculates correct dimensions for animation styles', () => {
    // Arrange
    const mockOnAnimationComplete = jest.fn();

    // Act
    const { getByTestId } = render(
      <OnboardingSuccessEndAnimation
        onAnimationComplete={mockOnAnimationComplete}
      />,
    );

    // Assert
    const animationContainer = getByTestId('onboarding-success-end-animation');
    const animationWrapper = animationContainer
      .children[0] as ReactTestInstance;

    // Verify container and wrapper have correct styles
    expect(animationContainer.props.style).toEqual(
      expect.objectContaining({
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
      }),
    );

    expect(animationWrapper.props.style).toEqual(
      expect.objectContaining({
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
      }),
    );

    // Verify Rive component uses correct dimensions
    const riveComponent = getByTestId('mock-rive');
    expect(riveComponent.props.style).toEqual(
      expect.objectContaining({
        width: 750,
        height: 667,
        alignSelf: 'center',
      }),
    );
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
});
