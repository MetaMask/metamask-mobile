import React from 'react';
import { Pressable as MockPressable } from 'react-native';
import { fireEvent } from '@testing-library/react-native';
import AssetOverviewContent, {
  type AssetOverviewContentProps,
} from './AssetOverviewContent';
import { TokenOverviewSelectorsIDs } from '../../AssetOverview/TokenOverview.testIds';
import { TokenI } from '../../Tokens/types';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../util/test/initial-root-state';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../../util/test/accountsControllerTestUtils';
import { MetaMetricsEvents } from '../../../../core/Analytics/MetaMetrics.events';
import Routes from '../../../../constants/navigation/Routes';
import {
  PERPS_EVENT_PROPERTY,
  PERPS_EVENT_VALUE,
} from '@metamask/perps-controller';

const mockHandlePerpsAction = jest.fn();
const mockTrack = jest.fn();
const mockNavigate = jest.fn();

jest.mock('../../MarketInsights', () => ({
  __esModule: true,
  MarketInsightsEntryCard: ({
    onPress,
    testID,
  }: {
    onPress?: () => void;
    testID?: string;
  }) => <MockPressable onPress={onPress} testID={testID} />,
  useMarketInsights: () => ({
    report: {
      asset: 'eth',
      generatedAt: '2026-02-17T11:55:00.000Z',
      headline: 'ETH outlook stays positive',
      summary: 'Momentum remains constructive.',
      trends: [],
      sources: [],
    },
    isLoading: false,
    error: null,
    timeAgo: '5m ago',
  }),
  selectMarketInsightsEnabled: () => true,
}));

jest.mock('../hooks/usePerpsActions', () => ({
  usePerpsActions: () => ({
    hasPerpsMarket: true,
    marketData: { symbol: 'ETH', name: 'ETH', maxLeverage: '50x' },
    isLoading: false,
    error: null,
    handlePerpsAction: mockHandlePerpsAction,
  }),
}));

jest.mock('../../Perps/hooks/usePerpsEventTracking', () => ({
  usePerpsEventTracking: () => ({ track: mockTrack }),
}));

jest.mock('../../Perps/components/PerpsBottomSheetTooltip', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../../../../selectors/featureFlagController/tokenDetailsV2', () => ({
  selectTokenDetailsV2Enabled: jest.fn(() => true),
  selectTokenDetailsV2ButtonsEnabled: jest.fn(() => true),
}));

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({
      navigate: mockNavigate,
      addListener: jest.fn(() => jest.fn()),
    }),
    useFocusEffect: jest.fn((cb: () => void) => cb()),
  };
});

function createState(isEligible: boolean) {
  return {
    engine: {
      backgroundState: {
        ...backgroundState,
        PerpsController: {
          ...(backgroundState as { PerpsController?: object }).PerpsController,
          isEligible,
        },
        RemoteFeatureFlagController: {
          ...(backgroundState as { RemoteFeatureFlagController?: object })
            .RemoteFeatureFlagController,
          remoteFeatureFlags: {},
        },
        AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
      },
    },
  };
}

const defaultToken: TokenI = {
  address: '0x123',
  chainId: '0x1',
  symbol: 'ETH',
  name: 'Ethereum',
  decimals: 18,
  balance: '1',
  balanceFiat: '$2000',
  logo: '',
  image: '',
  isETH: false,
  hasBalanceError: false,
  aggregators: [],
};

const defaultProps: AssetOverviewContentProps = {
  token: defaultToken,
  balance: '1',
  mainBalance: '$2000',
  secondaryBalance: '1 ETH',
  currentPrice: 2000,
  priceDiff: 0,
  comparePrice: 2000,
  prices: [],
  isLoading: false,
  timePeriod: '1d',
  setTimePeriod: jest.fn(),
  chartNavigationButtons: ['1d', '1w', '1m'],
  isPerpsEnabled: true,
  isMerklCampaignClaimingEnabled: false,
  displayBuyButton: false,
  displaySwapsButton: false,
  currentCurrency: 'USD',
  onBuy: jest.fn(),
  onSend: jest.fn().mockResolvedValue(undefined),
  onReceive: jest.fn(),
  goToSwaps: jest.fn(),
};

describe('AssetOverviewContent', () => {
  describe('Long / Short with perps eligibility', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('shows geo block modal and tracks event when Long is pressed and user is not eligible', () => {
      const { getByTestId } = renderWithProvider(
        <AssetOverviewContent {...defaultProps} />,
        { state: createState(false) },
      );

      fireEvent.press(getByTestId(TokenOverviewSelectorsIDs.LONG_BUTTON));

      expect(mockTrack).toHaveBeenCalledWith(
        MetaMetricsEvents.PERPS_SCREEN_VIEWED,
        {
          [PERPS_EVENT_PROPERTY.SCREEN_TYPE]:
            PERPS_EVENT_VALUE.SCREEN_TYPE.GEO_BLOCK_NOTIF,
          [PERPS_EVENT_PROPERTY.SOURCE]:
            PERPS_EVENT_VALUE.SOURCE.ASSET_DETAIL_SCREEN,
        },
      );
      expect(mockHandlePerpsAction).not.toHaveBeenCalled();
    });

    it('shows geo block modal and tracks event when Short is pressed and user is not eligible', () => {
      const { getByTestId } = renderWithProvider(
        <AssetOverviewContent {...defaultProps} />,
        { state: createState(false) },
      );

      fireEvent.press(getByTestId(TokenOverviewSelectorsIDs.SHORT_BUTTON));

      expect(mockTrack).toHaveBeenCalledWith(
        MetaMetricsEvents.PERPS_SCREEN_VIEWED,
        {
          [PERPS_EVENT_PROPERTY.SCREEN_TYPE]:
            PERPS_EVENT_VALUE.SCREEN_TYPE.GEO_BLOCK_NOTIF,
          [PERPS_EVENT_PROPERTY.SOURCE]:
            PERPS_EVENT_VALUE.SOURCE.ASSET_DETAIL_SCREEN,
        },
      );
      expect(mockHandlePerpsAction).not.toHaveBeenCalled();
    });

    it('calls handlePerpsAction with long when Long is pressed and user is eligible', () => {
      const { getByTestId } = renderWithProvider(
        <AssetOverviewContent {...defaultProps} />,
        { state: createState(true) },
      );

      fireEvent.press(getByTestId(TokenOverviewSelectorsIDs.LONG_BUTTON));

      expect(mockHandlePerpsAction).toHaveBeenCalledWith('long');
      expect(mockTrack).not.toHaveBeenCalled();
    });

    it('calls handlePerpsAction with short when Short is pressed and user is eligible', () => {
      const { getByTestId } = renderWithProvider(
        <AssetOverviewContent {...defaultProps} />,
        { state: createState(true) },
      );

      fireEvent.press(getByTestId(TokenOverviewSelectorsIDs.SHORT_BUTTON));

      expect(mockHandlePerpsAction).toHaveBeenCalledWith('short');
      expect(mockTrack).not.toHaveBeenCalled();
    });

    it('renders market insights entry card and navigates to market insights view on press', () => {
      const { getByTestId } = renderWithProvider(
        <AssetOverviewContent {...defaultProps} />,
        { state: createState(true) },
      );

      fireEvent.press(getByTestId('market-insights-entry-card'));

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.MARKET_INSIGHTS.VIEW,
        expect.objectContaining({
          assetSymbol: 'ETH',
          tokenAddress: '0x123',
          tokenChainId: '0x1',
        }),
      );
    });
  });
});
