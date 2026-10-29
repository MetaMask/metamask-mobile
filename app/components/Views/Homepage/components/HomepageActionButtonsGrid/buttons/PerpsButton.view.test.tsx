import '../../../../../../../tests/component-view/mocks';
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { fireEvent } from '@testing-library/react-native';
import { PerpsMode } from '@metamask/perps-controller';
import { initialStateWallet } from '../../../../../../../tests/component-view/presets/wallet';
import {
  createRouteParamsProbe,
  getRouteParamsProbeTestId,
} from '../../../../../../../tests/component-view/render';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import Routes from '../../../../../../constants/navigation/Routes';
import {
  PERPS_HEADER_AB_TEST_KEY,
  PerpsHeaderNavVariant,
} from '../../../../../UI/Perps/abTestConfig';
import HomepageActionButtonsGrid from '../HomepageActionButtonsGrid';
import { HomepageActionButtonsGridTestIds } from '../HomepageActionButtonsGrid.testIds';

const NestedStack = createNativeStackNavigator();
const RootStack = createNativeStackNavigator();

function treatmentState(watchlist: string[]) {
  return initialStateWallet()
    .withOverrides({
      engine: {
        backgroundState: {
          PerpsController: {
            isEligible: true,
            initializationState: 'initialized',
            isTestnet: false,
            isFirstTimeUser: { mainnet: false, testnet: false },
            mode: PerpsMode.Pro,
            watchlistMarkets: { testnet: [], mainnet: watchlist },
          },
          RemoteFeatureFlagController: {
            remoteFeatureFlags: {
              perpsPerpTradingEnabled: {
                enabled: true,
                minimumVersion: '0.0.0',
              },
              perpsProModeEnabled: {
                enabled: true,
                minimumVersion: '0.0.0',
              },
              perpsWatchlistV2Enabled: {
                enabled: true,
                minimumVersion: '0.0.0',
              },
              [PERPS_HEADER_AB_TEST_KEY]: PerpsHeaderNavVariant.Treatment,
            },
          },
        },
      },
    })
    .build() as unknown as Record<string, unknown>;
}

function renderActionGrid(state: Record<string, unknown>) {
  const PerpsRoot = () => (
    <NestedStack.Navigator>
      <NestedStack.Screen
        name={Routes.PERPS.MARKET_LIST}
        component={createRouteParamsProbe(Routes.PERPS.MARKET_LIST)}
      />
    </NestedStack.Navigator>
  );

  const tree = (
    <RootStack.Navigator>
      <RootStack.Screen name="HomepageActions">
        {() => (
          <HomepageActionButtonsGrid
            rowOrder="row1Top"
            onSend={() => undefined}
            onReceive={() => undefined}
          />
        )}
      </RootStack.Screen>
      <RootStack.Screen
        name={Routes.PERPS.ROOT}
        component={PerpsRoot as unknown as React.ComponentType}
      />
    </RootStack.Navigator>
  );

  return renderWithProvider(tree, { state });
}

describe('HomepageActionButtonsGrid Perps button', () => {
  it('opens the market list for a Pro treatment user with a saved symbol', async () => {
    const { getByTestId, findByTestId } = renderActionGrid(
      treatmentState(['ETH']),
    );

    fireEvent.press(getByTestId(HomepageActionButtonsGridTestIds.PERPS_BUTTON));

    const probe = await findByTestId(
      getRouteParamsProbeTestId(Routes.PERPS.MARKET_LIST),
    );

    expect(JSON.parse(String(probe.props.children))).toEqual(
      expect.objectContaining({ showWatchlistOnly: true }),
    );
  });
});
