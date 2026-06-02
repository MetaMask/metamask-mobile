import React from 'react';
import { render } from '@testing-library/react-native';
import OnboardingSuccessEndAnimation from './index';

let mockRiveRef: unknown = null;
jest.mock('rive-react-native', () => {
  const MockReact = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');

  const MockRive = MockReact.forwardRef(
    (props: { testID?: string; style?: unknown }, ref: React.Ref<unknown>) => {
      MockReact.useImperativeHandle(ref, () => mockRiveRef);
      return MockReact.createElement(View, {
        testID: props.testID || 'mock-rive',
        style: props.style,
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

let mockIsE2EValue = false;
jest.mock('../../../../util/test/utils', () => ({
  get isE2E() {
    return mockIsE2EValue;
  },
}));

jest.mock(
  '../../../../animations/onboarding_loader.riv',
  () => 'mocked-rive-file',
);

describe('OnboardingSuccessEndAnimation', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockIsE2EValue = false;
    mockRiveRef = null;
  });

  afterEach(() => {
    jest.useRealTimers();
    mockIsE2EValue = false;
    mockRiveRef = null;
  });

  it('renders successfully', () => {
    const { getByTestId } = render(
      <OnboardingSuccessEndAnimation onAnimationComplete={jest.fn()} />,
    );

    expect(getByTestId('onboarding-success-end-animation')).toBeTruthy();
  });

  it('handles E2E mode correctly', () => {
    mockIsE2EValue = true;

    const { getByTestId } = render(
      <OnboardingSuccessEndAnimation onAnimationComplete={jest.fn()} />,
    );

    expect(getByTestId('onboarding-success-end-animation')).toBeTruthy();
  });

  it('skips dark mode setup in E2E mode', () => {
    mockIsE2EValue = true;
    const mockSetInputState = jest.fn();
    const mockFireState = jest.fn();

    mockRiveRef = {
      setInputState: mockSetInputState,
      fireState: mockFireState,
    } as unknown;

    render(<OnboardingSuccessEndAnimation onAnimationComplete={jest.fn()} />);

    jest.advanceTimersByTime(100);

    expect(mockSetInputState).not.toHaveBeenCalled();
    expect(mockFireState).not.toHaveBeenCalled();
  });

  it('sets dark mode input and fires Only_End transition', () => {
    const mockSetInputState = jest.fn();
    const mockFireState = jest.fn();

    mockRiveRef = {
      setInputState: mockSetInputState,
      fireState: mockFireState,
    } as unknown;

    render(<OnboardingSuccessEndAnimation onAnimationComplete={jest.fn()} />);

    jest.advanceTimersByTime(100);

    expect(mockSetInputState).toHaveBeenCalledWith(
      'OnboardingLoader',
      'Dark mode',
      false,
    );
    expect(mockFireState).toHaveBeenCalledWith('OnboardingLoader', 'Only_End');
  });

  it('clears timeout on unmount', () => {
    const mockSetInputState = jest.fn();

    mockRiveRef = {
      setInputState: mockSetInputState,
      fireState: jest.fn(),
    } as unknown;

    const { unmount } = render(
      <OnboardingSuccessEndAnimation onAnimationComplete={jest.fn()} />,
    );

    jest.advanceTimersByTime(50);
    unmount();
    jest.advanceTimersByTime(100);

    expect(mockSetInputState).not.toHaveBeenCalled();
  });
});
