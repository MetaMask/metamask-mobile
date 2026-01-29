import React from 'react';
import { render } from '@testing-library/react-native';
import { BackHandler, NativeEventSubscription } from 'react-native';
import LockScreen from './';

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn((callback) => callback()),
}));

describe('LockScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render correctly', () => {
    const { toJSON } = render(<LockScreen />);
    expect(toJSON()).toMatchSnapshot();
  });

  it('registers BackHandler on focus to prevent back navigation', () => {
    const removeMock = jest.fn();
    const addListenerSpy = jest
      .spyOn(BackHandler, 'addEventListener')
      .mockImplementation(
        (
          event: 'hardwareBackPress',
          _handler: () => boolean | null | undefined,
        ): NativeEventSubscription => {
          expect(event).toBe('hardwareBackPress');
          return { remove: removeMock } as unknown as NativeEventSubscription;
        },
      );

    render(<LockScreen />);

    expect(addListenerSpy).toHaveBeenCalledWith(
      'hardwareBackPress',
      expect.any(Function),
    );

    addListenerSpy.mockRestore();
  });

  it('back press handler returns true to prevent default behavior', () => {
    let capturedHandler: (() => boolean | null | undefined) | undefined;
    const removeMock = jest.fn();
    const addListenerSpy = jest
      .spyOn(BackHandler, 'addEventListener')
      .mockImplementation(
        (
          _event: 'hardwareBackPress',
          handler: () => boolean | null | undefined,
        ): NativeEventSubscription => {
          capturedHandler = handler;
          return { remove: removeMock } as unknown as NativeEventSubscription;
        },
      );

    render(<LockScreen />);

    expect(capturedHandler).toBeDefined();
    const result = capturedHandler?.();
    expect(result).toBe(true);

    addListenerSpy.mockRestore();
  });

  it('removes BackHandler listener on cleanup', () => {
    const addListenerSpy = jest
      .spyOn(BackHandler, 'addEventListener')
      .mockImplementation(
        (): NativeEventSubscription =>
          ({ remove: jest.fn() }) as unknown as NativeEventSubscription,
      );
    const removeListenerSpy = jest
      .spyOn(BackHandler, 'removeEventListener')
      .mockImplementation(jest.fn());

    // Mock useFocusEffect to capture and execute cleanup
    let cleanupFn: (() => void) | undefined;
    jest
      .requireMock('@react-navigation/native')
      .useFocusEffect.mockImplementation((callback: () => () => void) => {
        cleanupFn = callback();
      });

    render(<LockScreen />);

    expect(cleanupFn).toBeDefined();
    cleanupFn?.();

    expect(removeListenerSpy).toHaveBeenCalledWith(
      'hardwareBackPress',
      expect.any(Function),
    );

    addListenerSpy.mockRestore();
    removeListenerSpy.mockRestore();
  });
});
