// Third party dependencies.
import React, { createRef } from 'react';
import { render, screen, act } from '@testing-library/react-native';

// Internal dependencies.
import Toast from './Toast';
import { ToastRef, ToastVariants, ToastOptions } from './Toast.types';

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => ({
  useSharedValue: jest.fn(() => ({ value: 0 })),
  useAnimatedStyle: jest.fn(() => ({})),
  withTiming: jest.fn((value, _config, callback) => {
    if (callback) {
      callback();
    }
    return value;
  }),
  withDelay: jest.fn((_delay, animation) => animation),
  cancelAnimation: jest.fn(),
  runOnJS: jest.fn((fn) => () => fn()),
  default: {
    View: 'Animated.View',
  },
}));

// Mock safe area context
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ bottom: 0, top: 0, left: 0, right: 0 }),
}));

describe('Toast', () => {
  let toastRef: React.RefObject<ToastRef>;

  beforeEach(() => {
    toastRef = createRef<ToastRef>();
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.resetAllMocks();
    jest.useRealTimers();
  });

  it('renders correctly with default state', () => {
    const { toJSON } = render(<Toast ref={toastRef} />);
    expect(toJSON()).toMatchSnapshot();
  });

  it('displays toast with correct label when showToast is called', async () => {
    const toastOptions: ToastOptions = {
      variant: ToastVariants.Plain,
      labelOptions: [{ label: 'Test Label' }],
      hasNoTimeout: true,
    };

    render(<Toast ref={toastRef} />);

    await act(async () => {
      toastRef.current?.showToast(toastOptions);
      jest.runAllTimers();
    });

    expect(screen.getByText('Test Label')).toBeOnTheScreen();
  });

  it('displays toast with bold label when isBold is true', async () => {
    const toastOptions: ToastOptions = {
      variant: ToastVariants.Plain,
      labelOptions: [{ label: 'Bold Test Label', isBold: true }],
      hasNoTimeout: true,
    };

    render(<Toast ref={toastRef} />);

    await act(async () => {
      toastRef.current?.showToast(toastOptions);
      jest.runAllTimers();
    });

    expect(screen.getByText('Bold Test Label')).toBeOnTheScreen();
  });

  it('displays toast with multiple label parts', async () => {
    const toastOptions: ToastOptions = {
      variant: ToastVariants.Plain,
      labelOptions: [
        { label: 'First part ' },
        { label: 'bold part', isBold: true },
        { label: ' last part' },
      ],
      hasNoTimeout: true,
    };

    render(<Toast ref={toastRef} />);

    await act(async () => {
      toastRef.current?.showToast(toastOptions);
      jest.runAllTimers();
    });

    expect(screen.getByText('First part ')).toBeOnTheScreen();
    expect(screen.getByText('bold part')).toBeOnTheScreen();
    expect(screen.getByText(' last part')).toBeOnTheScreen();
  });

  it('displays toast with description when descriptionOptions provided', async () => {
    const toastOptions: ToastOptions = {
      variant: ToastVariants.Plain,
      labelOptions: [{ label: 'Test Label' }],
      descriptionOptions: { description: 'Test description' },
      hasNoTimeout: true,
    };

    render(<Toast ref={toastRef} />);

    await act(async () => {
      toastRef.current?.showToast(toastOptions);
      jest.runAllTimers();
    });

    expect(screen.getByText('Test Label')).toBeOnTheScreen();
    expect(screen.getByText('Test description')).toBeOnTheScreen();
  });

  it('hides toast when closeToast is called', async () => {
    const toastOptions: ToastOptions = {
      variant: ToastVariants.Plain,
      labelOptions: [{ label: 'Test Label' }],
      hasNoTimeout: true,
    };

    render(<Toast ref={toastRef} />);

    // Show toast first
    await act(async () => {
      toastRef.current?.showToast(toastOptions);
      jest.runAllTimers();
    });

    expect(screen.getByText('Test Label')).toBeOnTheScreen();

    // Close toast
    await act(async () => {
      toastRef.current?.closeToast();
    });

    expect(screen.queryByText('Test Label')).toBeNull();
  });
});
