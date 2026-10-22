import '../../../../../tests/component-view/mocks';
import React from 'react';
import { Text } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { merge } from 'lodash';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import renderWithProvider, {
  type ProviderValues,
} from '../../../../util/test/renderWithProvider';

import AssetOverviewContent, {
  type AssetOverviewContentProps,
} from './AssetOverviewContent';
import { TokenI } from '../../Tokens/types';
import { TimePeriod } from '../../../hooks/useTokenHistoricalPrices';
import { TokenOverviewSelectorsIDs } from '../../AssetOverview/TokenOverview.testIds';
import { MarketInsightsSelectorsIDs } from '../../MarketInsights/MarketInsights.testIds';
import { remoteFeatureFlagMarketInsightsEnabled } from '../../../../../tests/api-mocking/mock-responses/feature-flags-mocks';
import {
  MOCK_PERPS_MARKET_INSIGHTS_REPORT,
  setupMarketInsightsEngineMock,
} from '../../../../../tests/component-view/fixtures/perpsMarketInsights';
import { initialStateAssetDetails } from '../../../../../tests/component-view/presets/assetDetails';
import {
  fiatOrdersRampRoutingSupported,
  initialStateMarketInsightsView,
} from '../../../../../tests/component-view/presets/marketInsightsView';
import { describeForPlatforms } from '../../../../../tests/component-view/platform';
import {
  getRouteProbeTestId,
  renderScreenWithRoutes,
} from '../../../../../tests/component-view/render';
import {
  clearRecurringOrdersDataServiceMock,
  setupRecurringOrdersDataServiceMock,
} from '../../../../../tests/component-view/api-mocking/recurringOrders';
import {
  clearLimitOrdersDataServiceMock,
  setupLimitOrdersDataServiceMock,
} from '../../../../../tests/component-view/api-mocking/limitOrders';
import Routes from '../../../../constants/navigation/Routes';
import MarketInsightsView from '../../MarketInsights/Views/MarketInsightsView/MarketInsightsView';
import { AccessRestrictedProvider } from '../../Compliance';
import { HardwareWalletProvider } from '../../../../core/HardwareWallet/HardwareWalletProvider';
import { TokenDetails } from '../Views/TokenDetails';
import {
  MOCK_RECURRING_OPEN_ORDER,
  MOCK_RECURRING_OPEN_ORDER_3,
} from '../../Bridge/api/recurringOrders.mock';
import { RecurringOrderDetailsViewSelectorsIDs } from '../../Bridge/Views/RecurringOrderDetailsView/RecurringOrderDetailsView.testIds';
import { MOCK_LIMIT_OPEN_ORDER } from '../../Bridge/api/limitOrders/getLimitOrders/mock';
import { OpenOrderRowSelectorsIDs } from '../../Bridge/components/OpenOrderRow/OpenOrderRow.testIds';
import Engine from '../../../../core/Engine';

const ETH_NATIVE = '0x0000000000000000000000000000000000000000';

const ethMainnetToken: TokenI = {
  address: ETH_NATIVE,
  chainId: '0x1',
  symbol: 'ETH',
  name: 'Ethereum',
  decimals: 18,
  balance: '1',
  balanceFiat: '$2000',
  logo: '',
  image: '',
  isETH: true,
  isNative: true,
  hasBalanceError: false,
  aggregators: [],
};

const usdcMainnetToken: TokenI = {
  address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  chainId: '0x1',
  symbol: 'USDC',
  name: 'USD Coin',
  decimals: 6,
  balance: '100',
  balanceFiat: '$100',
  logo: '',
  image: '',
  isETH: false,
  isNative: false,
  hasBalanceError: false,
  aggregators: [],
};

const baseOverviewProps: AssetOverviewContentProps = {
  token: ethMainnetToken,
  balance: '1',
  mainBalance: '$2,000.00',
  secondaryBalance: '1 ETH',
  currentPrice: 2000,
  priceDiff: 0,
  comparePrice: 2000,
  prices: [],
  isLoading: false,
  timePeriod: '1d' as TimePeriod,
  setTimePeriod: () => undefined,
  chartNavigationButtons: ['1d', '1w', '1m', '3m', '1y', '3y'],
  currentCurrency: 'USD',
  onBuy: () => undefined,
  onSend: async () => undefined,
  onReceive: () => undefined,
};

function AssetOverviewContentHarness() {
  return <AssetOverviewContent {...baseOverviewProps} />;
}

function renderAssetOverviewMarketInsightsStack(
  extraRoutes: {
    name: string;
    Component?: React.ComponentType<unknown>;
  }[],
  providerValues: ProviderValues,
) {
  const Stack = createNativeStackNavigator();
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });

  const DefaultRouteProbe =
    (routeName: string): React.FC =>
    () => <Text testID={`route-${routeName}`}>{routeName}</Text>;

  return renderWithProvider(
    <QueryClientProvider client={queryClient}>
      <AccessRestrictedProvider>
        <Stack.Navigator>
          <Stack.Screen
            name="AssetOverviewMI"
            component={AssetOverviewContentHarness}
          />
          {extraRoutes.map(({ name, Component: Extra }) => (
            <Stack.Screen
              key={name}
              name={name}
              component={Extra ?? DefaultRouteProbe(name)}
            />
          ))}
        </Stack.Navigator>
      </AccessRestrictedProvider>
    </QueryClientProvider>,
    providerValues,
  );
}

/**
 * Bridge + ramps + multichain balances (MarketInsightsView preset) merged with Asset
 * Details preset so `AssetOverviewContent` selectors (Earn, staking, etc.) resolve.
 */
function buildTokenDetailsMarketInsightsState(
  marketInsightsFlagEnabled: boolean,
) {
  return merge(
    {},
    initialStateAssetDetails({ deterministicFiat: true }).build(),
    initialStateMarketInsightsView()
      .withOverrides(fiatOrdersRampRoutingSupported)
      .build(),
    {
      engine: {
        backgroundState: {
          TokenListController: {
            tokensChainsCache: {},
          },
          RemoteFeatureFlagController: {
            remoteFeatureFlags: remoteFeatureFlagMarketInsightsEnabled(
              marketInsightsFlagEnabled,
            ),
          },
          EarnController: {
            pooled_staking: { isEligible: false },
            lending: { positions: [], markets: [] },
          },
          MoneyAccountController: {
            moneyAccounts: {},
          },
        },
      },
    },
  );
}

function buildTokenDetailsOrdersState({
  isRecurringBuyEnabled = true,
  recurringBuyEnabledChainIds = ['eip155:1'],
  isLimitOrderEnabled = true,
}: {
  isRecurringBuyEnabled?: boolean;
  recurringBuyEnabledChainIds?: string[];
  isLimitOrderEnabled?: boolean;
} = {}) {
  return merge({}, buildTokenDetailsMarketInsightsState(false), {
    engine: {
      backgroundState: {
        NftController: {
          allNfts: {},
          allNftContracts: {},
          ignoredNfts: [],
        },
        RemoteFeatureFlagController: {
          remoteFeatureFlags: {
            ...remoteFeatureFlagMarketInsightsEnabled(false),
            swapsRecurringBuy: {
              enabled: isRecurringBuyEnabled,
              enabledChainIds: recurringBuyEnabledChainIds,
            },
            swapsLimitOrder: {
              enabled: isLimitOrderEnabled,
              enabledChainIds: ['eip155:1'],
              baseUrl: 'https://limit-orders.test',
            },
          },
        },
      },
    },
  });
}

function TokenDetailsOrdersHarness() {
  return (
    <HardwareWalletProvider>
      <AccessRestrictedProvider>
        <TokenDetails />
      </AccessRestrictedProvider>
    </HardwareWalletProvider>
  );
}

describeForPlatforms(
  'AssetOverviewContent (Market Insights entry card)',
  () => {
    it('does not show entry card or skeleton after fetch when API returns no report', async () => {
      setupMarketInsightsEngineMock(null);

      renderAssetOverviewMarketInsightsStack(
        [
          {
            name: Routes.MARKET_INSIGHTS.VIEW,
            Component:
              MarketInsightsView as unknown as React.ComponentType<unknown>,
          },
        ],
        { state: buildTokenDetailsMarketInsightsState(true) },
      );

      await waitFor(
        () => {
          expect(
            screen.queryByTestId(
              MarketInsightsSelectorsIDs.ENTRY_CARD_SKELETON,
            ),
          ).toBeNull();
        },
        { timeout: 15000 },
      );
      expect(
        screen.queryByTestId(MarketInsightsSelectorsIDs.ENTRY_CARD),
      ).toBeNull();
    });

    it('does not show entry card when market insights feature flag is off', async () => {
      setupMarketInsightsEngineMock(MOCK_PERPS_MARKET_INSIGHTS_REPORT);

      renderAssetOverviewMarketInsightsStack(
        [
          {
            name: Routes.MARKET_INSIGHTS.VIEW,
            Component:
              MarketInsightsView as unknown as React.ComponentType<unknown>,
          },
        ],
        { state: buildTokenDetailsMarketInsightsState(false) },
      );

      expect(
        await screen.findByTestId(TokenOverviewSelectorsIDs.CONTAINER),
      ).toBeOnTheScreen();

      await waitFor(() => {
        expect(
          screen.queryByTestId(MarketInsightsSelectorsIDs.ENTRY_CARD_SKELETON),
        ).toBeNull();
      });
      expect(
        screen.queryByTestId(MarketInsightsSelectorsIDs.ENTRY_CARD),
      ).toBeNull();
    });

    it('shows entry card when report exists and opens Market Insights on press', async () => {
      setupMarketInsightsEngineMock(MOCK_PERPS_MARKET_INSIGHTS_REPORT);

      renderAssetOverviewMarketInsightsStack(
        [
          {
            name: Routes.MARKET_INSIGHTS.VIEW,
            Component:
              MarketInsightsView as unknown as React.ComponentType<unknown>,
          },
          { name: Routes.BRIDGE.ROOT },
          { name: Routes.RAMP.TOKEN_SELECTION },
        ],
        { state: buildTokenDetailsMarketInsightsState(true) },
      );

      const entryCard = await screen.findByTestId(
        MarketInsightsSelectorsIDs.ENTRY_CARD,
        {},
        { timeout: 15000 },
      );
      fireEvent.press(entryCard);

      expect(
        await screen.findByTestId(MarketInsightsSelectorsIDs.VIEW_CONTAINER),
      ).toBeOnTheScreen();
    });
  },
);

describeForPlatforms('Token Details Orders section', () => {
  beforeEach(() => {
    setupRecurringOrdersDataServiceMock();
    setupLimitOrdersDataServiceMock();
    jest.mocked(Engine.controllerMessenger.call).mockClear();
  });

  afterEach(() => {
    clearLimitOrdersDataServiceMock();
    clearRecurringOrdersDataServiceMock();
  });

  function renderTokenDetails({
    token = ethMainnetToken,
    isRecurringBuyEnabled = true,
    recurringBuyEnabledChainIds = ['eip155:1'],
    isLimitOrderEnabled = true,
  }: {
    token?: TokenI;
    isRecurringBuyEnabled?: boolean;
    recurringBuyEnabledChainIds?: string[];
    isLimitOrderEnabled?: boolean;
  } = {}) {
    return renderScreenWithRoutes(
      TokenDetailsOrdersHarness,
      { name: 'TokenDetailsOrders' },
      [{ name: Routes.BRIDGE.ROOT }, { name: Routes.BRIDGE.MODALS.ROOT }],
      {
        state: buildTokenDetailsOrdersState({
          isRecurringBuyEnabled,
          recurringBuyEnabledChainIds,
          isLimitOrderEnabled,
        }),
      },
      { ...token },
    );
  }

  it('shows the newest matching order fields and opens its details', async () => {
    renderTokenDetails();

    await waitFor(() => {
      expect(Engine.controllerMessenger.call).toHaveBeenCalledWith(
        'RecurringOrdersDataService:getRecurringOrdersByAsset',
        expect.anything(),
      );
      expect(Engine.controllerMessenger.call).toHaveBeenCalledWith(
        'LimitOrdersDataService:getLimitOrders',
        expect.anything(),
      );
    });
    const row = await screen.findByTestId(
      RecurringOrderDetailsViewSelectorsIDs.OPEN_ORDER_ROW(
        MOCK_RECURRING_OPEN_ORDER_3.orderId,
      ),
      {},
      { timeout: 15000 },
    );

    expect(screen.getByText('ETH → USDC')).toBeOnTheScreen();
    expect(screen.getByText('1 day × 5 orders')).toBeOnTheScreen();
    expect(screen.getByText('+9 USDC')).toBeOnTheScreen();
    expect(screen.getByText('60% filled')).toBeOnTheScreen();
    expect(
      screen.queryByTestId(
        RecurringOrderDetailsViewSelectorsIDs.OPEN_ORDER_ROW(
          MOCK_RECURRING_OPEN_ORDER.orderId,
        ),
      ),
    ).toBeNull();

    fireEvent.press(row);

    expect(
      await screen.findByTestId(getRouteProbeTestId(Routes.BRIDGE.ROOT)),
    ).toBeOnTheScreen();
  });

  it('does not query recurring orders when recurring buy is disabled', async () => {
    renderTokenDetails({ isRecurringBuyEnabled: false });

    await waitFor(() => {
      expect(Engine.controllerMessenger.call).toHaveBeenCalledWith(
        'LimitOrdersDataService:getLimitOrders',
        expect.anything(),
      );
    });
    expect(
      screen.queryByTestId(
        RecurringOrderDetailsViewSelectorsIDs.OPEN_ORDER_ROW(
          MOCK_RECURRING_OPEN_ORDER_3.orderId,
        ),
      ),
    ).toBeNull();
    expect(Engine.controllerMessenger.call).not.toHaveBeenCalledWith(
      'RecurringOrdersDataService:getRecurringOrdersByAsset',
      expect.anything(),
    );
  });

  it('does not query recurring orders when the asset chain is disabled', async () => {
    renderTokenDetails({
      recurringBuyEnabledChainIds: ['eip155:137'],
    });

    await waitFor(() => {
      expect(Engine.controllerMessenger.call).toHaveBeenCalledWith(
        'LimitOrdersDataService:getLimitOrders',
        expect.anything(),
      );
    });
    expect(Engine.controllerMessenger.call).not.toHaveBeenCalledWith(
      'RecurringOrdersDataService:getRecurringOrdersByAsset',
      expect.anything(),
    );
  });

  it('hides the section when no order matches the asset', async () => {
    clearRecurringOrdersDataServiceMock();
    setupRecurringOrdersDataServiceMock({
      recurringOrdersByAsset: async () => [],
    });
    setupLimitOrdersDataServiceMock();
    jest.mocked(Engine.controllerMessenger.call).mockClear();

    renderTokenDetails();

    await waitFor(() => {
      expect(Engine.controllerMessenger.call).toHaveBeenCalledWith(
        'RecurringOrdersDataService:getRecurringOrdersByAsset',
        expect.objectContaining({
          assetId: 'eip155:1/slip44:60',
        }),
      );
    });
    expect(
      screen.queryByTestId(TokenOverviewSelectorsIDs.ORDERS_SECTION),
    ).toBeNull();
  });

  it.each([
    {
      name: 'source ETH',
      token: ethMainnetToken,
      assetId: 'eip155:1/slip44:60',
    },
    {
      name: 'destination USDC',
      token: usdcMainnetToken,
      assetId: 'eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    },
  ])(
    'shows the newest matching limit order for $name',
    async ({ token, assetId }) => {
      clearLimitOrdersDataServiceMock();
      setupRecurringOrdersDataServiceMock();
      setupLimitOrdersDataServiceMock({
        limitOrders: async () => ({
          orders: [MOCK_LIMIT_OPEN_ORDER],
          total: 1,
        }),
      });

      renderTokenDetails({ token });

      expect(
        await screen.findByTestId(OpenOrderRowSelectorsIDs.CONTAINER),
      ).toBeOnTheScreen();
      expect(Engine.controllerMessenger.call).toHaveBeenCalledWith(
        'LimitOrdersDataService:getLimitOrders',
        expect.objectContaining({
          assetId,
          limit: 1,
        }),
      );
      expect(
        screen.queryByTestId(
          RecurringOrderDetailsViewSelectorsIDs.OPEN_ORDER_ROW(
            MOCK_RECURRING_OPEN_ORDER_3.orderId,
          ),
        ),
      ).toBeNull();
    },
  );

  it('opens limit order details from the newest order row', async () => {
    clearLimitOrdersDataServiceMock();
    setupRecurringOrdersDataServiceMock();
    setupLimitOrdersDataServiceMock({
      limitOrders: async () => ({
        orders: [MOCK_LIMIT_OPEN_ORDER],
        total: 1,
      }),
    });
    renderTokenDetails();

    fireEvent.press(
      await screen.findByTestId(OpenOrderRowSelectorsIDs.CONTAINER),
    );

    expect(
      await screen.findByTestId(getRouteProbeTestId(Routes.BRIDGE.MODALS.ROOT)),
    ).toBeOnTheScreen();
  });

  it('opens the Limit UI from the header when a limit order is newest', async () => {
    clearLimitOrdersDataServiceMock();
    setupRecurringOrdersDataServiceMock();
    setupLimitOrdersDataServiceMock({
      limitOrders: async () => ({
        orders: [MOCK_LIMIT_OPEN_ORDER],
        total: 1,
      }),
    });
    renderTokenDetails();
    await screen.findByTestId(OpenOrderRowSelectorsIDs.CONTAINER);

    fireEvent.press(
      screen.getByTestId(TokenOverviewSelectorsIDs.ORDERS_HEADER),
    );

    expect(
      await screen.findByTestId(getRouteProbeTestId(Routes.BRIDGE.ROOT)),
    ).toBeOnTheScreen();
  });
});
