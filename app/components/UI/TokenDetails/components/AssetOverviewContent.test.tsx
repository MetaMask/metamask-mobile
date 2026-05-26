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
import { strings } from '../../../../../locales/i18n';
import type { TokenSecurityData } from '@metamask/assets-controllers';
// eslint-disable-next-line import-x/no-namespace
import * as TokenDetailsActionsModule from './TokenDetailsActions';

jest.mock('../../../../core/Engine', () => ({
  context: {
    NetworkController: {
      state: {
        selectedNetworkClientId: 'mainnet',
      },
    },
  },
}));

const mockHandlePerpsAction = jest.fn();
const mockTrack = jest.fn();
const mockNavigate = jest.fn();
const mockTrackEvent = jest.fn();
const mockBuild = jest.fn().mockReturnValue({});
const mockAddProperties = jest.fn(() => ({ build: mockBuild }));
const mockCreateEventBuilder = jest.fn();
const mockUseMarketInsights = jest.fn();
const mockSelectMarketInsightsEnabled = jest.fn(() => true);
const mockUsePerpsPositionForAsset = jest.fn();

jest.mock('../../MarketInsights', () => ({
  __esModule: true,
  MarketInsightsEntryCardSkeleton: () => null,
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
  useAnalytics: jest.fn(() => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder.mockReturnValue({
      addProperties: mockAddProperties,
      build: mockBuild,
    }),
  })),
}));

// Use a stable wrapper so jest.restoreAllMocks() (from testSetup.js afterEach)
// does not wipe the implementation between tests.
const mockPerpsBottomSheetTooltipInner = jest.fn((..._args: unknown[]) => null);
jest.mock('../../Perps/components/PerpsBottomSheetTooltip', () => ({
  __esModule: true,
  default: (...args: unknown[]) => mockPerpsBottomSheetTooltipInner(...args),
}));

jest.mock(
  '../../../../selectors/featureFlagController/tokenOverviewAdvancedChart',
  () => ({
    selectTokenOverviewAdvancedChartEnabled: jest.fn(() => false),
  }),
);

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

jest.mock(
  '../../SecurityTrust/components/SecurityTrustEntryCard/SecurityTrustEntryCard',
  () => ({
    __esModule: true,
    default: ({ testID }: { testID?: string }) => <MockView testID={testID} />,
  }),
);

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

const mockGate = jest.fn(
  async (action: () => Promise<unknown>) => await action(),
);
jest.mock('../../Compliance', () => ({
  useComplianceGate: () => ({
    gate: (action: () => Promise<unknown>) => mockGate(action),
    isBlocked: false,
    isComplianceEnabled: false,
    checkCompliance: jest.fn(),
  }),
}));

const mockMoneyConvertStablecoins = jest.fn((..._args: unknown[]) => null);
jest.mock(
  '../../Money/components/MoneyConvertStablecoins/MoneyConvertStablecoins',
  () => ({
    __esModule: true,
    default: (...args: unknown[]) => mockMoneyConvertStablecoins(...args),
  }),
);

const mockMusdConversionAssetOverviewCta = jest.fn(
  (..._args: unknown[]) => null,
);
jest.mock('../../Earn/components/Musd/MusdConversionAssetOverviewCta', () => ({
  __esModule: true,
  default: (...args: unknown[]) => mockMusdConversionAssetOverviewCta(...args),
}));

const mockUseMusdConversionTokens = jest.fn();
jest.mock('../../Earn/hooks/useMusdConversionTokens', () => ({
  useMusdConversionTokens: (...args: unknown[]) =>
    mockUseMusdConversionTokens(...args),
}));

jest.mock('../../Earn/hooks/useMusdConversionEligibility', () => ({
  useMusdConversionEligibility: () => ({ isEligible: true }),
}));

jest.mock('../../Earn/selectors/featureFlags', () => ({
  ...jest.requireActual('../../Earn/selectors/featureFlags'),
  selectIsMusdConversionFlowEnabledFlag: jest.fn(() => true),
}));

const mockNavigateToCash = jest.fn();
jest.mock('../../../Views/Homepage/Sections/Cash/useCashNavigation', () => ({
  useCashNavigation: () => ({
    navigateToCash: mockNavigateToCash,
    isMoneyHomeEnabled: false,
    hasSeenEducation: false,
  }),
}));

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
  chartNavigationButtons: ['1d', '1w', '1m', '3m', '1y', '3y'],
  isPerpsEnabled: true,
  currentCurrency: 'USD',
  onBuy: jest.fn(),
  onSend: jest.fn().mockResolvedValue(undefined),
  onReceive: jest.fn(),
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

const defaultMarketInsightsResult = {
  report: {
    digestId: 'a8154c57-c665-449c-8bb5-fcaae96ef922',
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

  beforeEach(() => {
    mockUseMusdConversionTokens.mockReturnValue({ tokens: [] });
  });

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

    it('releases the navigation lock when gate() settles without navigating so Long can be pressed again', async () => {
      // Simulate a blocked wallet: gate() shows the compliance modal and
      // returns without invoking the action. Without releasing the nav lock
      // in the finally(), the second press would be silently ignored.
      mockGate.mockImplementationOnce(async () => undefined);
      mockGate.mockImplementationOnce(async () => undefined);

      const { getByTestId } = renderWithProvider(
        <AssetOverviewContent {...defaultProps} />,
        { state: createState(true) },
      );

      await act(async () => {
        fireEvent.press(getByTestId(TokenOverviewSelectorsIDs.LONG_BUTTON));
      });
      expect(mockGate).toHaveBeenCalledTimes(1);

      await act(async () => {
        fireEvent.press(getByTestId(TokenOverviewSelectorsIDs.LONG_BUTTON));
      });
      expect(mockGate).toHaveBeenCalledTimes(2);
      expect(mockHandlePerpsAction).not.toHaveBeenCalled();
    });

    it('releases the navigation lock when gate() settles without navigating so Short can be pressed again', async () => {
      mockGate.mockImplementationOnce(async () => undefined);
      mockGate.mockImplementationOnce(async () => undefined);

      const { getByTestId } = renderWithProvider(
        <AssetOverviewContent {...defaultProps} />,
        { state: createState(true) },
      );

      await act(async () => {
        fireEvent.press(getByTestId(TokenOverviewSelectorsIDs.SHORT_BUTTON));
      });
      expect(mockGate).toHaveBeenCalledTimes(1);

      await act(async () => {
        fireEvent.press(getByTestId(TokenOverviewSelectorsIDs.SHORT_BUTTON));
      });
      expect(mockGate).toHaveBeenCalledTimes(2);
      expect(mockHandlePerpsAction).not.toHaveBeenCalled();
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
        undefined,
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
          token: expect.objectContaining({
            address: '0x123',
            chainId: '0x1',
          }),
        }),
      );
      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.MARKET_INSIGHTS_OPENED,
      );
      expect(mockAddProperties).toHaveBeenCalledWith({
        caip19: 'eip155:1/erc20:0x123',
        source: 'token_details',
        asset_symbol: 'eth',
        digest_id: 'a8154c57-c665-449c-8bb5-fcaae96ef922',
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

      expect(onMarketInsightsDisplayResolved).toHaveBeenCalledWith({
        isDisplayed: false,
        severity: undefined,
      });
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

      expect(onMarketInsightsDisplayResolved).toHaveBeenCalledWith({
        isDisplayed: true,
        severity: undefined,
      });
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

      expect(onMarketInsightsDisplayResolved).toHaveBeenCalledWith({
        isDisplayed: false,
        severity: undefined,
      });
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

  describe('Security Badge', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      mockBuild.mockReturnValue({ category: 'test-event' });
      mockAddProperties.mockReturnValue({ build: mockBuild });
      mockCreateEventBuilder.mockReturnValue({
        addProperties: mockAddProperties,
      });
      mockSelectMarketInsightsEnabled.mockReturnValue(false);
      mockUseMarketInsights.mockReturnValue({
        report: null,
        isLoading: false,
        error: null,
        timeAgo: null,
      });
      mockUsePerpsPositionForAsset.mockReturnValue(defaultPerpsPositionResult);
    });

    it('renders verified badge when securityData resultType is Verified', () => {
      const { getByTestId } = renderWithProvider(
        <AssetOverviewContent
          {...defaultProps}
          securityData={createMockSecurityData('Verified')}
        />,
        { state: createState(true) },
      );

      const badge = getByTestId('security-badge-verified');
      expect(badge).toBeOnTheScreen();
    });

    it('does not render badge when securityData resultType is Benign', () => {
      const { queryByTestId } = renderWithProvider(
        <AssetOverviewContent
          {...defaultProps}
          securityData={createMockSecurityData('Benign')}
        />,
        { state: createState(true) },
      );

      expect(queryByTestId('security-badge-verified')).toBeNull();
      expect(queryByTestId('security-banner-warning')).toBeNull();
      expect(queryByTestId('security-banner-malicious')).toBeNull();
    });

    it('renders warning badge when securityData resultType is Warning', () => {
      const { getByTestId } = renderWithProvider(
        <AssetOverviewContent
          {...defaultProps}
          securityData={createMockSecurityData('Warning')}
        />,
        { state: createState(true) },
      );

      const banner = getByTestId('security-banner-warning');
      expect(banner).toBeOnTheScreen();
    });

    it('renders warning badge when securityData resultType is Spam', () => {
      const { getByTestId } = renderWithProvider(
        <AssetOverviewContent
          {...defaultProps}
          securityData={createMockSecurityData('Spam')}
        />,
        { state: createState(true) },
      );

      const banner = getByTestId('security-banner-warning');
      expect(banner).toBeOnTheScreen();
    });

    it('renders malicious badge when securityData resultType is Malicious', () => {
      const { getByTestId } = renderWithProvider(
        <AssetOverviewContent
          {...defaultProps}
          securityData={createMockSecurityData('Malicious')}
        />,
        { state: createState(true) },
      );

      const banner = getByTestId('security-banner-malicious');
      expect(banner).toBeOnTheScreen();
    });

    it('navigates to security badge bottom sheet when verified badge is pressed', () => {
      const { getByTestId } = renderWithProvider(
        <AssetOverviewContent
          {...defaultProps}
          securityData={createMockSecurityData('Verified')}
        />,
        { state: createState(true) },
      );

      fireEvent.press(getByTestId('security-badge-verified'));

      expect(mockNavigate).toHaveBeenCalledWith(Routes.MODAL.ROOT_MODAL_FLOW, {
        screen: Routes.MODAL.SECURITY_BADGE_BOTTOM_SHEET,
        params: expect.objectContaining({
          title: expect.any(String),
          description: expect.any(String),
          source: 'badge',
          severity: 'Verified',
          tokenAddress: '0x123',
          tokenSymbol: 'ETH',
          chainId: '0x1',
        }),
      });
    });

    it('navigates to security badge bottom sheet when warning badge is pressed', () => {
      const { getByTestId } = renderWithProvider(
        <AssetOverviewContent
          {...defaultProps}
          securityData={createMockSecurityData('Warning')}
        />,
        { state: createState(true) },
      );

      fireEvent.press(getByTestId('security-banner-warning'));

      expect(mockNavigate).toHaveBeenCalledWith(Routes.MODAL.ROOT_MODAL_FLOW, {
        screen: Routes.MODAL.SECURITY_BADGE_BOTTOM_SHEET,
        params: expect.objectContaining({
          title: expect.any(String),
          description: expect.any(String),
          source: 'badge',
          severity: 'Warning',
          tokenAddress: '0x123',
          tokenSymbol: 'ETH',
          chainId: '0x1',
        }),
      });
    });

    it('navigates to security badge bottom sheet when spam badge is pressed', () => {
      const { getByTestId } = renderWithProvider(
        <AssetOverviewContent
          {...defaultProps}
          securityData={createMockSecurityData('Spam')}
        />,
        { state: createState(true) },
      );

      fireEvent.press(getByTestId('security-banner-warning'));

      expect(mockNavigate).toHaveBeenCalledWith(Routes.MODAL.ROOT_MODAL_FLOW, {
        screen: Routes.MODAL.SECURITY_BADGE_BOTTOM_SHEET,
        params: expect.objectContaining({
          title: expect.any(String),
          description: expect.any(String),
          source: 'badge',
          severity: 'Spam',
          tokenAddress: '0x123',
          tokenSymbol: 'ETH',
          chainId: '0x1',
        }),
      });
    });

    it('navigates to security badge bottom sheet when malicious badge is pressed', () => {
      const { getByTestId } = renderWithProvider(
        <AssetOverviewContent
          {...defaultProps}
          securityData={createMockSecurityData('Malicious')}
        />,
        { state: createState(true) },
      );

      fireEvent.press(getByTestId('security-banner-malicious'));

      expect(mockNavigate).toHaveBeenCalledWith(Routes.MODAL.ROOT_MODAL_FLOW, {
        screen: Routes.MODAL.SECURITY_BADGE_BOTTOM_SHEET,
        params: expect.objectContaining({
          title: expect.any(String),
          description: expect.any(String),
          source: 'badge',
          severity: 'Malicious',
          tokenAddress: '0x123',
          tokenSymbol: 'ETH',
          chainId: '0x1',
        }),
      });
    });

    it('does not navigate when benign badge is pressed', () => {
      renderWithProvider(
        <AssetOverviewContent
          {...defaultProps}
          securityData={createMockSecurityData('Benign')}
        />,
        { state: createState(true) },
      );

      // Benign should not render any badge, so there's nothing to press
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('does not render badge when securityData is null', () => {
      const { queryByTestId } = renderWithProvider(
        <AssetOverviewContent {...defaultProps} securityData={null} />,
        { state: createState(true) },
      );

      expect(queryByTestId('security-badge-verified')).toBeNull();
      expect(queryByTestId('security-banner-warning')).toBeNull();
      expect(queryByTestId('security-banner-malicious')).toBeNull();
    });

    it('does not render badge when securityData is undefined', () => {
      const { queryByTestId } = renderWithProvider(
        <AssetOverviewContent {...defaultProps} securityData={undefined} />,
        { state: createState(true) },
      );

      expect(queryByTestId('security-badge-verified')).toBeNull();
      expect(queryByTestId('security-banner-warning')).toBeNull();
      expect(queryByTestId('security-banner-malicious')).toBeNull();
    });

    it('renders malicious warning banner when resultType is Malicious', () => {
      const { getByText } = renderWithProvider(
        <AssetOverviewContent
          {...defaultProps}
          securityData={createMockSecurityData('Malicious')}
        />,
        { state: createState(true) },
      );

      expect(
        getByText(strings('security_trust.malicious_token_title')),
      ).toBeOnTheScreen();
      expect(
        getByText(
          strings('security_trust.malicious_token_description', {
            symbol: 'ETH',
          }),
        ),
      ).toBeOnTheScreen();
    });

    it('does not render malicious warning banner when resultType is not Malicious', () => {
      const { queryByText } = renderWithProvider(
        <AssetOverviewContent
          {...defaultProps}
          securityData={createMockSecurityData('Verified')}
        />,
        { state: createState(true) },
      );

      expect(
        queryByText(strings('security_trust.malicious_token_title')),
      ).toBeNull();
    });
  });

  describe('MoneyConvertStablecoins preferredToken wiring', () => {
    const MUSD_TOKEN_ADDRESS = '0xaca92e438df0b2401ff60da7e4337b687a2435da';

    beforeEach(() => {
      jest.clearAllMocks();
      mockSelectMarketInsightsEnabled.mockReturnValue(false);
      mockUseMarketInsights.mockReturnValue({
        report: null,
        isLoading: false,
        error: null,
        timeAgo: null,
      });
      mockUsePerpsPositionForAsset.mockReturnValue({
        position: null,
        hasFundsInPerps: false,
        accountState: null,
        isLoading: false,
      });
    });

    it('forwards the viewed token as preferredToken when the section is shown', () => {
      const musdToken: TokenI = {
        ...defaultToken,
        address: MUSD_TOKEN_ADDRESS,
        chainId: '0x1',
        symbol: 'mUSD',
        name: 'MetaMask USD',
      };

      renderWithProvider(
        <AssetOverviewContent {...defaultProps} token={musdToken} />,
        { state: createState(true) },
      );

      expect(mockMoneyConvertStablecoins).toHaveBeenCalledWith(
        expect.objectContaining({
          preferredToken: {
            address: musdToken.address,
            chainId: musdToken.chainId,
          },
        }),
        undefined,
      );
    });
  });

  describe('TokenDetailsActions hasBalance prop', () => {
    let tokenDetailsActionsSpy: jest.SpyInstance;

    beforeEach(() => {
      jest.clearAllMocks();
      mockBuild.mockReturnValue({ category: 'test-event' });
      mockAddProperties.mockReturnValue({ build: mockBuild });
      mockCreateEventBuilder.mockReturnValue({
        addProperties: mockAddProperties,
      });
      mockSelectMarketInsightsEnabled.mockReturnValue(false);
      mockUseMarketInsights.mockReturnValue({
        report: null,
        isLoading: false,
        error: null,
        timeAgo: null,
      });
      mockUsePerpsPositionForAsset.mockReturnValue({
        position: null,
        hasFundsInPerps: false,
        accountState: null,
        isLoading: false,
      });
      tokenDetailsActionsSpy = jest.spyOn(
        TokenDetailsActionsModule,
        'TokenDetailsActions',
      );
    });

    afterEach(() => {
      tokenDetailsActionsSpy.mockRestore();
    });

    it.each([
      [false, undefined],
      [false, ''],
      [false, '0'],
      [true, '1,000.50'],
      [true, '1.000,50'],
    ])(
      'passes hasBalance %s when balance is %s',
      (expectedHasBalance, balance) => {
        renderWithProvider(
          <AssetOverviewContent {...defaultProps} balance={balance} />,
          { state: createState(true) },
        );

        expect(tokenDetailsActionsSpy).toHaveBeenCalledWith(
          expect.objectContaining({ hasBalance: expectedHasBalance }),
          undefined,
        );
      },
    );
  });

  describe('mUSD aToken banner and "How it works" block', () => {
    const MUSD_TOKEN_ADDRESS = '0xaca92e438df0b2401ff60da7e4337b687a2435da';

    const musdToken: TokenI = {
      ...defaultToken,
      address: MUSD_TOKEN_ADDRESS,
      chainId: '0x1',
      symbol: 'mUSD',
      name: 'MetaMask USD',
    };

    const createMockAtoken = (symbol: string): TokenI => ({
      address: '0xbcca60bb61934080951369a648fb03df4f96263c',
      chainId: '0x1',
      symbol,
      aggregators: [],
      decimals: 6,
      image: '',
      name: symbol,
      balance: '1000',
      logo: '',
      isETH: false,
    });

    beforeEach(() => {
      jest.clearAllMocks();
      mockSelectMarketInsightsEnabled.mockReturnValue(false);
      mockUseMarketInsights.mockReturnValue({
        report: null,
        isLoading: false,
        error: null,
        timeAgo: null,
      });
      mockUsePerpsPositionForAsset.mockReturnValue(defaultPerpsPositionResult);
    });

    it('renders the aToken banner on the mUSD page when the user holds an aToken', () => {
      const aUSDC = createMockAtoken('aUSDC');
      mockUseMusdConversionTokens.mockReturnValue({
        tokens: [aUSDC],
      });

      renderWithProvider(
        <AssetOverviewContent {...defaultProps} token={musdToken} />,
        { state: createState(true) },
      );

      expect(mockMusdConversionAssetOverviewCta).toHaveBeenCalledWith(
        expect.objectContaining({
          asset: expect.objectContaining({
            symbol: 'aUSDC',
            address: aUSDC.address,
            chainId: aUSDC.chainId,
          }),
          displaySymbol: 'aTokens',
        }),
        undefined,
      );
    });

    it('renders the aToken banner when the user holds any of aUSDC, aUSDT, or aDAI', () => {
      const aDAI = createMockAtoken('aDAI');
      mockUseMusdConversionTokens.mockReturnValue({
        tokens: [aDAI],
      });

      renderWithProvider(
        <AssetOverviewContent {...defaultProps} token={musdToken} />,
        { state: createState(true) },
      );

      expect(mockMusdConversionAssetOverviewCta).toHaveBeenCalledWith(
        expect.objectContaining({
          asset: expect.objectContaining({ symbol: 'aDAI' }),
          displaySymbol: 'aTokens',
        }),
        undefined,
      );
    });

    it('does NOT render the aToken banner when the user holds no aTokens', () => {
      const usdc: TokenI = {
        ...defaultToken,
        address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        chainId: '0x1',
        symbol: 'USDC',
      };
      mockUseMusdConversionTokens.mockReturnValue({
        tokens: [usdc],
      });

      renderWithProvider(
        <AssetOverviewContent {...defaultProps} token={musdToken} />,
        { state: createState(true) },
      );

      expect(mockMusdConversionAssetOverviewCta).not.toHaveBeenCalled();
    });

    it('renders the "How it works" block on the mUSD page', () => {
      mockUseMusdConversionTokens.mockReturnValue({ tokens: [] });

      const { getByText } = renderWithProvider(
        <AssetOverviewContent {...defaultProps} token={musdToken} />,
        { state: createState(true) },
      );

      expect(
        getByText(strings('money.convert_stablecoins.how_it_works_title')),
      ).toBeOnTheScreen();
      expect(
        getByText(
          strings('money.convert_stablecoins.how_it_works_description'),
        ),
      ).toBeOnTheScreen();
    });

    it('renders the hero "3% bonus" tag on the mUSD page and routes via useCashNavigation when pressed', () => {
      mockUseMusdConversionTokens.mockReturnValue({ tokens: [] });

      const { getByTestId } = renderWithProvider(
        <AssetOverviewContent {...defaultProps} token={musdToken} />,
        { state: createState(true) },
      );

      const tag = getByTestId(TokenOverviewSelectorsIDs.MUSD_HERO_BONUS_TAG);
      expect(tag).toBeOnTheScreen();

      fireEvent.press(tag);
      expect(mockNavigateToCash).toHaveBeenCalledTimes(1);
    });

    it('does NOT render the hero "3% bonus" tag on a non-mUSD asset page', () => {
      mockUseMusdConversionTokens.mockReturnValue({ tokens: [] });

      const { queryByTestId } = renderWithProvider(
        <AssetOverviewContent {...defaultProps} token={defaultToken} />,
        { state: createState(true) },
      );

      expect(
        queryByTestId(TokenOverviewSelectorsIDs.MUSD_HERO_BONUS_TAG),
      ).toBeNull();
    });
  });
});
