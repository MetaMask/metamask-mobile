import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import TokenDetailsStickyFooter from './TokenDetailsStickyFooter';
import {
  STICKY_FOOTER_SWAP_LABEL_VARIANTS,
  StickyFooterSwapLabelVariant,
} from './abTestConfig';
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
const mockIsStockToken = jest.fn(() => false);
jest.mock('../../Bridge/hooks/useRWAToken', () => ({
  useRWAToken: () => ({
    isTokenTradingOpen: mockIsTokenTradingOpen,
    isStockToken: mockIsStockToken,
  }),
}));

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(() => undefined),
}));

jest.mock('../../../../reducers/fiatOrders', () => ({
  getDetectedGeolocation: jest.fn(),
}));

jest.mock('../../../../util/ondoGeoRestrictions', () => ({
  ONDO_RESTRICTED_COUNTRIES: new Set(['US', 'GB']),
}));

jest.mock('./RwaUnavailableBottomSheet/RwaUnavailableBottomSheet', () => ({
  __esModule: true,
  default: jest.fn(() => null),
}));

jest.mock('../../../../util/theme', () => {
  const { mockTheme } = jest.requireActual('../../../../util/theme');
  return { useTheme: jest.fn(() => mockTheme) };
});

const mockUseABTest = jest.fn();
jest.mock('../../../../hooks/useABTest', () => ({
  useABTest: (...args: unknown[]) => mockUseABTest(...args),
}));

const mockTrackStickyFooterTapped = jest.fn();
jest.mock('../hooks/useStickyFooterTracking', () => ({
  useStickyFooterTracking: () => mockTrackStickyFooterTapped,
}));

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
  balanceFiatUsd: 50,
  onBuy: jest.fn(),
  onSwap: jest.fn(),
  hasEligibleSwapTokens: true,
};

describe('TokenDetailsStickyFooter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsBuyable.mockReturnValue(true);
    mockIsTokenTradingOpen.mockReturnValue(true);
    mockUseABTest.mockReturnValue({
      variant:
        STICKY_FOOTER_SWAP_LABEL_VARIANTS[StickyFooterSwapLabelVariant.Control],
      variantName: StickyFooterSwapLabelVariant.Control,
      isActive: false,
    });
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

  describe('onStickyButtonsResolved callback', () => {
    it('reports "both" when both buttons are shown', () => {
      const onStickyButtonsResolved = jest.fn();
      render(
        <TokenDetailsStickyFooter
          {...defaultProps}
          onStickyButtonsResolved={onStickyButtonsResolved}
        />,
      );
      expect(onStickyButtonsResolved).toHaveBeenCalledWith('both');
    });

    it('reports "swap" when only swap is shown', () => {
      mockIsBuyable.mockReturnValue(false);
      const onStickyButtonsResolved = jest.fn();
      render(
        <TokenDetailsStickyFooter
          {...defaultProps}
          onStickyButtonsResolved={onStickyButtonsResolved}
        />,
      );
      expect(onStickyButtonsResolved).toHaveBeenCalledWith('swap');
    });

    it('reports "buy" when only buy is shown', () => {
      const onStickyButtonsResolved = jest.fn();
      render(
        <TokenDetailsStickyFooter
          {...defaultProps}
          hasEligibleSwapTokens={false}
          onStickyButtonsResolved={onStickyButtonsResolved}
        />,
      );
      expect(onStickyButtonsResolved).toHaveBeenCalledWith('buy');
    });

    it('reports null when trading is not open', () => {
      mockIsTokenTradingOpen.mockReturnValue(false);
      const onStickyButtonsResolved = jest.fn();
      render(
        <TokenDetailsStickyFooter
          {...defaultProps}
          onStickyButtonsResolved={onStickyButtonsResolved}
        />,
      );
      expect(onStickyButtonsResolved).toHaveBeenCalledWith(null);
    });
  });

  describe('success button logic - single button', () => {
    it('applies success style to the swap button when it is the only button', () => {
      mockIsBuyable.mockReturnValue(false);
      const { getByText } = render(
        <TokenDetailsStickyFooter {...defaultProps} />,
      );
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
    it('applies success style to swap when balance >= $100', () => {
      const { getByText } = render(
        <TokenDetailsStickyFooter {...defaultProps} balanceFiatUsd={150} />,
      );
      expect(getByText('Swap')).toBeTruthy();
      expect(getByText('Buy')).toBeTruthy();
    });

    it('applies success style to buy when balance < $100', () => {
      const { getByText } = render(
        <TokenDetailsStickyFooter {...defaultProps} balanceFiatUsd={50} />,
      );
      expect(getByText('Swap')).toBeTruthy();
      expect(getByText('Buy')).toBeTruthy();
    });

    it('applies success style to swap at exactly $100', () => {
      const { getByText } = render(
        <TokenDetailsStickyFooter {...defaultProps} balanceFiatUsd={100} />,
      );
      expect(getByText('Swap')).toBeTruthy();
      expect(getByText('Buy')).toBeTruthy();
    });

    it('handles undefined balanceFiatUsd gracefully (treats as $0, buy gets success)', () => {
      const { getByText } = render(
        <TokenDetailsStickyFooter
          {...defaultProps}
          balanceFiatUsd={undefined}
        />,
      );
      expect(getByText('Swap')).toBeTruthy();
      expect(getByText('Buy')).toBeTruthy();
    });
  });

  describe('A/B test variants - swap button label', () => {
    it('control variant shows "Swap" label', () => {
      mockUseABTest.mockReturnValue({
        variant:
          STICKY_FOOTER_SWAP_LABEL_VARIANTS[
            StickyFooterSwapLabelVariant.Control
          ],
        variantName: StickyFooterSwapLabelVariant.Control,
        isActive: true,
      });
      const { getByText } = render(
        <TokenDetailsStickyFooter {...defaultProps} />,
      );
      expect(getByText('Swap')).toBeTruthy();
    });

    it('convert variant shows "Convert" label on swap button', () => {
      mockUseABTest.mockReturnValue({
        variant:
          STICKY_FOOTER_SWAP_LABEL_VARIANTS[
            StickyFooterSwapLabelVariant.Treatment
          ],
        variantName: StickyFooterSwapLabelVariant.Treatment,
        isActive: true,
      });
      const { getByText, queryByText } = render(
        <TokenDetailsStickyFooter {...defaultProps} />,
      );
      expect(getByText('Convert')).toBeTruthy();
      expect(queryByText('Swap')).toBeNull();
    });

    it('falls back to "Swap" label when flag is not active', () => {
      mockUseABTest.mockReturnValue({
        variant:
          STICKY_FOOTER_SWAP_LABEL_VARIANTS[
            StickyFooterSwapLabelVariant.Control
          ],
        variantName: StickyFooterSwapLabelVariant.Control,
        isActive: false,
      });
      const { getByText } = render(
        <TokenDetailsStickyFooter {...defaultProps} />,
      );
      expect(getByText('Swap')).toBeTruthy();
    });
  });

  describe('Sticky Footer Button Tapped tracking', () => {
    it('tracks swap button tap with hasMoreThan100USD false when balance < $100', () => {
      // balance < $100
      mockUseABTest.mockReturnValue({
        variant:
          STICKY_FOOTER_SWAP_LABEL_VARIANTS[
            StickyFooterSwapLabelVariant.Control
          ],
        variantName: StickyFooterSwapLabelVariant.Control,
        isActive: true,
      });
      const { getByText } = render(
        <TokenDetailsStickyFooter {...defaultProps} balanceFiatUsd={50} />,
      );

      fireEvent.press(getByText('Swap'));

      expect(mockTrackStickyFooterTapped).toHaveBeenCalledWith({
        ctaType: 'swap',
        hasMoreThan100USD: false,
        tokenAddress: '0x123',
        chainId: '0x1',
      });
    });

    it('tracks buy button tap with hasMoreThan100USD false when balance < $100', () => {
      // balance < $100
      mockUseABTest.mockReturnValue({
        variant:
          STICKY_FOOTER_SWAP_LABEL_VARIANTS[
            StickyFooterSwapLabelVariant.Control
          ],
        variantName: StickyFooterSwapLabelVariant.Control,
        isActive: true,
      });
      const { getByText } = render(
        <TokenDetailsStickyFooter {...defaultProps} balanceFiatUsd={50} />,
      );

      fireEvent.press(getByText('Buy'));

      expect(mockTrackStickyFooterTapped).toHaveBeenCalledWith({
        ctaType: 'buy',
        hasMoreThan100USD: false,
        tokenAddress: '0x123',
        chainId: '0x1',
      });
    });

    it('tracks swap tap with hasMoreThan100USD true when balance >= $100', () => {
      mockUseABTest.mockReturnValue({
        variant:
          STICKY_FOOTER_SWAP_LABEL_VARIANTS[
            StickyFooterSwapLabelVariant.Treatment
          ],
        variantName: StickyFooterSwapLabelVariant.Treatment,
        isActive: true,
      });
      const { getByText } = render(
        <TokenDetailsStickyFooter {...defaultProps} balanceFiatUsd={150} />,
      );

      fireEvent.press(getByText('Convert'));

      expect(mockTrackStickyFooterTapped).toHaveBeenCalledWith({
        ctaType: 'swap',
        hasMoreThan100USD: true,
        tokenAddress: '0x123',
        chainId: '0x1',
      });
    });

    it('tracks single swap button with hasMoreThan100USD false when balance is undefined', () => {
      mockIsBuyable.mockReturnValue(false);
      mockUseABTest.mockReturnValue({
        variant:
          STICKY_FOOTER_SWAP_LABEL_VARIANTS[
            StickyFooterSwapLabelVariant.Control
          ],
        variantName: StickyFooterSwapLabelVariant.Control,
        isActive: true,
      });
      const { getByText } = render(
        <TokenDetailsStickyFooter {...defaultProps} />,
      );

      fireEvent.press(getByText('Swap'));

      expect(mockTrackStickyFooterTapped).toHaveBeenCalledWith({
        ctaType: 'swap',
        hasMoreThan100USD: false,
        tokenAddress: '0x123',
        chainId: '0x1',
      });
    });
  });
});
