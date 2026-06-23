import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import type { TokenSecurityData } from '@metamask/assets-controllers';
import Routes from '../../../../constants/navigation/Routes';
import { TokenDetailsInlineHeader } from './TokenDetailsInlineHeader';
import { LIGHT_MODE_SUCCESS_GREEN } from '../../../../util/theme';
import type { TokenDetailsRouteParams } from '../constants/constants';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('../../Bridge/hooks/useRWAToken', () => ({
  useRWAToken: () => ({
    isStockToken: jest.fn(() => false),
  }),
}));

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
};

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

    it('renders asset title', () => {
      const { getByText } = renderHeader();

      expect(getByText('Ethereum')).toBeOnTheScreen();
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
    it('does not render back button when iconColor is undefined', () => {
      const { queryByTestId } = renderHeader({ useAmbientColor: true });

      expect(queryByTestId('back-arrow-button')).not.toBeOnTheScreen();
    });

    it('renders back button when iconColor is provided', () => {
      const { getByTestId } = renderHeader({
        iconColor: LIGHT_MODE_SUCCESS_GREEN,
        useAmbientColor: true,
      });

      expect(getByTestId('back-arrow-button')).toBeOnTheScreen();
    });

    it('calls onBackPress when back button is pressed', () => {
      const { getByTestId } = renderHeader({
        iconColor: LIGHT_MODE_SUCCESS_GREEN,
        useAmbientColor: true,
      });

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
