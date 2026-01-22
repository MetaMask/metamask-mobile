import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import { SwapsKeypad } from './index';
import { Keys } from '../../../../Base/Keypad';
import { BridgeToken } from '../../types';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { BigNumber } from 'ethers';

// Mock dependencies
jest.mock('../../hooks/useShouldRenderMaxOption', () => ({
  useShouldRenderMaxOption: jest.fn(() => true),
}));

import { useShouldRenderMaxOption } from '../../hooks/useShouldRenderMaxOption';
const mockUseShouldRenderMaxOption =
  useShouldRenderMaxOption as jest.MockedFunction<
    typeof useShouldRenderMaxOption
  >;

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
      const { getByText } = render(
        <SwapsKeypad
          value="0"
          currency="native"
          decimals={18}
          onChange={mockOnChange}
          token={mockToken}
          tokenBalance={mockTokenBalance}
          onMaxPress={mockOnMaxPress}
        />,
      );

      expect(getByText('1')).toBeTruthy();
      expect(getByText('2')).toBeTruthy();
      expect(getByText('9')).toBeTruthy();
      expect(getByText('0')).toBeTruthy();
    });

    it('renders QuickPickButtons when tokenBalance is provided', () => {
      const { getByText } = render(
        <SwapsKeypad
          value="0"
          currency="native"
          decimals={18}
          onChange={mockOnChange}
          token={mockToken}
          tokenBalance={mockTokenBalance}
          onMaxPress={mockOnMaxPress}
        />,
      );

      expect(getByText('25%')).toBeTruthy();
      expect(getByText('50%')).toBeTruthy();
      expect(getByText('75%')).toBeTruthy();
      expect(getByText('Max')).toBeTruthy();
    });

    it('hides QuickPickButtons when tokenBalance is not provided', () => {
      const { queryByText } = render(
        <SwapsKeypad
          value="0"
          currency="native"
          decimals={18}
          onChange={mockOnChange}
          token={mockToken}
          tokenBalance={undefined}
          onMaxPress={mockOnMaxPress}
        />,
      );

      expect(queryByText('25%')).toBeNull();
      expect(queryByText('50%')).toBeNull();
      expect(queryByText('75%')).toBeNull();
      expect(queryByText('Max')).toBeNull();
    });

    it('renders Max button when useShouldRenderMaxOption returns true', () => {
      mockUseShouldRenderMaxOption.mockReturnValue(true);

      const { getByText, queryByText } = render(
        <SwapsKeypad
          value="0"
          currency="native"
          decimals={18}
          onChange={mockOnChange}
          token={mockToken}
          tokenBalance={mockTokenBalance}
          onMaxPress={mockOnMaxPress}
        />,
      );

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

      const { getByText, queryByText } = render(
        <SwapsKeypad
          value="0"
          currency="native"
          decimals={18}
          onChange={mockOnChange}
          token={mockToken}
          tokenBalance={mockTokenBalance}
          onMaxPress={mockOnMaxPress}
        />,
      );

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

      const { getByText } = render(
        <SwapsKeypad
          value="0"
          currency="native"
          decimals={18}
          onChange={mockOnChange}
          token={mockToken}
          tokenBalance={mockTokenBalance}
          onMaxPress={mockOnMaxPress}
          isQuoteSponsored
        />,
      );

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
      const { getByText } = render(
        <SwapsKeypad
          value="0"
          currency="native"
          decimals={18}
          onChange={mockOnChange}
          token={mockToken}
          tokenBalance={mockTokenBalance}
          onMaxPress={mockOnMaxPress}
        />,
      );

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
      const { getByText } = render(
        <SwapsKeypad
          value="5"
          currency="native"
          decimals={18}
          onChange={mockOnChange}
          token={mockToken}
          tokenBalance={mockTokenBalance}
          onMaxPress={mockOnMaxPress}
        />,
      );

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
      const { getByText, rerender } = render(
        <SwapsKeypad
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
        fireEvent.press(getByText('1'));
      });

      expect(mockOnChange).toHaveBeenCalledWith({
        value: '1',
        valueAsNumber: 1,
        pressedKey: Keys.Digit1,
      });

      rerender(
        <SwapsKeypad
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

      const { getByText } = render(
        <SwapsKeypad
          value="0"
          currency="native"
          decimals={18}
          onChange={mockOnChange}
          token={mockToken}
          tokenBalance={mockTokenBalance}
          onMaxPress={mockOnMaxPress}
        />,
      );

      const maxButton = getByText('Max');

      act(() => {
        fireEvent.press(maxButton);
      });

      expect(mockOnMaxPress).toHaveBeenCalledTimes(1);
    });
  });

  describe('edge cases', () => {
    it('handles undefined token gracefully', () => {
      const { getByText } = render(
        <SwapsKeypad
          value="0"
          currency="native"
          decimals={18}
          onChange={mockOnChange}
          token={undefined}
          tokenBalance={mockTokenBalance}
          onMaxPress={mockOnMaxPress}
        />,
      );

      expect(getByText('1')).toBeTruthy();
      expect(getByText('25%')).toBeTruthy();
    });

    it('handles empty value correctly', () => {
      const { getByText } = render(
        <SwapsKeypad
          value=""
          currency="native"
          decimals={18}
          onChange={mockOnChange}
          token={mockToken}
          tokenBalance={mockTokenBalance}
          onMaxPress={mockOnMaxPress}
        />,
      );

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
      const { getByText } = render(
        <SwapsKeypad
          value="0"
          currency="USD"
          decimals={2}
          onChange={mockOnChange}
          token={mockToken}
          tokenBalance={mockTokenBalance}
          onMaxPress={mockOnMaxPress}
        />,
      );

      act(() => {
        fireEvent.press(getByText('5'));
      });

      expect(mockOnChange).toHaveBeenCalled();
    });

    it('handles different decimal values correctly', () => {
      const { getByText } = render(
        <SwapsKeypad
          value="0"
          currency="native"
          decimals={6}
          onChange={mockOnChange}
          token={mockToken}
          tokenBalance={mockTokenBalance}
          onMaxPress={mockOnMaxPress}
        />,
      );

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

      const { queryByText } = render(
        <SwapsKeypad
          value="0"
          currency="native"
          decimals={18}
          onChange={mockOnChange}
          token={mockToken}
          tokenBalance={zeroBalance}
          onMaxPress={mockOnMaxPress}
        />,
      );

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

      const { getByText } = render(
        <SwapsKeypad
          value="0"
          currency="native"
          decimals={18}
          onChange={mockOnChange}
          token={mockToken}
          tokenBalance={nonZeroBalance}
          onMaxPress={mockOnMaxPress}
        />,
      );

      expect(getByText('25%')).toBeTruthy();
      expect(getByText('50%')).toBeTruthy();
      expect(getByText('75%')).toBeTruthy();
      expect(getByText('Max')).toBeTruthy();
    });
  });

  describe('Quick pick options with useShouldRenderMaxOption hook', () => {
    it('shows Max button when useShouldRenderMaxOption returns true', () => {
      mockUseShouldRenderMaxOption.mockReturnValue(true);

      const { getByText, queryByText } = render(
        <SwapsKeypad
          value="0"
          currency="native"
          decimals={18}
          onChange={mockOnChange}
          token={mockToken}
          tokenBalance={mockTokenBalance}
          onMaxPress={mockOnMaxPress}
        />,
      );

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

      const { getByText, queryByText } = render(
        <SwapsKeypad
          value="0"
          currency="native"
          decimals={18}
          onChange={mockOnChange}
          token={mockToken}
          tokenBalance={mockTokenBalance}
          onMaxPress={mockOnMaxPress}
        />,
      );

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

      const { getByText } = render(
        <SwapsKeypad
          value="0"
          currency="native"
          decimals={18}
          onChange={mockOnChange}
          token={mockToken}
          tokenBalance={mockTokenBalance}
          onMaxPress={mockOnMaxPress}
          isQuoteSponsored
        />,
      );

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

      const { queryByText } = render(
        <SwapsKeypad
          value="0"
          currency="native"
          decimals={18}
          onChange={mockOnChange}
          token={mockToken}
          tokenBalance={zeroBalance}
          onMaxPress={mockOnMaxPress}
        />,
      );

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

      const { getByText } = render(
        <SwapsKeypad
          value="0"
          currency="native"
          decimals={18}
          onChange={mockOnChange}
          token={mockToken}
          tokenBalance={mockTokenBalance}
          onMaxPress={mockOnMaxPress}
        />,
      );

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

      const { getByText } = render(
        <SwapsKeypad
          value="0"
          currency="native"
          decimals={18}
          onChange={mockOnChange}
          token={mockToken}
          tokenBalance={mockTokenBalance}
          onMaxPress={mockOnMaxPress}
        />,
      );

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
});
