import React from 'react';
import { fireEvent, act } from '@testing-library/react-native';
import { Pressable as MockPressable, View as MockView } from 'react-native';
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
const mockTrackEvent = jest.fn();
const mockAddProperties = jest.fn();
const mockBuild = jest.fn();
const mockCreateEventBuilder = jest.fn();
const mockUseMarketInsights = jest.fn();
const mockSelectMarketInsightsEnabled = jest.fn(() => true);
const mockUsePerpsPositionForAsset = jest.fn();

jest.mock('../../MarketInsights', () => ({
  __esModule: true,
  MarketInsightsEntryCard: ({
    onPress,
    testID,
  }: {
    onPress?: () => void;
    testID?: string;
  }) => <MockPressable onPress={onPress} testID={testID} />,
  useMarketInsights: (...args: unknown[]) => mockUseMarketInsights(...args),
  selectMarketInsightsEnabled: () => mockSelectMarketInsightsEnabled(),
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

jest.mock('../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
}));

// Use a stable wrapper so jest.restoreAllMocks() (from testSetup.js afterEach)
// does not wipe the implementation between tests.
const mockPerpsBottomSheetTooltipInner = jest.fn((..._args: unknown[]) => null);
jest.mock('../../Perps/components/PerpsBottomSheetTooltip', () => ({
  __esModule: true,
  default: (...args: unknown[]) => mockPerpsBottomSheetTooltipInner(...args),
}));

jest.mock('../../../../selectors/featureFlagController/tokenDetailsV2', () => ({
  selectTokenDetailsLayoutTestVariant: jest.fn(() => 'treatment'),
}));

jest.mock('../../Perps/hooks/usePerpsPositionForAsset', () => ({
  usePerpsPositionForAsset: (...args: unknown[]) =>
    mockUsePerpsPositionForAsset(...args),
}));

jest.mock('../../Perps/components/PerpsPositionCard', () => ({
  __esModule: true,
  default: ({ testID }: { testID?: string }) => <MockView testID={testID} />,
}));

jest.mock('../../Perps/components/PerpsDiscoveryBanner', () => ({
  __esModule: true,
  default: ({ testID }: { testID?: string }) => <MockView testID={testID} />,
}));

jest.mock('../../AssetOverview/TokenDetails', () => () => null);

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
  displayBuyButton: false,
  displaySwapsButton: false,
  currentCurrency: 'USD',
  onBuy: jest.fn(),
  onSend: jest.fn().mockResolvedValue(undefined),
  onReceive: jest.fn(),
  goToSwaps: jest.fn(),
};

const defaultMarketInsightsResult = {
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
};

describe('AssetOverviewContent', () => {
  const defaultPerpsPositionResult = {
    position: null,
    hasFundsInPerps: false,
    accountState: null,
    isLoading: false,
  };

  describe('Long / Short with perps eligibility', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      mockBuild.mockReturnValue({ category: 'market-insights-opened' });
      mockAddProperties.mockReturnValue({ build: mockBuild });
      mockCreateEventBuilder.mockReturnValue({
        addProperties: mockAddProperties,
      });
      mockSelectMarketInsightsEnabled.mockReturnValue(true);
      mockUseMarketInsights.mockReturnValue(defaultMarketInsightsResult);
      mockUsePerpsPositionForAsset.mockReturnValue(defaultPerpsPositionResult);
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

    it('closes geo block modal when closeEligibilityModal is called', () => {
      const { getByTestId } = renderWithProvider(
        <AssetOverviewContent {...defaultProps} />,
        { state: createState(false) },
      );

      // Open the geo block modal by pressing Long when not eligible
      fireEvent.press(getByTestId(TokenOverviewSelectorsIDs.LONG_BUTTON));

      // Verify the tooltip was rendered with the expected props
      expect(mockPerpsBottomSheetTooltipInner).toHaveBeenCalledWith(
        expect.objectContaining({
          onClose: expect.any(Function),
          contentKey: 'geo_block',
        }),
        expect.anything(),
      );

      // Extract onClose from the last render call and invoke it
      const lastCallProps = mockPerpsBottomSheetTooltipInner.mock.calls[
        mockPerpsBottomSheetTooltipInner.mock.calls.length - 1
      ][0] as { onClose: () => void };
      mockPerpsBottomSheetTooltipInner.mockClear();

      act(() => {
        lastCallProps.onClose();
      });

      // Modal dismissed — tooltip no longer rendered
      expect(mockPerpsBottomSheetTooltipInner).not.toHaveBeenCalled();
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
      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.MARKET_INSIGHTS_OPENED,
      );
      expect(mockAddProperties).toHaveBeenCalledWith({
        caip19: 'eip155:1/erc20:0x123',
      });
      expect(mockTrackEvent).toHaveBeenCalledWith({
        category: 'market-insights-opened',
      });
    });

    it('resolves market insights display as false when feature flag is disabled', () => {
      mockSelectMarketInsightsEnabled.mockReturnValue(false);
      const onMarketInsightsDisplayResolved = jest.fn();

      renderWithProvider(
        <AssetOverviewContent
          {...defaultProps}
          onMarketInsightsDisplayResolved={onMarketInsightsDisplayResolved}
        />,
        { state: createState(true) },
      );

      expect(onMarketInsightsDisplayResolved).toHaveBeenCalledWith(false);
    });

    it('does not resolve market insights display while market insights is loading', () => {
      mockUseMarketInsights.mockReturnValue({
        ...defaultMarketInsightsResult,
        report: null,
        isLoading: true,
      });
      const onMarketInsightsDisplayResolved = jest.fn();

      renderWithProvider(
        <AssetOverviewContent
          {...defaultProps}
          onMarketInsightsDisplayResolved={onMarketInsightsDisplayResolved}
        />,
        { state: createState(true) },
      );

      expect(onMarketInsightsDisplayResolved).not.toHaveBeenCalled();
    });

    it('resolves market insights display as true when report is available', () => {
      const onMarketInsightsDisplayResolved = jest.fn();

      renderWithProvider(
        <AssetOverviewContent
          {...defaultProps}
          onMarketInsightsDisplayResolved={onMarketInsightsDisplayResolved}
        />,
        { state: createState(true) },
      );

      expect(onMarketInsightsDisplayResolved).toHaveBeenCalledWith(true);
    });

    it('resolves market insights display as false when report is unavailable after loading', () => {
      mockUseMarketInsights.mockReturnValue({
        ...defaultMarketInsightsResult,
        report: null,
        isLoading: false,
      });
      const onMarketInsightsDisplayResolved = jest.fn();

      renderWithProvider(
        <AssetOverviewContent
          {...defaultProps}
          onMarketInsightsDisplayResolved={onMarketInsightsDisplayResolved}
        />,
        { state: createState(true) },
      );

      expect(onMarketInsightsDisplayResolved).toHaveBeenCalledWith(false);
    });
  });

  describe('Perps / Market Insights layout ordering', () => {
    // Token with enough aggregators to pass isTokenTrustworthyForPerps (requires >= 2)
    const trustworthyToken: TokenI = {
      ...defaultToken,
      aggregators: ['uniswap', 'sushiswap'],
    };

    const trustworthyProps: AssetOverviewContentProps = {
      ...defaultProps,
      token: trustworthyToken,
    };

    beforeEach(() => {
      jest.clearAllMocks();
      mockBuild.mockReturnValue({ category: 'market-insights-opened' });
      mockAddProperties.mockReturnValue({ build: mockBuild });
      mockCreateEventBuilder.mockReturnValue({
        addProperties: mockAddProperties,
      });
      mockSelectMarketInsightsEnabled.mockReturnValue(true);
      mockUseMarketInsights.mockReturnValue(defaultMarketInsightsResult);
      mockUsePerpsPositionForAsset.mockReturnValue({
        position: null,
        hasFundsInPerps: false,
        accountState: null,
        isLoading: false,
      });
    });

    it('renders perps position card above market insights when a position exists', () => {
      mockUsePerpsPositionForAsset.mockReturnValue({
        position: { symbol: 'ETH', size: '1', side: 'long' },
        hasFundsInPerps: true,
        accountState: null,
        isLoading: false,
      });

      const { getByTestId, queryByTestId } = renderWithProvider(
        <AssetOverviewContent {...trustworthyProps} />,
        { state: createState(true) },
      );

      expect(
        getByTestId(TokenOverviewSelectorsIDs.PERPS_POSITION_CARD),
      ).toBeOnTheScreen();
      expect(getByTestId('market-insights-entry-card')).toBeOnTheScreen();
      expect(
        queryByTestId(TokenOverviewSelectorsIDs.PERPS_DISCOVERY_BANNER),
      ).toBeNull();
    });

    it('renders discovery banner below market insights when no position exists', () => {
      const { getByTestId, queryByTestId } = renderWithProvider(
        <AssetOverviewContent {...trustworthyProps} />,
        { state: createState(true) },
      );

      expect(getByTestId('market-insights-entry-card')).toBeOnTheScreen();
      expect(
        getByTestId(TokenOverviewSelectorsIDs.PERPS_DISCOVERY_BANNER),
      ).toBeOnTheScreen();
      expect(
        queryByTestId(TokenOverviewSelectorsIDs.PERPS_POSITION_CARD),
      ).toBeNull();
    });

    it('does not render discovery banner when a position exists', () => {
      mockUsePerpsPositionForAsset.mockReturnValue({
        position: { symbol: 'ETH', size: '1', side: 'long' },
        hasFundsInPerps: true,
        accountState: null,
        isLoading: false,
      });

      const { queryByTestId } = renderWithProvider(
        <AssetOverviewContent {...trustworthyProps} />,
        { state: createState(true) },
      );

      expect(
        queryByTestId(TokenOverviewSelectorsIDs.PERPS_DISCOVERY_BANNER),
      ).toBeNull();
    });

    it('does not render position card when no position exists', () => {
      const { queryByTestId } = renderWithProvider(
        <AssetOverviewContent {...trustworthyProps} />,
        { state: createState(true) },
      );

      expect(
        queryByTestId(TokenOverviewSelectorsIDs.PERPS_POSITION_CARD),
      ).toBeNull();
    });
  });
});
