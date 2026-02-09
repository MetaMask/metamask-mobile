import React, { createRef } from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import { SwapsKeypad } from './index';
import { Keys } from '../../../../Base/Keypad';
import { BridgeToken } from '../../types';
import { SwapsKeypadRef } from './types';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { BigNumber } from 'ethers';

// Flag to force QuickPickButtons to always render regardless of `show` prop.
// Prefixed with `mock` so Jest allows it inside jest.mock() factory.
let mockForceShowQuickPickButtons = false;
jest.mock('./QuickPickButtons', () => {
  const actual = jest.requireActual('./QuickPickButtons');
  return {
    ...actual,
    QuickPickButtons: (
      props: React.ComponentProps<typeof actual.QuickPickButtons>,
    ) =>
      actual.QuickPickButtons({
        ...props,
        ...(mockForceShowQuickPickButtons && { show: true }),
      }),
  };
});

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

// Mock dependencies
jest.mock('../../hooks/useShouldRenderMaxOption', () => ({
  useShouldRenderMaxOption: jest.fn(() => true),
}));

import { useShouldRenderMaxOption } from '../../hooks/useShouldRenderMaxOption';
const mockUseShouldRenderMaxOption =
  useShouldRenderMaxOption as jest.MockedFunction<
    typeof useShouldRenderMaxOption
  >;

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
  const mockOnMaxPress = jest.fn();

  const mockToken: BridgeToken = {
    address: '0x1234567890123456789012345678901234567890',
    symbol: 'TEST',
    decimals: 18,
    chainId: CHAIN_IDS.MAINNET,
  };

  const mockTokenBalance = {
    displayBalance: '100.5',
    atomicBalance: BigNumber.from('100500000000000000000'),
  };

  beforeEach(() => {
    mockUseShouldRenderMaxOption.mockReset();
    mockUseShouldRenderMaxOption.mockReturnValue(true);
  });

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
        token: mockToken,
        tokenBalance: mockTokenBalance,
        onMaxPress: mockOnMaxPress,
      });

      expect(getByText('1')).toBeTruthy();
      expect(getByText('2')).toBeTruthy();
      expect(getByText('9')).toBeTruthy();
      expect(getByText('0')).toBeTruthy();
    });

    it('renders QuickPickButtons when tokenBalance is provided', () => {
      const { getByText } = renderAndOpen({
        value: '0',
        currency: 'native',
        decimals: 18,
        onChange: mockOnChange,
        token: mockToken,
        tokenBalance: mockTokenBalance,
        onMaxPress: mockOnMaxPress,
      });

      expect(getByText('25%')).toBeTruthy();
      expect(getByText('50%')).toBeTruthy();
      expect(getByText('75%')).toBeTruthy();
      expect(getByText('Max')).toBeTruthy();
    });

    it('hides QuickPickButtons when tokenBalance is not provided', () => {
      const { queryByText } = renderAndOpen({
        value: '0',
        currency: 'native',
        decimals: 18,
        onChange: mockOnChange,
        token: undefined,
        tokenBalance: undefined,
        onMaxPress: mockOnMaxPress,
      });

      expect(queryByText('25%')).toBeNull();
      expect(queryByText('50%')).toBeNull();
      expect(queryByText('75%')).toBeNull();
      expect(queryByText('Max')).toBeNull();
    });

    it('renders Max button when useShouldRenderMaxOption returns true', () => {
      mockUseShouldRenderMaxOption.mockReturnValue(true);

      const { getByText, queryByText } = renderAndOpen({
        value: '0',
        currency: 'native',
        decimals: 18,
        onChange: mockOnChange,
        token: mockToken,
        tokenBalance: mockTokenBalance,
        onMaxPress: mockOnMaxPress,
      });

      expect(getByText('Max')).toBeTruthy();
      expect(queryByText('90%')).toBeNull();
      expect(mockUseShouldRenderMaxOption).toHaveBeenCalledWith(
        mockToken,
        mockTokenBalance.displayBalance,
        undefined,
      );
    });

    it('renders 90% button when useShouldRenderMaxOption returns false', () => {
      mockUseShouldRenderMaxOption.mockReturnValue(false);

      const { getByText, queryByText } = renderAndOpen({
        value: '0',
        currency: 'native',
        decimals: 18,
        onChange: mockOnChange,
        token: mockToken,
        tokenBalance: mockTokenBalance,
        onMaxPress: mockOnMaxPress,
      });

      expect(getByText('90%')).toBeTruthy();
      expect(queryByText('Max')).toBeNull();
      expect(mockUseShouldRenderMaxOption).toHaveBeenCalledWith(
        mockToken,
        mockTokenBalance.displayBalance,
        undefined,
      );
    });

    it('passes isQuoteSponsored to useShouldRenderMaxOption', () => {
      mockUseShouldRenderMaxOption.mockReturnValue(true);

      const { getByText } = renderAndOpen({
        value: '0',
        currency: 'native',
        decimals: 18,
        onChange: mockOnChange,
        token: mockToken,
        tokenBalance: mockTokenBalance,
        onMaxPress: mockOnMaxPress,
        isQuoteSponsored: true,
      });

      expect(getByText('Max')).toBeTruthy();
      expect(mockUseShouldRenderMaxOption).toHaveBeenCalledWith(
        mockToken,
        mockTokenBalance.displayBalance,
        true,
      );
    });
  });

  describe('keypad interaction', () => {
    it('calls onChange when digit key is pressed', () => {
      const { getByText } = renderAndOpen({
        value: '0',
        currency: 'native',
        decimals: 18,
        onChange: mockOnChange,
        token: mockToken,
        tokenBalance: mockTokenBalance,
        onMaxPress: mockOnMaxPress,
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
        token: mockToken,
        tokenBalance: mockTokenBalance,
        onMaxPress: mockOnMaxPress,
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
          token={mockToken}
          tokenBalance={mockTokenBalance}
          onMaxPress={mockOnMaxPress}
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
          token={mockToken}
          tokenBalance={mockTokenBalance}
          onMaxPress={mockOnMaxPress}
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

  describe('Max button functionality', () => {
    it('calls onMaxPress when Max button is clicked', () => {
      mockUseShouldRenderMaxOption.mockReturnValue(true);

      const { getByText } = renderAndOpen({
        value: '0',
        currency: 'native',
        decimals: 18,
        onChange: mockOnChange,
        token: mockToken,
        tokenBalance: mockTokenBalance,
        onMaxPress: mockOnMaxPress,
      });

      const maxButton = getByText('Max');

      act(() => {
        fireEvent.press(maxButton);
      });

      expect(mockOnMaxPress).toHaveBeenCalledTimes(1);
    });
  });

  describe('edge cases', () => {
    it('handles undefined token gracefully', () => {
      const { getByText } = renderAndOpen({
        value: '0',
        currency: 'native',
        decimals: 18,
        onChange: mockOnChange,
        token: undefined,
        tokenBalance: mockTokenBalance,
        onMaxPress: mockOnMaxPress,
      });

      expect(getByText('1')).toBeTruthy();
      expect(getByText('25%')).toBeTruthy();
    });

    it('handles empty value correctly', () => {
      const { getByText } = renderAndOpen({
        value: '',
        currency: 'native',
        decimals: 18,
        onChange: mockOnChange,
        token: mockToken,
        tokenBalance: mockTokenBalance,
        onMaxPress: mockOnMaxPress,
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
        token: mockToken,
        tokenBalance: mockTokenBalance,
        onMaxPress: mockOnMaxPress,
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
        token: mockToken,
        tokenBalance: mockTokenBalance,
        onMaxPress: mockOnMaxPress,
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

    it('hides QuickPickButtons when tokenBalance is zero', () => {
      const zeroBalance = {
        displayBalance: '0',
        atomicBalance: BigNumber.from('0'),
      };

      const { queryByText } = renderAndOpen({
        value: '0',
        currency: 'native',
        decimals: 18,
        onChange: mockOnChange,
        token: mockToken,
        tokenBalance: zeroBalance,
        onMaxPress: mockOnMaxPress,
      });

      expect(queryByText('25%')).toBeNull();
      expect(queryByText('50%')).toBeNull();
      expect(queryByText('75%')).toBeNull();
      expect(queryByText('Max')).toBeNull();
    });

    it('shows QuickPickButtons when tokenBalance is non-zero', () => {
      const nonZeroBalance = {
        displayBalance: '1.5',
        atomicBalance: BigNumber.from('1500000000000000000'),
      };

      const { getByText } = renderAndOpen({
        value: '0',
        currency: 'native',
        decimals: 18,
        onChange: mockOnChange,
        token: mockToken,
        tokenBalance: nonZeroBalance,
        onMaxPress: mockOnMaxPress,
      });

      expect(getByText('25%')).toBeTruthy();
      expect(getByText('50%')).toBeTruthy();
      expect(getByText('75%')).toBeTruthy();
      expect(getByText('Max')).toBeTruthy();
    });
  });

  describe('Quick pick options with useShouldRenderMaxOption hook', () => {
    it('shows Max button when useShouldRenderMaxOption returns true', () => {
      mockUseShouldRenderMaxOption.mockReturnValue(true);

      const { getByText, queryByText } = renderAndOpen({
        value: '0',
        currency: 'native',
        decimals: 18,
        onChange: mockOnChange,
        token: mockToken,
        tokenBalance: mockTokenBalance,
        onMaxPress: mockOnMaxPress,
      });

      expect(getByText('Max')).toBeTruthy();
      expect(queryByText('90%')).toBeNull();
      expect(mockUseShouldRenderMaxOption).toHaveBeenCalledWith(
        mockToken,
        mockTokenBalance.displayBalance,
        undefined,
      );
    });

    it('shows 90% button when useShouldRenderMaxOption returns false', () => {
      mockUseShouldRenderMaxOption.mockReturnValue(false);

      const { getByText, queryByText } = renderAndOpen({
        value: '0',
        currency: 'native',
        decimals: 18,
        onChange: mockOnChange,
        token: mockToken,
        tokenBalance: mockTokenBalance,
        onMaxPress: mockOnMaxPress,
      });

      expect(getByText('90%')).toBeTruthy();
      expect(queryByText('Max')).toBeNull();
      expect(mockUseShouldRenderMaxOption).toHaveBeenCalledWith(
        mockToken,
        mockTokenBalance.displayBalance,
        undefined,
      );
    });

    it('passes isQuoteSponsored to useShouldRenderMaxOption', () => {
      mockUseShouldRenderMaxOption.mockReturnValue(true);

      const { getByText } = renderAndOpen({
        value: '0',
        currency: 'native',
        decimals: 18,
        onChange: mockOnChange,
        token: mockToken,
        tokenBalance: mockTokenBalance,
        onMaxPress: mockOnMaxPress,
        isQuoteSponsored: true,
      });

      expect(getByText('Max')).toBeTruthy();
      expect(mockUseShouldRenderMaxOption).toHaveBeenCalledWith(
        mockToken,
        mockTokenBalance.displayBalance,
        true,
      );
    });

    it('hides quick pick buttons when displayBalance is zero', () => {
      const zeroBalance = {
        displayBalance: '0',
        atomicBalance: BigNumber.from('0'),
      };
      mockUseShouldRenderMaxOption.mockReturnValue(false);

      const { queryByText } = renderAndOpen({
        value: '0',
        currency: 'native',
        decimals: 18,
        onChange: mockOnChange,
        token: mockToken,
        tokenBalance: zeroBalance,
        onMaxPress: mockOnMaxPress,
      });

      expect(queryByText('25%')).toBeNull();
      expect(queryByText('50%')).toBeNull();
      expect(queryByText('75%')).toBeNull();
      expect(queryByText('Max')).toBeNull();
      expect(queryByText('90%')).toBeNull();
      expect(mockUseShouldRenderMaxOption).toHaveBeenCalledWith(
        mockToken,
        zeroBalance.displayBalance,
        undefined,
      );
    });

    it('quick pick buttons calculate correct percentages with Max button', () => {
      mockUseShouldRenderMaxOption.mockReturnValue(true);

      const { getByText } = renderAndOpen({
        value: '0',
        currency: 'native',
        decimals: 18,
        onChange: mockOnChange,
        token: mockToken,
        tokenBalance: mockTokenBalance,
        onMaxPress: mockOnMaxPress,
      });

      // Test 25% button
      act(() => {
        fireEvent.press(getByText('25%'));
      });

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          value: '25.125', // 25% of 100.5
          valueAsNumber: 25.125,
          pressedKey: Keys.Initial,
        }),
      );

      // Test 50% button
      act(() => {
        fireEvent.press(getByText('50%'));
      });

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          value: '50.25', // 50% of 100.5
          valueAsNumber: 50.25,
          pressedKey: Keys.Initial,
        }),
      );

      // Test 75% button
      act(() => {
        fireEvent.press(getByText('75%'));
      });

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          value: '75.375', // 75% of 100.5
          valueAsNumber: 75.375,
          pressedKey: Keys.Initial,
        }),
      );

      // Test Max button calls onMaxPress
      act(() => {
        fireEvent.press(getByText('Max'));
      });

      expect(mockOnMaxPress).toHaveBeenCalledTimes(1);
    });

    it('quick pick buttons calculate correct percentages with 90% button', () => {
      mockUseShouldRenderMaxOption.mockReturnValue(false);

      const { getByText } = renderAndOpen({
        value: '0',
        currency: 'native',
        decimals: 18,
        onChange: mockOnChange,
        token: mockToken,
        tokenBalance: mockTokenBalance,
        onMaxPress: mockOnMaxPress,
      });

      // Test 90% button
      act(() => {
        fireEvent.press(getByText('90%'));
      });

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          value: '90.45', // 90% of 100.5
          valueAsNumber: 90.45,
          pressedKey: Keys.Initial,
        }),
      );
    });
  });

  describe('onQuickOptionPress defensive guard', () => {
    it('does not call onChange when tokenBalance has no displayBalance', () => {
      // The early return guard in onQuickOptionPress is normally unreachable
      // because QuickPickButtons hides itself when balance is falsy.
      // Force buttons to always render to reach this branch.
      mockForceShowQuickPickButtons = true;

      const ref = createRef<SwapsKeypadRef>();

      const { getByText } = render(
        <SwapsKeypad
          ref={ref}
          value="0"
          currency="native"
          decimals={18}
          onChange={mockOnChange}
          token={mockToken}
          tokenBalance={undefined}
          onMaxPress={mockOnMaxPress}
        />,
      );

      act(() => {
        ref.current?.open();
      });

      // Press a quick pick button - should trigger the early return
      act(() => {
        fireEvent.press(getByText('25%'));
      });

      // onChange should NOT have been called due to early return
      expect(mockOnChange).not.toHaveBeenCalled();

      mockForceShowQuickPickButtons = false;
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
          token={mockToken}
          tokenBalance={mockTokenBalance}
          onMaxPress={mockOnMaxPress}
        />,
      );

      // Nothing should be rendered before open()
      expect(queryByText('1')).toBeNull();
      expect(queryByText('25%')).toBeNull();
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
          token={mockToken}
          tokenBalance={mockTokenBalance}
          onMaxPress={mockOnMaxPress}
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
          token={mockToken}
          tokenBalance={mockTokenBalance}
          onMaxPress={mockOnMaxPress}
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
          token={mockToken}
          tokenBalance={mockTokenBalance}
          onMaxPress={mockOnMaxPress}
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
          token={mockToken}
          tokenBalance={mockTokenBalance}
          onMaxPress={mockOnMaxPress}
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
          token={mockToken}
          tokenBalance={mockTokenBalance}
          onMaxPress={mockOnMaxPress}
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
          token={mockToken}
          tokenBalance={mockTokenBalance}
          onMaxPress={mockOnMaxPress}
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
