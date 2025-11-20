import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import { SwapsKeypad } from './index';
import { Keys } from '../../../../Base/Keypad';
import { BridgeToken } from '../../types';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { BigNumber } from 'ethers';
import { useSelector } from 'react-redux';
import { useTokenAddress } from '../../hooks/useTokenAddress';
import { isNativeAddress } from '@metamask/bridge-controller';

// Mock dependencies
jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../hooks/useTokenAddress', () => ({
  useTokenAddress: jest.fn(),
}));

jest.mock('@metamask/bridge-controller', () => ({
  isNativeAddress: jest.fn(),
}));

jest.mock('../../../../../core/redux/slices/bridge', () => ({
  selectIsGaslessSwapEnabled: jest.fn(),
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockUseTokenAddress = useTokenAddress as jest.MockedFunction<
  typeof useTokenAddress
>;
const mockIsNativeAddress = isNativeAddress as jest.MockedFunction<
  typeof isNativeAddress
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
    jest.clearAllMocks();
    mockUseSelector.mockReturnValue(false);
    mockUseTokenAddress.mockReturnValue(mockToken.address);
    mockIsNativeAddress.mockReturnValue(false);
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

    it('renders Max button for gasless swap enabled', () => {
      mockUseSelector.mockReturnValue(true);

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
    });

    it('renders Max button for non-native token', () => {
      mockIsNativeAddress.mockReturnValue(false);

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
    });

    it('renders 90% button for native token without gasless swap', () => {
      mockIsNativeAddress.mockReturnValue(true);
      mockUseSelector.mockImplementation(() => false);

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
      mockIsNativeAddress.mockReturnValue(false);

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

    it('renders Max button when gasless swap is enabled for native token', () => {
      mockIsNativeAddress.mockReturnValue(true);
      mockUseSelector.mockImplementation((selector) => {
        if (typeof selector === 'function') {
          return true;
        }
        return undefined;
      });

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

      expect(getByText('Max')).toBeTruthy();
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

  describe('quick pick button selection logic', () => {
    it('selects gasless quick pick options when not native asset', () => {
      mockIsNativeAddress.mockReturnValue(false);
      mockUseSelector.mockImplementation(() => false);

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

      expect(getByText('Max')).toBeTruthy();
    });

    it('selects standard quick pick options when native asset and gasless disabled', () => {
      mockIsNativeAddress.mockReturnValue(true);
      mockUseSelector.mockImplementation(() => false);

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

      expect(getByText('90%')).toBeTruthy();
    });

    it('selects gasless quick pick options when native asset but gasless enabled', () => {
      mockIsNativeAddress.mockReturnValue(true);
      mockUseSelector.mockImplementation((selector) => {
        if (typeof selector === 'function') {
          return true;
        }
        return undefined;
      });

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

      expect(getByText('Max')).toBeTruthy();
    });
  });

  describe('token address handling', () => {
    it('uses correct token address from useTokenAddress hook', () => {
      const customAddress = '0xabcdef1234567890abcdef1234567890abcdef12';
      mockUseTokenAddress.mockReturnValue(customAddress);

      render(
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

      expect(mockUseTokenAddress).toHaveBeenCalledWith(mockToken);
      expect(mockIsNativeAddress).toHaveBeenCalledWith(customAddress);
    });

    it('handles token address changes correctly', () => {
      const { rerender } = render(
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

      const newToken = { ...mockToken, address: '0xnewaddress' };
      mockUseTokenAddress.mockReturnValue(newToken.address);

      rerender(
        <SwapsKeypad
          value="0"
          currency="native"
          decimals={18}
          onChange={mockOnChange}
          token={newToken}
          tokenBalance={mockTokenBalance}
          onMaxPress={mockOnMaxPress}
        />,
      );

      expect(mockUseTokenAddress).toHaveBeenCalledWith(newToken);
    });
  });
});
