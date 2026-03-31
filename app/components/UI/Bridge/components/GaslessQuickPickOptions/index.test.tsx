import React from 'react';
import { act, fireEvent } from '@testing-library/react-native';
import { GaslessQuickPickOptions } from './index';
import { BridgeToken } from '../../types';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import renderWithProvider from '../../../../../util/test/renderWithProvider';

jest.mock('../../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      BridgeController: {
        trackUnifiedSwapBridgeEvent: jest.fn(),
      },
    },
  },
}));

jest.mock('../../hooks/useShouldRenderMaxOption', () => ({
  useShouldRenderMaxOption: jest.fn(() => true),
}));

jest.mock('../../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: jest.fn(),
}));

import { useShouldRenderMaxOption } from '../../hooks/useShouldRenderMaxOption';

const mockUseShouldRenderMaxOption =
  useShouldRenderMaxOption as jest.MockedFunction<
    typeof useShouldRenderMaxOption
  >;
const mockUseAnalytics = useAnalytics as jest.MockedFunction<
  typeof useAnalytics
>;
const actualUseAnalytics: typeof useAnalytics = jest.requireActual(
  '../../../../hooks/useAnalytics/useAnalytics',
).useAnalytics;
const renderWithRedux = (component: React.ReactElement) =>
  renderWithProvider(component, undefined, false);

describe('GaslessQuickPickOptions', () => {
  const mockOnAmountSelect = jest.fn();
  const mockOnMaxPress = jest.fn();

  const mockToken: BridgeToken = {
    address: '0x1234567890123456789012345678901234567890',
    symbol: 'TEST',
    decimals: 18,
    chainId: CHAIN_IDS.MAINNET,
  };

  const mockTokenBalance = '100.5';

  beforeEach(() => {
    mockUseShouldRenderMaxOption.mockReset();
    mockUseShouldRenderMaxOption.mockReturnValue(true);
    mockUseAnalytics.mockImplementation(() => ({
      ...actualUseAnalytics(),
      trackEvent: jest.fn(),
    }));
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('rendering', () => {
    it('renders QuickPickButtons when tokenBalance is provided', () => {
      const { getByText } = renderWithRedux(
        <GaslessQuickPickOptions
          onAmountSelect={mockOnAmountSelect}
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

    it('renders QuickPickButtons even when tokenBalance is not provided', () => {
      const { getByText } = renderWithRedux(
        <GaslessQuickPickOptions
          onAmountSelect={mockOnAmountSelect}
          token={undefined}
          tokenBalance={undefined}
          onMaxPress={mockOnMaxPress}
        />,
      );

      expect(getByText('25%')).toBeTruthy();
      expect(getByText('50%')).toBeTruthy();
      expect(getByText('75%')).toBeTruthy();
      expect(getByText('Max')).toBeTruthy();
    });

    it('renders Max button when useShouldRenderMaxOption returns true', () => {
      mockUseShouldRenderMaxOption.mockReturnValue(true);

      const { getByText, queryByText } = renderWithRedux(
        <GaslessQuickPickOptions
          onAmountSelect={mockOnAmountSelect}
          token={mockToken}
          tokenBalance={mockTokenBalance}
          onMaxPress={mockOnMaxPress}
        />,
      );

      expect(getByText('Max')).toBeTruthy();
      expect(queryByText('90%')).toBeNull();
      expect(mockUseShouldRenderMaxOption).toHaveBeenCalledWith(
        mockToken,
        mockTokenBalance,
        undefined,
      );
    });

    it('renders 90% button when useShouldRenderMaxOption returns false', () => {
      mockUseShouldRenderMaxOption.mockReturnValue(false);

      const { getByText, queryByText } = renderWithRedux(
        <GaslessQuickPickOptions
          onAmountSelect={mockOnAmountSelect}
          token={mockToken}
          tokenBalance={mockTokenBalance}
          onMaxPress={mockOnMaxPress}
        />,
      );

      expect(getByText('90%')).toBeTruthy();
      expect(queryByText('Max')).toBeNull();
      expect(mockUseShouldRenderMaxOption).toHaveBeenCalledWith(
        mockToken,
        mockTokenBalance,
        undefined,
      );
    });

    it('passes isQuoteSponsored to useShouldRenderMaxOption', () => {
      mockUseShouldRenderMaxOption.mockReturnValue(true);

      const { getByText } = renderWithRedux(
        <GaslessQuickPickOptions
          onAmountSelect={mockOnAmountSelect}
          token={mockToken}
          tokenBalance={mockTokenBalance}
          onMaxPress={mockOnMaxPress}
          isQuoteSponsored
        />,
      );

      expect(getByText('Max')).toBeTruthy();
      expect(mockUseShouldRenderMaxOption).toHaveBeenCalledWith(
        mockToken,
        mockTokenBalance,
        true,
      );
    });
  });

  describe('Max button functionality', () => {
    it('calls onMaxPress when Max button is clicked', () => {
      mockUseShouldRenderMaxOption.mockReturnValue(true);

      const { getByText } = renderWithRedux(
        <GaslessQuickPickOptions
          onAmountSelect={mockOnAmountSelect}
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
    it('renders QuickPickButtons even when tokenBalance is zero', () => {
      const zeroBalance = '0';

      const { getByText } = renderWithRedux(
        <GaslessQuickPickOptions
          onAmountSelect={mockOnAmountSelect}
          token={mockToken}
          tokenBalance={zeroBalance}
          onMaxPress={mockOnMaxPress}
        />,
      );

      expect(getByText('25%')).toBeTruthy();
      expect(getByText('50%')).toBeTruthy();
      expect(getByText('75%')).toBeTruthy();
      expect(getByText('Max')).toBeTruthy();
    });

    it('shows QuickPickButtons when tokenBalance is non-zero', () => {
      const nonZeroBalance = '1.5';

      const { getByText } = renderWithRedux(
        <GaslessQuickPickOptions
          onAmountSelect={mockOnAmountSelect}
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

      const { getByText, queryByText } = renderWithRedux(
        <GaslessQuickPickOptions
          onAmountSelect={mockOnAmountSelect}
          token={mockToken}
          tokenBalance={mockTokenBalance}
          onMaxPress={mockOnMaxPress}
        />,
      );

      expect(getByText('Max')).toBeTruthy();
      expect(queryByText('90%')).toBeNull();
      expect(mockUseShouldRenderMaxOption).toHaveBeenCalledWith(
        mockToken,
        mockTokenBalance,
        undefined,
      );
    });

    it('shows 90% button when useShouldRenderMaxOption returns false', () => {
      mockUseShouldRenderMaxOption.mockReturnValue(false);

      const { getByText, queryByText } = renderWithRedux(
        <GaslessQuickPickOptions
          onAmountSelect={mockOnAmountSelect}
          token={mockToken}
          tokenBalance={mockTokenBalance}
          onMaxPress={mockOnMaxPress}
        />,
      );

      expect(getByText('90%')).toBeTruthy();
      expect(queryByText('Max')).toBeNull();
      expect(mockUseShouldRenderMaxOption).toHaveBeenCalledWith(
        mockToken,
        mockTokenBalance,
        undefined,
      );
    });

    it('passes isQuoteSponsored to useShouldRenderMaxOption', () => {
      mockUseShouldRenderMaxOption.mockReturnValue(true);

      const { getByText } = renderWithRedux(
        <GaslessQuickPickOptions
          onAmountSelect={mockOnAmountSelect}
          token={mockToken}
          tokenBalance={mockTokenBalance}
          onMaxPress={mockOnMaxPress}
          isQuoteSponsored
        />,
      );

      expect(getByText('Max')).toBeTruthy();
      expect(mockUseShouldRenderMaxOption).toHaveBeenCalledWith(
        mockToken,
        mockTokenBalance,
        true,
      );
    });

    it('renders quick pick buttons even when displayBalance is zero', () => {
      const zeroBalance = '0';
      mockUseShouldRenderMaxOption.mockReturnValue(false);

      const { getByText } = renderWithRedux(
        <GaslessQuickPickOptions
          onAmountSelect={mockOnAmountSelect}
          token={mockToken}
          tokenBalance={zeroBalance}
          onMaxPress={mockOnMaxPress}
        />,
      );

      expect(getByText('25%')).toBeTruthy();
      expect(getByText('50%')).toBeTruthy();
      expect(getByText('75%')).toBeTruthy();
      expect(getByText('90%')).toBeTruthy();
      expect(mockUseShouldRenderMaxOption).toHaveBeenCalledWith(
        mockToken,
        zeroBalance,
        undefined,
      );
    });

    it('quick pick buttons calculate correct percentages with Max button', () => {
      mockUseShouldRenderMaxOption.mockReturnValue(true);

      const { getByText } = renderWithRedux(
        <GaslessQuickPickOptions
          onAmountSelect={mockOnAmountSelect}
          token={mockToken}
          tokenBalance={mockTokenBalance}
          onMaxPress={mockOnMaxPress}
        />,
      );

      act(() => {
        fireEvent.press(getByText('25%'));
      });

      expect(mockOnAmountSelect).toHaveBeenCalledWith('25.125');

      act(() => {
        fireEvent.press(getByText('50%'));
      });

      expect(mockOnAmountSelect).toHaveBeenCalledWith('50.25');

      act(() => {
        fireEvent.press(getByText('75%'));
      });

      expect(mockOnAmountSelect).toHaveBeenCalledWith('75.375');

      act(() => {
        fireEvent.press(getByText('Max'));
      });

      expect(mockOnMaxPress).toHaveBeenCalledTimes(1);
    });

    it('quick pick buttons calculate correct percentages with 90% button', () => {
      mockUseShouldRenderMaxOption.mockReturnValue(false);

      const { getByText } = renderWithRedux(
        <GaslessQuickPickOptions
          onAmountSelect={mockOnAmountSelect}
          token={mockToken}
          tokenBalance={mockTokenBalance}
          onMaxPress={mockOnMaxPress}
        />,
      );

      act(() => {
        fireEvent.press(getByText('90%'));
      });

      expect(mockOnAmountSelect).toHaveBeenCalledWith('90.45');
    });
  });

  describe('onQuickOptionPress defensive guard', () => {
    it('does not call onAmountSelect when tokenBalance has no displayBalance', () => {
      const { getByText } = renderWithRedux(
        <GaslessQuickPickOptions
          onAmountSelect={mockOnAmountSelect}
          token={mockToken}
          tokenBalance={undefined}
          onMaxPress={mockOnMaxPress}
        />,
      );

      expect(getByText('25%')).toBeTruthy();

      act(() => {
        fireEvent.press(getByText('25%'));
      });

      expect(mockOnAmountSelect).not.toHaveBeenCalled();
    });
  });
});
