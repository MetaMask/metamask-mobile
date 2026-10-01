import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import type { TokenSecurityData } from '@metamask/assets-controllers';
import Routes from '../../../../constants/navigation/Routes';
import {
  TOKEN_DETAILS_HEADER_V2_TEST_IDS,
  TokenDetailsInlineHeader,
} from './TokenDetailsInlineHeader';
import type { TokenDetailsRouteParams } from '../constants/constants';

const mockHeaderV2EnabledRef = { current: true };
jest.mock('./tokenDetailsHeaderConfig', () => ({
  get TOKEN_DETAILS_HEADER_V2_ENABLED() {
    return mockHeaderV2EnabledRef.current;
  },
}));

const mockNavigate = jest.fn();
const mockCopyContractAddress = jest.fn();
const mockResolveTokenContractAddress = jest.fn();
const mockIsStockToken = jest.fn(() => false);

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('../hooks/useCopyTokenContractAddress', () => ({
  useCopyTokenContractAddress: () => mockCopyContractAddress,
}));

jest.mock('../../AssetOverview/utils/getTokenDetails', () => ({
  resolveTokenContractAddress: (...args: unknown[]) =>
    mockResolveTokenContractAddress(...args),
}));

jest.mock('../../../../util/address', () => ({
  formatAddress: jest.fn((address: string) => `${address.slice(0, 7)}...short`),
}));

jest.mock('../../Bridge/hooks/useRWAToken', () => ({
  useRWAToken: () => ({
    isStockToken: mockIsStockToken,
  }),
}));

jest.mock('../../shared/StockBadge/StockBadge', () => {
  const { Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: () => <Text testID="stock-badge">Stock</Text>,
  };
});

jest.mock('../../Assets/components/AssetLogo/AssetLogo', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../../AssetOverview/Balance/Balance', () => ({
  NetworkBadgeSource: jest.fn(),
}));

const mockToken: TokenDetailsRouteParams = {
  address: '0x123',
  chainId: '0x1',
  symbol: 'ETH',
  name: 'Ethereum',
  ticker: 'ETH',
  isETH: true,
} as unknown as TokenDetailsRouteParams;

const createMockSecurityData = (
  resultType: TokenSecurityData['resultType'],
): TokenSecurityData => ({
  resultType,
  maliciousScore: '0',
  fees: {
    transfer: 0,
    transferFeeMaxAmount: null,
    buy: 0,
    sell: 0,
  },
  features: [],
  financialStats: {
    supply: 1000000,
    topHolders: [],
    holdersCount: 100,
    tradeVolume24h: null,
    lockedLiquidityPct: null,
    markets: [],
  },
  metadata: {
    externalLinks: {
      homepage: null,
      twitterPage: null,
      telegramChannelId: null,
    },
  },
  created: '2023-01-01T00:00:00Z',
});

describe('TokenDetailsInlineHeader', () => {
  const mockOnBackPress = jest.fn();

  const renderHeader = (
    props: Partial<React.ComponentProps<typeof TokenDetailsInlineHeader>> = {},
  ) =>
    render(
      <TokenDetailsInlineHeader
        token={mockToken}
        securityData={undefined}
        onBackPress={mockOnBackPress}
        {...props}
      />,
    );

  beforeEach(() => {
    jest.clearAllMocks();
    mockHeaderV2EnabledRef.current = true;
    mockIsStockToken.mockReturnValue(false);
    mockResolveTokenContractAddress.mockReturnValue(
      '0x0000000000000000000000000000000000000000',
    );
  });

  describe.each([
    ['V2 (TOKEN_DETAILS_HEADER_V2_ENABLED=true)', true],
    ['legacy (TOKEN_DETAILS_HEADER_V2_ENABLED=false)', false],
  ])('shared behaviour — %s', (_name, v2Enabled) => {
    beforeEach(() => {
      mockHeaderV2EnabledRef.current = v2Enabled;
    });

    describe('security badge', () => {
      it('renders verified badge when securityData resultType is Verified', () => {
        const { getByTestId } = renderHeader({
          securityData: createMockSecurityData('Verified'),
        });

        expect(getByTestId('security-badge-verified')).toBeOnTheScreen();
      });

      it('does not render verified badge when securityData resultType is Benign', () => {
        const { queryByTestId } = renderHeader({
          securityData: createMockSecurityData('Benign'),
        });

        expect(queryByTestId('security-badge-verified')).toBeNull();
      });

      it('navigates to security badge bottom sheet when verified badge is pressed', () => {
        const { getByTestId } = renderHeader({
          securityData: createMockSecurityData('Verified'),
        });

        fireEvent.press(getByTestId('security-badge-verified'));

        expect(mockNavigate).toHaveBeenCalledWith(
          Routes.MODAL.ROOT_MODAL_FLOW,
          {
            screen: Routes.MODAL.SECURITY_BADGE_BOTTOM_SHEET,
            params: expect.objectContaining({
              source: 'badge',
              severity: 'Verified',
              tokenAddress: '0x123',
              tokenSymbol: 'ETH',
              chainId: '0x1',
            }),
          },
        );
      });
    });

    describe('stock badge', () => {
      it('renders stock badge for named stock tokens', () => {
        mockIsStockToken.mockReturnValue(true);

        const { getByTestId } = renderHeader({
          token: {
            ...mockToken,
            name: 'Apple Inc',
            ticker: 'AAPL',
            symbol: 'AAPL',
          },
        });

        expect(getByTestId('stock-badge')).toBeOnTheScreen();
      });

      it('renders stock badge for symbol-only stock tokens', () => {
        mockIsStockToken.mockReturnValue(true);

        const { getByTestId } = renderHeader({
          token: {
            ...mockToken,
            name: '',
            ticker: 'AAPL',
            symbol: 'AAPL',
          },
        });

        expect(getByTestId('stock-badge')).toBeOnTheScreen();
      });

      it('does not render stock badge when token is not a stock token', () => {
        mockIsStockToken.mockReturnValue(false);

        const { queryByTestId } = renderHeader();

        expect(queryByTestId('stock-badge')).toBeNull();
      });

      it('renders both verified and stock badges when applicable', () => {
        mockIsStockToken.mockReturnValue(true);

        const { getByTestId } = renderHeader({
          securityData: createMockSecurityData('Verified'),
          token: {
            ...mockToken,
            name: 'Apple Inc',
            ticker: 'AAPL',
            symbol: 'AAPL',
          },
        });

        expect(getByTestId('security-badge-verified')).toBeOnTheScreen();
        expect(getByTestId('stock-badge')).toBeOnTheScreen();
      });
    });

    describe('back button and header actions', () => {
      it('renders back button with neutral icon', () => {
        const { getByTestId } = renderHeader();

        expect(getByTestId('back-arrow-button')).toBeOnTheScreen();
      });

      it('calls onBackPress when back button is pressed', () => {
        const { getByTestId } = renderHeader();

        fireEvent.press(getByTestId('back-arrow-button'));

        expect(mockOnBackPress).toHaveBeenCalledTimes(1);
      });

      it('renders asset ticker as title', () => {
        const { getByText, queryByText } = renderHeader();

        expect(getByText('ETH')).toBeOnTheScreen();
        expect(queryByText('Ethereum')).toBeNull();
      });

      it('does not render description or copy button for native tokens', () => {
        const { queryByTestId, queryByText } = renderHeader();

        expect(queryByTestId('copy-contract-address-button')).toBeNull();
        expect(queryByText('0x00000...short')).toBeNull();
      });

      it('renders short contract address in description for non-native tokens', () => {
        const { getByText } = renderHeader({
          token: {
            ...mockToken,
            isETH: false,
            isNative: false,
          },
        });

        expect(getByText('0x00000...short')).toBeOnTheScreen();
      });

      it('renders copy button and calls onCopyAddress when pressed for non-native tokens', () => {
        const mockOnCopyAddress = jest.fn();
        const { getByTestId } = renderHeader({
          token: {
            ...mockToken,
            isETH: false,
            isNative: false,
          },
          onCopyAddress: mockOnCopyAddress,
        });

        fireEvent.press(getByTestId('copy-contract-address-button'));

        expect(mockCopyContractAddress).toHaveBeenCalledTimes(1);
      });

      it('does not render description or copy button when contract address is null', () => {
        mockResolveTokenContractAddress.mockReturnValue(null);
        const { queryByTestId, queryByText } = renderHeader();

        expect(queryByTestId('copy-contract-address-button')).toBeNull();
        expect(queryByText('0x00000...short')).toBeNull();
      });

      it('renders price alert button when onPriceAlertPress is provided', () => {
        const mockOnPriceAlertPress = jest.fn();
        const { getByTestId } = renderHeader({
          onPriceAlertPress: mockOnPriceAlertPress,
        });

        fireEvent.press(getByTestId('token-price-alert-button'));
        expect(mockOnPriceAlertPress).toHaveBeenCalledTimes(1);
      });

      it('does not render the price alert button when onPriceAlertPress is undefined', () => {
        const { queryByTestId } = renderHeader();

        expect(queryByTestId('token-price-alert-button')).toBeNull();
      });

      it('renders share button and calls onSharePress when pressed', () => {
        const mockOnSharePress = jest.fn();
        const { getByTestId } = renderHeader({
          onSharePress: mockOnSharePress,
        });

        fireEvent.press(getByTestId('share-button'));
        expect(mockOnSharePress).toHaveBeenCalledTimes(1);
      });

      it('does not render the share button when onSharePress is undefined', () => {
        const { queryByTestId } = renderHeader();

        expect(queryByTestId('share-button')).toBeNull();
      });

      it('renders end-accessory icons left-to-right as watchlist, price alert, then share', () => {
        const { Text } = jest.requireActual('react-native');
        const { toJSON, getByTestId } = renderHeader({
          starButton: <Text testID="watchlist-star-button">★</Text>,
          onPriceAlertPress: jest.fn(),
          onSharePress: jest.fn(),
        });

        expect(getByTestId('watchlist-star-button')).toBeOnTheScreen();
        expect(getByTestId('token-price-alert-button')).toBeOnTheScreen();
        expect(getByTestId('share-button')).toBeOnTheScreen();

        const serialized = JSON.stringify(toJSON());
        const starIndex = serialized.indexOf('watchlist-star-button');
        const alertIndex = serialized.indexOf('token-price-alert-button');
        const shareIndex = serialized.indexOf('share-button');

        expect(starIndex).toBeGreaterThanOrEqual(0);
        expect(alertIndex).toBeGreaterThan(starIndex);
        expect(shareIndex).toBeGreaterThan(alertIndex);
      });
    });
  });

  describe('V2 scroll-aware identity (ASSETS-4016)', () => {
    beforeEach(() => {
      mockHeaderV2EnabledRef.current = true;
    });

    it('mounts the V2 container', () => {
      const { getByTestId } = renderHeader();

      expect(
        getByTestId(TOKEN_DETAILS_HEADER_V2_TEST_IDS.CONTAINER),
      ).toBeOnTheScreen();
    });

    it('always renders the animated identity node (opacity driven by scrollY on UI thread)', () => {
      const { getByTestId } = renderHeader();

      expect(
        getByTestId(TOKEN_DETAILS_HEADER_V2_TEST_IDS.IDENTITY),
      ).toBeOnTheScreen();
      expect(
        getByTestId(TOKEN_DETAILS_HEADER_V2_TEST_IDS.TICKER),
      ).toBeOnTheScreen();
    });

    it('renders the age pill when tokenAge is provided', () => {
      const { getByTestId, getByText } = renderHeader({ tokenAge: '3d' });

      expect(
        getByTestId(TOKEN_DETAILS_HEADER_V2_TEST_IDS.AGE_PILL),
      ).toBeOnTheScreen();
      expect(getByText('3d')).toBeOnTheScreen();
    });

    it('hides the age pill when tokenAge is undefined (defensive fallback)', () => {
      const { queryByTestId } = renderHeader();

      expect(
        queryByTestId(TOKEN_DETAILS_HEADER_V2_TEST_IDS.AGE_PILL),
      ).toBeNull();
    });

    it('renders the subtitle (contract address) for non-native tokens', () => {
      const { getByTestId } = renderHeader({
        token: {
          ...mockToken,
          isETH: false,
          isNative: false,
        },
      });

      expect(
        getByTestId(TOKEN_DETAILS_HEADER_V2_TEST_IDS.SUBTITLE),
      ).toBeOnTheScreen();
    });

    it('does not render a subtitle for native tokens', () => {
      const { queryByTestId } = renderHeader();

      expect(
        queryByTestId(TOKEN_DETAILS_HEADER_V2_TEST_IDS.SUBTITLE),
      ).toBeNull();
    });
  });

  describe('legacy fallback (TOKEN_DETAILS_HEADER_V2_ENABLED=false)', () => {
    beforeEach(() => {
      mockHeaderV2EnabledRef.current = false;
    });

    it('does not mount the V2 container', () => {
      const { queryByTestId } = renderHeader();

      expect(
        queryByTestId(TOKEN_DETAILS_HEADER_V2_TEST_IDS.CONTAINER),
      ).toBeNull();
    });

    it('ignores the tokenAge prop (no age pill rendered)', () => {
      const { queryByTestId } = renderHeader({ tokenAge: '3d' });

      expect(
        queryByTestId(TOKEN_DETAILS_HEADER_V2_TEST_IDS.AGE_PILL),
      ).toBeNull();
    });
  });
});
