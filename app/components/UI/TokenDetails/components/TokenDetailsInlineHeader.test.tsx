import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import type { TokenSecurityData } from '@metamask/assets-controllers';
import Routes from '../../../../constants/navigation/Routes';
import { TokenDetailsInlineHeader } from './TokenDetailsInlineHeader';
import { LIGHT_MODE_SUCCESS_GREEN } from '../../../../util/theme';
import type { TokenDetailsRouteParams } from '../constants/constants';

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
        useAmbientColor={false}
        {...props}
      />,
    );

  beforeEach(() => {
    jest.clearAllMocks();
    mockIsStockToken.mockReturnValue(false);
    mockResolveTokenContractAddress.mockReturnValue(
      '0x0000000000000000000000000000000000000000',
    );
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

      expect(mockNavigate).toHaveBeenCalledWith(Routes.MODAL.ROOT_MODAL_FLOW, {
        screen: Routes.MODAL.SECURITY_BADGE_BOTTOM_SHEET,
        params: expect.objectContaining({
          source: 'badge',
          severity: 'Verified',
          tokenAddress: '0x123',
          tokenSymbol: 'ETH',
          chainId: '0x1',
        }),
      });
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

  describe('control group (useAmbientColor=false)', () => {
    it('renders back button even when iconColor is undefined', () => {
      const { getByTestId } = renderHeader();

      expect(getByTestId('back-arrow-button')).toBeOnTheScreen();
    });

    it('renders back button when iconColor is provided', () => {
      const { getByTestId } = renderHeader({
        iconColor: LIGHT_MODE_SUCCESS_GREEN,
      });

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
  });

  describe('treatment group (useAmbientColor=true)', () => {
    it('renders back button with default color when iconColor is undefined', () => {
      const { getByTestId } = renderHeader({ useAmbientColor: true });

      expect(getByTestId('back-arrow-button')).toBeOnTheScreen();
    });

    it('renders back button when iconColor is provided', () => {
      const { getByTestId } = renderHeader({
        iconColor: LIGHT_MODE_SUCCESS_GREEN,
        useAmbientColor: true,
      });

      expect(getByTestId('back-arrow-button')).toBeOnTheScreen();
    });

    it('calls onBackPress when back button is pressed', () => {
      const { getByTestId } = renderHeader({ useAmbientColor: true });

      fireEvent.press(getByTestId('back-arrow-button'));

      expect(mockOnBackPress).toHaveBeenCalledTimes(1);
    });

    it('renders price alert button when iconColor is provided and onPriceAlertPress is set', () => {
      const mockOnPriceAlertPress = jest.fn();
      const { getByTestId } = renderHeader({
        onPriceAlertPress: mockOnPriceAlertPress,
        iconColor: LIGHT_MODE_SUCCESS_GREEN,
        useAmbientColor: true,
      });

      fireEvent.press(getByTestId('token-price-alert-button'));
      expect(mockOnPriceAlertPress).toHaveBeenCalledTimes(1);
    });

    it('does not render the price alert button when iconColor is undefined', () => {
      const mockOnPriceAlertPress = jest.fn();
      const { queryByTestId } = renderHeader({
        onPriceAlertPress: mockOnPriceAlertPress,
        useAmbientColor: true,
      });

      expect(queryByTestId('token-price-alert-button')).toBeNull();
    });

    it('renders share button when iconColor is provided and onSharePress is set', () => {
      const mockOnSharePress = jest.fn();
      const { getByTestId } = renderHeader({
        onSharePress: mockOnSharePress,
        iconColor: LIGHT_MODE_SUCCESS_GREEN,
        useAmbientColor: true,
      });

      fireEvent.press(getByTestId('share-button'));
      expect(mockOnSharePress).toHaveBeenCalledTimes(1);
    });

    it('does not render the share button when iconColor is undefined', () => {
      const mockOnSharePress = jest.fn();
      const { queryByTestId } = renderHeader({
        onSharePress: mockOnSharePress,
        useAmbientColor: true,
      });

      expect(queryByTestId('share-button')).toBeNull();
    });
  });
});
