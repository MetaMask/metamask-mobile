import { act, render } from '@testing-library/react-native';
import React, { useEffect, useRef } from 'react';
import { AccessibilityInfo, Text } from 'react-native';
import {
  QuickBuyBottomSheetDialog,
  type QuickBuyBottomSheetDialogRef,
} from './QuickBuyBottomSheetDialog';

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  Theme: { Light: 'light', Dark: 'dark' },
  useTailwind: () => ({
    style: (...args: unknown[]) => args,
  }),
  useTheme: () => 'light',
  usePureBlack: () => false,
}));

jest.mock('@metamask/design-tokens', () => ({
  lightTheme: { shadows: { size: { lg: {} } } },
  resolveDarkTheme: () => ({ shadows: { size: { lg: {} } } }),
}));

jest.mock('react-native-reanimated', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {
    // no-op
  };
  return Reanimated;
});

jest.mock('react-native-gesture-handler', () => {
  const ReactMock = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    Gesture: {
      Pan: () => ({
        enabled: () => ({
          onStart: () => ({
            onUpdate: () => ({
              onEnd: () => ({}),
            }),
          }),
        }),
      }),
    },
    GestureDetector: ({ children }: { children: React.ReactNode }) =>
      ReactMock.createElement(View, null, children),
  };
});

describe('QuickBuyBottomSheetDialog', () => {
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

  it('renders the drag handle when interactable', () => {
    const { getByTestId } = render(
      <QuickBuyBottomSheetDialog>
        <Text>content</Text>
      </QuickBuyBottomSheetDialog>,
    );

    expect(getByTestId('quick-buy-drag-handle')).toBeTruthy();
  });

  it('calls onCloseStart when onCloseDialog is invoked', () => {
    const onCloseStart = jest.fn();
    const TestComponent = () => {
      const ref = useRef<QuickBuyBottomSheetDialogRef>(null);
      useEffect(() => {
        act(() => {
          ref.current?.onCloseDialog();
        });
      }, []);
      return (
        <QuickBuyBottomSheetDialog ref={ref} onCloseStart={onCloseStart}>
          <Text>content</Text>
        </QuickBuyBottomSheetDialog>
      );
    };

    render(<TestComponent />);

    expect(onCloseStart).toHaveBeenCalledTimes(1);
  });
});
