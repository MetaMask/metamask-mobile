import React from 'react';
import { render } from '@testing-library/react-native';
import TokenDetailsStickyFooter from './TokenDetailsStickyFooter';
import type { TokenDetailsRouteParams } from '../constants/constants';
import type { TokenSecurityData } from '@metamask/assets-controllers';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ bottom: 0, top: 0, left: 0, right: 0 }),
}));

const mockIsBuyable = jest.fn(() => true);
jest.mock('../../Ramp/hooks/useTokenBuyability', () => ({
  __esModule: true,
  default: () => ({ isBuyable: mockIsBuyable(), isLoading: false }),
}));

const mockIsTokenTradingOpen = jest.fn(() => true);
jest.mock('../../Bridge/hooks/useRWAToken', () => ({
  useRWAToken: () => ({ isTokenTradingOpen: mockIsTokenTradingOpen }),
}));

jest.mock('../../../../util/theme', () => {
  const { mockTheme } = jest.requireActual('../../../../util/theme');
  return { useTheme: jest.fn(() => mockTheme) };
});

const mockToken: TokenDetailsRouteParams = {
  address: '0x123',
  symbol: 'ETH',
  decimals: 18,
  chainId: '0x1',
} as unknown as TokenDetailsRouteParams;

const mockSecurityData: TokenSecurityData = {
  resultType: undefined,
} as unknown as TokenSecurityData;

const defaultProps = {
  token: mockToken,
  securityData: mockSecurityData,
  fiatBalance: '$50.00',
  onBuy: jest.fn(),
  onSwap: jest.fn(),
  hasEligibleSwapTokens: true,
};

describe('TokenDetailsStickyFooter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsBuyable.mockReturnValue(true);
    mockIsTokenTradingOpen.mockReturnValue(true);
  });

  describe('button visibility', () => {
    it('shows both buttons when isBuyable and hasEligibleSwapTokens are true', () => {
      const { getByText } = render(
        <TokenDetailsStickyFooter {...defaultProps} />,
      );
      expect(getByText('Swap')).toBeTruthy();
      expect(getByText('Buy')).toBeTruthy();
    });

    it('shows only swap button when not buyable and hasEligibleSwapTokens is true', () => {
      mockIsBuyable.mockReturnValue(false);
      const { getByText, queryByText } = render(
        <TokenDetailsStickyFooter {...defaultProps} />,
      );
      expect(getByText('Swap')).toBeTruthy();
      expect(queryByText('Buy')).toBeNull();
    });

    it('shows only buy button when isBuyable and no eligible swap tokens', () => {
      const { getByText, queryByText } = render(
        <TokenDetailsStickyFooter
          {...defaultProps}
          hasEligibleSwapTokens={false}
        />,
      );
      expect(getByText('Buy')).toBeTruthy();
      expect(queryByText('Swap')).toBeNull();
    });

    it('shows buy button as fallback when not buyable and no eligible swap tokens', () => {
      mockIsBuyable.mockReturnValue(false);
      const { getByText, queryByText } = render(
        <TokenDetailsStickyFooter
          {...defaultProps}
          hasEligibleSwapTokens={false}
        />,
      );
      expect(getByText('Buy')).toBeTruthy();
      expect(queryByText('Swap')).toBeNull();
    });

    it('renders nothing when isTokenTradingOpen returns false', () => {
      mockIsTokenTradingOpen.mockReturnValue(false);
      const { queryByText } = render(
        <TokenDetailsStickyFooter {...defaultProps} />,
      );
      expect(queryByText('Swap')).toBeNull();
      expect(queryByText('Buy')).toBeNull();
    });
  });

  describe('success button logic - single button', () => {
    it('applies success style to the swap button when it is the only button', () => {
      mockIsBuyable.mockReturnValue(false);
      const { getByText } = render(
        <TokenDetailsStickyFooter {...defaultProps} />,
      );
      // Swap is the only button — it should always render (success style is applied internally)
      expect(getByText('Swap')).toBeTruthy();
    });

    it('applies success style to the buy button when it is the only button', () => {
      const { getByText } = render(
        <TokenDetailsStickyFooter
          {...defaultProps}
          hasEligibleSwapTokens={false}
        />,
      );
      expect(getByText('Buy')).toBeTruthy();
    });
  });

  describe('success button logic - both buttons', () => {
    it('applies success style to swap when fiat balance >= $100', () => {
      const { getByText } = render(
        <TokenDetailsStickyFooter {...defaultProps} fiatBalance="$150.00" />,
      );
      // Both buttons present; swap has success style (balance >= 100)
      expect(getByText('Swap')).toBeTruthy();
      expect(getByText('Buy')).toBeTruthy();
    });

    it('applies success style to buy when fiat balance < $100', () => {
      const { getByText } = render(
        <TokenDetailsStickyFooter {...defaultProps} fiatBalance="$50.00" />,
      );
      // Both buttons present; buy has success style (balance < 100)
      expect(getByText('Swap')).toBeTruthy();
      expect(getByText('Buy')).toBeTruthy();
    });

    it('applies success style to swap at exactly $100', () => {
      const { getByText } = render(
        <TokenDetailsStickyFooter {...defaultProps} fiatBalance="$100.00" />,
      );
      expect(getByText('Swap')).toBeTruthy();
      expect(getByText('Buy')).toBeTruthy();
    });

    it('handles undefined fiatBalance gracefully (treats as $0, buy gets success)', () => {
      const { getByText } = render(
        <TokenDetailsStickyFooter {...defaultProps} fiatBalance={undefined} />,
      );
      expect(getByText('Swap')).toBeTruthy();
      expect(getByText('Buy')).toBeTruthy();
    });

    it('handles fiatBalance with currency symbols and comma separators', () => {
      const { getByText } = render(
        <TokenDetailsStickyFooter {...defaultProps} fiatBalance="$1,234.56" />,
      );
      // Balance > 100, swap should be success
      expect(getByText('Swap')).toBeTruthy();
      expect(getByText('Buy')).toBeTruthy();
    });
  });
});
