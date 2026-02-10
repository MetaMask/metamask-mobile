import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import { GaslessQuickPickOptions } from './index';
import { Keys } from '../../../../Base/Keypad';
import { BridgeToken } from '../../types';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { BigNumber } from 'ethers';

// Mock useLatestBalance to control tokenBalance in tests
jest.mock('../../hooks/useLatestBalance', () => ({
  useLatestBalance: jest.fn(),
}));

// Mock useShouldRenderMaxOption
jest.mock('../../hooks/useShouldRenderMaxOption', () => ({
  useShouldRenderMaxOption: jest.fn(() => true),
}));

import { useLatestBalance } from '../../hooks/useLatestBalance';
import { useShouldRenderMaxOption } from '../../hooks/useShouldRenderMaxOption';

const mockUseLatestBalance = useLatestBalance as jest.MockedFunction<
  typeof useLatestBalance
>;
const mockUseShouldRenderMaxOption =
  useShouldRenderMaxOption as jest.MockedFunction<
    typeof useShouldRenderMaxOption
  >;

describe('GaslessQuickPickOptions', () => {
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
    mockUseLatestBalance.mockReset();
    mockUseLatestBalance.mockReturnValue(mockTokenBalance);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('rendering', () => {
    it('renders QuickPickButtons when tokenBalance is provided', () => {
      const { getByText } = render(
        <GaslessQuickPickOptions
          onChange={mockOnChange}
          token={mockToken}
          onMaxPress={mockOnMaxPress}
        />,
      );

      expect(getByText('25%')).toBeTruthy();
      expect(getByText('50%')).toBeTruthy();
      expect(getByText('75%')).toBeTruthy();
      expect(getByText('Max')).toBeTruthy();
    });

    it('hides QuickPickButtons when tokenBalance is not provided', () => {
      mockUseLatestBalance.mockReturnValue(undefined);

      const { queryByText } = render(
        <GaslessQuickPickOptions
          onChange={mockOnChange}
          token={undefined}
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
        <GaslessQuickPickOptions
          onChange={mockOnChange}
          token={mockToken}
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
        <GaslessQuickPickOptions
          onChange={mockOnChange}
          token={mockToken}
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
        <GaslessQuickPickOptions
          onChange={mockOnChange}
          token={mockToken}
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

  describe('Max button functionality', () => {
    it('calls onMaxPress when Max button is clicked', () => {
      mockUseShouldRenderMaxOption.mockReturnValue(true);

      const { getByText } = render(
        <GaslessQuickPickOptions
          onChange={mockOnChange}
          token={mockToken}
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
    it('hides QuickPickButtons when tokenBalance is zero', () => {
      const zeroBalance = {
        displayBalance: '0',
        atomicBalance: BigNumber.from('0'),
      };
      mockUseLatestBalance.mockReturnValue(zeroBalance);

      const { queryByText } = render(
        <GaslessQuickPickOptions
          onChange={mockOnChange}
          token={mockToken}
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
      mockUseLatestBalance.mockReturnValue(nonZeroBalance);

      const { getByText } = render(
        <GaslessQuickPickOptions
          onChange={mockOnChange}
          token={mockToken}
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
        <GaslessQuickPickOptions
          onChange={mockOnChange}
          token={mockToken}
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
        <GaslessQuickPickOptions
          onChange={mockOnChange}
          token={mockToken}
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
        <GaslessQuickPickOptions
          onChange={mockOnChange}
          token={mockToken}
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
      mockUseLatestBalance.mockReturnValue(zeroBalance);
      mockUseShouldRenderMaxOption.mockReturnValue(false);

      const { queryByText } = render(
        <GaslessQuickPickOptions
          onChange={mockOnChange}
          token={mockToken}
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
        <GaslessQuickPickOptions
          onChange={mockOnChange}
          token={mockToken}
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
        <GaslessQuickPickOptions
          onChange={mockOnChange}
          token={mockToken}
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

  describe('onQuickOptionPress defensive guard', () => {
    it('does not call onChange when tokenBalance has no displayBalance', () => {
      // Force buttons to show even when balance is falsy by mocking
      // QuickPickButtons to ignore the `show` prop
      mockUseLatestBalance.mockReturnValue(undefined);

      const { queryByText } = render(
        <GaslessQuickPickOptions
          onChange={mockOnChange}
          token={mockToken}
          onMaxPress={mockOnMaxPress}
        />,
      );

      // When tokenBalance is undefined, shouldRenderQuickPickOptions will be false,
      // so QuickPickButtons won't render
      expect(queryByText('25%')).toBeNull();

      // onChange should NOT have been called
      expect(mockOnChange).not.toHaveBeenCalled();
    });
  });
});
