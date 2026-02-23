import React, { createRef } from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import { SwapsKeypad } from './index';
import { Keys } from '../../../../Base/Keypad';
import { SwapsKeypadRef } from './types';

// Mock BottomSheetDialog to render children directly without animations.
// Exposes onCloseDialog via ref so close() can be tested.
jest.mock(
  '../../../../../component-library/components/BottomSheets/BottomSheet/foundation/BottomSheetDialog/BottomSheetDialog',
  () => {
    const MockReact = jest.requireActual('react');
    return {
      __esModule: true,
      default: MockReact.forwardRef(
        (
          {
            children,
            onClose,
          }: { children: React.ReactNode; onClose?: () => void },
          dialogRef: React.Ref<{ onCloseDialog: () => void }>,
        ) => {
          MockReact.useImperativeHandle(dialogRef, () => ({
            onCloseDialog: () => onClose?.(),
          }));
          return children;
        },
      ),
    };
  },
);

/**
 * Helper to render SwapsKeypad and open it via the ref.
 * The component returns null until open() is called.
 */
function renderAndOpen(
  props: Omit<React.ComponentProps<typeof SwapsKeypad>, 'ref'>,
) {
  const ref = createRef<SwapsKeypadRef>();

  const result = render(<SwapsKeypad ref={ref} {...props} />);

  act(() => {
    ref.current?.open();
  });

  return { ...result, ref };
}

describe('SwapsKeypad', () => {
  const mockOnChange = jest.fn();

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('rendering', () => {
    it('renders keypad with correct initial props', () => {
      const { getByText } = renderAndOpen({
        value: '0',
        currency: 'native',
        decimals: 18,
        onChange: mockOnChange,
      });

      expect(getByText('1')).toBeTruthy();
      expect(getByText('2')).toBeTruthy();
      expect(getByText('9')).toBeTruthy();
      expect(getByText('0')).toBeTruthy();
    });
  });

  describe('keypad interaction', () => {
    it('calls onChange when digit key is pressed', () => {
      const { getByText } = renderAndOpen({
        value: '0',
        currency: 'native',
        decimals: 18,
        onChange: mockOnChange,
      });

      const button5 = getByText('5');

      act(() => {
        fireEvent.press(button5);
      });

      expect(mockOnChange).toHaveBeenCalledWith({
        value: '5',
        valueAsNumber: 5,
        pressedKey: Keys.Digit5,
      });
    });

    it('calls onChange when decimal separator is pressed', () => {
      const { getByText } = renderAndOpen({
        value: '5',
        currency: 'native',
        decimals: 18,
        onChange: mockOnChange,
      });

      const periodButton = getByText('.');

      act(() => {
        fireEvent.press(periodButton);
      });

      expect(mockOnChange).toHaveBeenCalledWith({
        value: '5.',
        valueAsNumber: 5,
        pressedKey: Keys.Period,
      });
    });

    it('handles multiple digit inputs correctly', () => {
      const ref = createRef<SwapsKeypadRef>();

      const { getByText, rerender } = render(
        <SwapsKeypad
          ref={ref}
          value="0"
          currency="native"
          decimals={18}
          onChange={mockOnChange}
        />,
      );

      act(() => {
        ref.current?.open();
      });

      act(() => {
        fireEvent.press(getByText('1'));
      });

      expect(mockOnChange).toHaveBeenCalledWith({
        value: '1',
        valueAsNumber: 1,
        pressedKey: Keys.Digit1,
      });

      rerender(
        <SwapsKeypad
          ref={ref}
          value="1"
          currency="native"
          decimals={18}
          onChange={mockOnChange}
        />,
      );

      act(() => {
        fireEvent.press(getByText('2'));
      });

      expect(mockOnChange).toHaveBeenCalledWith({
        value: '12',
        valueAsNumber: 12,
        pressedKey: Keys.Digit2,
      });
    });
  });

  describe('edge cases', () => {
    it('handles empty value correctly', () => {
      const { getByText } = renderAndOpen({
        value: '',
        currency: 'native',
        decimals: 18,
        onChange: mockOnChange,
      });

      act(() => {
        fireEvent.press(getByText('1'));
      });

      expect(mockOnChange).toHaveBeenCalledWith({
        value: '1',
        valueAsNumber: 1,
        pressedKey: Keys.Digit1,
      });
    });

    it('handles different currencies correctly', () => {
      const { getByText } = renderAndOpen({
        value: '0',
        currency: 'USD',
        decimals: 2,
        onChange: mockOnChange,
      });

      act(() => {
        fireEvent.press(getByText('5'));
      });

      expect(mockOnChange).toHaveBeenCalled();
    });

    it('handles different decimal values correctly', () => {
      const { getByText } = renderAndOpen({
        value: '0',
        currency: 'native',
        decimals: 6,
        onChange: mockOnChange,
      });

      act(() => {
        fireEvent.press(getByText('3'));
      });

      expect(mockOnChange).toHaveBeenCalledWith({
        value: '3',
        valueAsNumber: 3,
        pressedKey: Keys.Digit3,
      });
    });
  });

  describe('imperative handle and lifecycle', () => {
    it('returns null before open is called', () => {
      const ref = createRef<SwapsKeypadRef>();

      const { queryByText } = render(
        <SwapsKeypad
          ref={ref}
          value="0"
          currency="native"
          decimals={18}
          onChange={mockOnChange}
        />,
      );

      // Nothing should be rendered before open()
      expect(queryByText('1')).toBeNull();
    });

    it('isOpen returns false before open is called', () => {
      const ref = createRef<SwapsKeypadRef>();

      render(
        <SwapsKeypad
          ref={ref}
          value="0"
          currency="native"
          decimals={18}
          onChange={mockOnChange}
        />,
      );

      expect(ref.current?.isOpen()).toBe(false);
    });

    it('isOpen returns true after open is called', () => {
      const ref = createRef<SwapsKeypadRef>();

      render(
        <SwapsKeypad
          ref={ref}
          value="0"
          currency="native"
          decimals={18}
          onChange={mockOnChange}
        />,
      );

      act(() => {
        ref.current?.open();
      });

      expect(ref.current?.isOpen()).toBe(true);
    });

    it('does not re-open when open is called while already open', () => {
      const ref = createRef<SwapsKeypadRef>();

      const { getByText } = render(
        <SwapsKeypad
          ref={ref}
          value="0"
          currency="native"
          decimals={18}
          onChange={mockOnChange}
        />,
      );

      act(() => {
        ref.current?.open();
      });

      expect(getByText('1')).toBeTruthy();

      // Calling open again should be a no-op
      act(() => {
        ref.current?.open();
      });

      expect(ref.current?.isOpen()).toBe(true);
      expect(getByText('1')).toBeTruthy();
    });

    it('close triggers bottom sheet onCloseDialog and resets state', () => {
      const ref = createRef<SwapsKeypadRef>();

      const { queryByText, getByText } = render(
        <SwapsKeypad
          ref={ref}
          value="0"
          currency="native"
          decimals={18}
          onChange={mockOnChange}
        />,
      );

      // Open the keypad
      act(() => {
        ref.current?.open();
      });

      expect(getByText('1')).toBeTruthy();
      expect(ref.current?.isOpen()).toBe(true);

      // Close the keypad
      act(() => {
        ref.current?.close();
      });

      // handleClose should have been called via the mock,
      // resetting isRendered and isOpenRef
      expect(ref.current?.isOpen()).toBe(false);
      expect(queryByText('1')).toBeNull();
    });

    it('close is a no-op when keypad is not open', () => {
      const ref = createRef<SwapsKeypadRef>();

      render(
        <SwapsKeypad
          ref={ref}
          value="0"
          currency="native"
          decimals={18}
          onChange={mockOnChange}
        />,
      );

      expect(ref.current?.isOpen()).toBe(false);

      // Calling close when not open should not throw
      act(() => {
        ref.current?.close();
      });

      expect(ref.current?.isOpen()).toBe(false);
    });

    it('can reopen after being closed', () => {
      const ref = createRef<SwapsKeypadRef>();

      const { queryByText, getByText } = render(
        <SwapsKeypad
          ref={ref}
          value="0"
          currency="native"
          decimals={18}
          onChange={mockOnChange}
        />,
      );

      // Open
      act(() => {
        ref.current?.open();
      });
      expect(getByText('1')).toBeTruthy();

      // Close
      act(() => {
        ref.current?.close();
      });
      expect(queryByText('1')).toBeNull();

      // Reopen
      act(() => {
        ref.current?.open();
      });
      expect(getByText('1')).toBeTruthy();
      expect(ref.current?.isOpen()).toBe(true);
    });
  });
});
