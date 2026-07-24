import { act, fireEvent, render } from '@testing-library/react-native';
import React, { useEffect, useRef } from 'react';
import { AccessibilityInfo } from 'react-native';
import {
  QuickBuyBottomSheetOverlay,
  type QuickBuyBottomSheetOverlayRef,
} from './QuickBuyBottomSheetOverlay';

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({
    style: () => ({}),
  }),
}));

jest.mock('react-native-reanimated', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {
    // no-op
  };
  return Reanimated;
});

describe('QuickBuyBottomSheetOverlay', () => {
  beforeEach(() => {
    jest
      .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
      .mockResolvedValue(false);
    jest.spyOn(AccessibilityInfo, 'addEventListener').mockReturnValue({
      remove: jest.fn(),
    } as never);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders with testID', () => {
    const { getByTestId } = render(
      <QuickBuyBottomSheetOverlay testID="overlay" />,
    );

    expect(getByTestId('overlay')).toBeTruthy();
  });

  it('calls onPress when overlay is pressed', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <QuickBuyBottomSheetOverlay
        testID="overlay"
        onPress={onPress}
        touchableOpacityProps={{ testID: 'overlay-press' }}
      />,
    );

    fireEvent.press(getByTestId('overlay-press'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('exposes onCloseOverlay via ref', () => {
    const overlayRef: { current: QuickBuyBottomSheetOverlayRef | null } = {
      current: null,
    };
    const TestComponent = () => {
      const ref = useRef<QuickBuyBottomSheetOverlayRef>(null);
      useEffect(() => {
        overlayRef.current = ref.current;
      }, []);
      return <QuickBuyBottomSheetOverlay ref={ref} testID="overlay" />;
    };

    render(<TestComponent />);

    expect(overlayRef.current).not.toBeNull();
    expect(typeof overlayRef.current?.onCloseOverlay).toBe('function');
  });

  it('calls callback after onCloseOverlay', () => {
    const callback = jest.fn();
    const TestComponent = () => {
      const ref = useRef<QuickBuyBottomSheetOverlayRef>(null);
      useEffect(() => {
        act(() => {
          ref.current?.onCloseOverlay(callback);
        });
      }, []);
      return <QuickBuyBottomSheetOverlay ref={ref} />;
    };

    render(<TestComponent />);

    expect(callback).toHaveBeenCalledTimes(1);
  });
});
