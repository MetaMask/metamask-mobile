import '../../../../../tests/component-view/mocks';
import React from 'react';
import { Text } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
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
import Routes from '../../../../constants/navigation/Routes';
import MarketInsightsView from '../../MarketInsights/Views/MarketInsightsView/MarketInsightsView';
import { AccessRestrictedProvider } from '../../Compliance';

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
  isPerpsEnabled: false,
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
  const Stack = createStackNavigator();

  const DefaultRouteProbe =
    (routeName: string): React.FC =>
    () => <Text testID={`route-${routeName}`}>{routeName}</Text>;

  return renderWithProvider(
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
    </AccessRestrictedProvider>,
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
        },
      },
    },
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

    it('does not show entry card when market insights feature flag is off', () => {
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
