import '../../../../tests/component-view/mocks';
import React from 'react';
import { Text } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { fireEvent } from '@testing-library/react-native';
import { renderWalletActionsView } from '../../../../tests/component-view/renderers/walletActions';
import { WalletActionsBottomSheetSelectorsIDs } from './WalletActionsBottomSheet.testIds';
import { describeForPlatforms } from '../../../../tests/component-view/platform';
import {
  renderScreenWithRoutes,
  getRouteProbeTestId,
} from '../../../../tests/component-view/render';
import renderWithProvider from '../../../util/test/renderWithProvider';
import Routes from '../../../constants/navigation/Routes';
import { initialStateWalletActions } from '../../../../tests/component-view/presets/walletActions';
import WalletActions from '.';

const NestedStack = createNativeStackNavigator();
const RootStack = createNativeStackNavigator();

const RouteProbe =
  (routeName: string): React.FC =>
  () => <Text testID={getRouteProbeTestId(routeName)}>{routeName}</Text>;

/**
 * Earn wallet action also hides when the only earn token is ETH and pooled
 * staking is off (see WalletActions `isEarnWalletActionEnabled`). That gate is
 * intentional product logic — not a CV false positive. CV state surfaces native
 * ETH via `selectEarnTokens`, so showing Earn requires pooled staking (or
 * additional non-ETH earn tokens) in addition to lending.
 */
const lendingOnlyFlags = {
  earnStablecoinLendingEnabled: {
    enabled: true,
    minimumVersion: '1.0.0',
  },
};

const earnFeatureFlags = {
  ...lendingOnlyFlags,
  earnPooledStakingEnabled: {
    enabled: true,
    minimumVersion: '1.0.0',
  },
};

/**
 * WalletActions navigates to nested roots (Perps / Predict / Stake). Register a
 * nested stack under ROOT so route probes work without mocking navigation.
 */
function renderWalletActionsWithNestedRoot(options: {
  rootName: string;
  nestedScreenName: string;
  state: Record<string, unknown>;
}) {
  const { rootName, nestedScreenName, state } = options;

  const NestedRoot = () => (
    <NestedStack.Navigator>
      <NestedStack.Screen
        name={nestedScreenName}
        component={RouteProbe(nestedScreenName)}
      />
    </NestedStack.Navigator>
  );

  const tree = (
    <RootStack.Navigator>
      <RootStack.Screen
        name={Routes.MODAL.WALLET_ACTIONS}
        component={WalletActions as unknown as React.ComponentType}
      />
      <RootStack.Screen
        name={rootName}
        component={NestedRoot as unknown as React.ComponentType}
      />
    </RootStack.Navigator>
  );

  return renderWithProvider(tree, { state });
}

// Regression: #24972 – Perps missing from Trade menu when non-EVM network selected
describeForPlatforms('WalletActions', () => {
  it('shows Perps button when non-EVM network is selected', () => {
    const { getByTestId } = renderWalletActionsView({
      isEvmSelected: false,
    });

    expect(
      getByTestId(WalletActionsBottomSheetSelectorsIDs.PERPS_BUTTON),
    ).toBeOnTheScreen();
  });

  // Migrated from tests/smoke/swap/unified-ui-wallet-actions.spec.ts
  it('shows swap button for EVM account and navigates to bridge view when pressed', async () => {
    const state = initialStateWalletActions({
      isEvmSelected: true,
    }).build() as unknown as Record<string, unknown>;

    const { getByTestId, findByTestId } = renderScreenWithRoutes(
      WalletActions as unknown as React.ComponentType,
      { name: Routes.MODAL.WALLET_ACTIONS },
      [{ name: Routes.BRIDGE.ROOT }],
      { state },
    );

    fireEvent.press(
      getByTestId(WalletActionsBottomSheetSelectorsIDs.SWAP_BUTTON),
    );

    expect(
      await findByTestId(getRouteProbeTestId(Routes.BRIDGE.ROOT)),
    ).toBeOnTheScreen();
  });

  it('navigates to Perps home when a returning user presses Perps', async () => {
    const state = initialStateWalletActions({ isEvmSelected: true })
      .withOverrides({
        engine: {
          backgroundState: {
            PerpsController: {
              isFirstTimeUser: { mainnet: false, testnet: false },
            },
          },
        },
      })
      .build() as unknown as Record<string, unknown>;

    const { getByTestId, findByTestId } = renderWalletActionsWithNestedRoot({
      rootName: Routes.PERPS.ROOT,
      nestedScreenName: Routes.PERPS.PERPS_HOME,
      state,
    });

    fireEvent.press(
      getByTestId(WalletActionsBottomSheetSelectorsIDs.PERPS_BUTTON),
    );

    expect(
      await findByTestId(getRouteProbeTestId(Routes.PERPS.PERPS_HOME)),
    ).toBeOnTheScreen();
  });

  it('navigates to Perps tutorial when a first-time user presses Perps', async () => {
    const state = initialStateWalletActions({ isEvmSelected: true })
      .withOverrides({
        engine: {
          backgroundState: {
            PerpsController: {
              isFirstTimeUser: { mainnet: true, testnet: true },
            },
          },
        },
      })
      .build() as unknown as Record<string, unknown>;

    const { getByTestId, findByTestId } = renderScreenWithRoutes(
      WalletActions as unknown as React.ComponentType,
      { name: Routes.MODAL.WALLET_ACTIONS },
      [{ name: Routes.PERPS.TUTORIAL }],
      { state },
    );

    fireEvent.press(
      getByTestId(WalletActionsBottomSheetSelectorsIDs.PERPS_BUTTON),
    );

    expect(
      await findByTestId(getRouteProbeTestId(Routes.PERPS.TUTORIAL)),
    ).toBeOnTheScreen();
  });

  it('shows Predict button and navigates to market list when pressed', async () => {
    const state = initialStateWalletActions({ isEvmSelected: true })
      .withRemoteFeatureFlags({
        perpsPerpTradingEnabled: {
          enabled: true,
          minimumVersion: '1.0.0',
        },
        predictTradingEnabled: {
          enabled: true,
          featureVersion: '1.0.0',
          minimumVersion: '0.0.1',
        },
      })
      .build() as unknown as Record<string, unknown>;

    const { getByTestId, findByTestId } = renderWalletActionsWithNestedRoot({
      rootName: Routes.PREDICT.ROOT,
      nestedScreenName: Routes.PREDICT.MARKET_LIST,
      state,
    });

    fireEvent.press(
      getByTestId(WalletActionsBottomSheetSelectorsIDs.PREDICT_BUTTON),
    );

    expect(
      await findByTestId(getRouteProbeTestId(Routes.PREDICT.MARKET_LIST)),
    ).toBeOnTheScreen();
  });

  it('shows Earn when stablecoin lending is enabled and the account is eligible', () => {
    const { getByTestId, queryByTestId } = renderWalletActionsView({
      isEvmSelected: true,
      remoteFeatureFlags: earnFeatureFlags,
    });

    expect(
      getByTestId(WalletActionsBottomSheetSelectorsIDs.EARN_BUTTON),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(WalletActionsBottomSheetSelectorsIDs.EARN_BUTTON),
    ).not.toBeNull();
  });

  it('hides Earn when the account is not earn-eligible', () => {
    const { queryByTestId } = renderWalletActionsView({
      isEvmSelected: true,
      remoteFeatureFlags: earnFeatureFlags,
      overrides: {
        engine: {
          backgroundState: {
            EarnController: {
              pooled_staking: { isEligible: false },
              lending: { positions: [], markets: [] },
            },
          },
        },
      },
    });

    expect(
      queryByTestId(WalletActionsBottomSheetSelectorsIDs.EARN_BUTTON),
    ).toBeNull();
  });

  it('hides Earn when lending is on but pooled staking is off and only ETH is earnable', () => {
    const { queryByTestId } = renderWalletActionsView({
      isEvmSelected: true,
      remoteFeatureFlags: lendingOnlyFlags,
    });

    expect(
      queryByTestId(WalletActionsBottomSheetSelectorsIDs.EARN_BUTTON),
    ).toBeNull();
  });

  it('navigates to Earn token list when Earn is pressed', async () => {
    const state = initialStateWalletActions({ isEvmSelected: true })
      .withRemoteFeatureFlags({
        perpsPerpTradingEnabled: {
          enabled: true,
          minimumVersion: '1.0.0',
        },
        ...earnFeatureFlags,
      })
      .build() as unknown as Record<string, unknown>;

    const { getByTestId, findByTestId } = renderWalletActionsWithNestedRoot({
      rootName: 'StakeModals',
      nestedScreenName: Routes.STAKING.MODALS.EARN_TOKEN_LIST,
      state,
    });

    fireEvent.press(
      getByTestId(WalletActionsBottomSheetSelectorsIDs.EARN_BUTTON),
    );

    expect(
      await findByTestId(
        getRouteProbeTestId(Routes.STAKING.MODALS.EARN_TOKEN_LIST),
      ),
    ).toBeOnTheScreen();
  });

  it('does not navigate when action buttons are pressed and the account cannot sign', async () => {
    const state = initialStateWalletActions({ isEvmSelected: true })
      .withRemoteFeatureFlags({
        perpsPerpTradingEnabled: {
          enabled: true,
          minimumVersion: '1.0.0',
        },
        predictTradingEnabled: {
          enabled: true,
          featureVersion: '1.0.0',
          minimumVersion: '0.0.1',
        },
        ...earnFeatureFlags,
      })
      .withOverrides({
        engine: {
          backgroundState: {
            AccountsController: {
              internalAccounts: {
                accounts: {
                  'acc-1': {
                    id: 'acc-1',
                    address: '0x0000000000000000000000000000000000000001',
                    methods: [],
                    type: 'eip155:eoa',
                    scopes: ['eip155:0'],
                    options: {},
                    metadata: {
                      name: 'Account 1',
                      importTime: Date.now(),
                      keyring: { type: 'HD Key Tree' },
                    },
                  },
                },
                selectedAccount: 'acc-1',
              },
            },
            PerpsController: {
              isFirstTimeUser: { mainnet: false, testnet: false },
            },
          },
        },
      })
      .build() as unknown as Record<string, unknown>;

    const { getByTestId, queryByTestId } = renderWalletActionsWithNestedRoot({
      rootName: Routes.PERPS.ROOT,
      nestedScreenName: Routes.PERPS.PERPS_HOME,
      state,
    });

    const swapButton = getByTestId(
      WalletActionsBottomSheetSelectorsIDs.SWAP_BUTTON,
    );
    const perpsButton = getByTestId(
      WalletActionsBottomSheetSelectorsIDs.PERPS_BUTTON,
    );
    const earnButton = getByTestId(
      WalletActionsBottomSheetSelectorsIDs.EARN_BUTTON,
    );
    const predictButton = getByTestId(
      WalletActionsBottomSheetSelectorsIDs.PREDICT_BUTTON,
    );

    expect(swapButton).toBeDisabled();
    expect(perpsButton).toBeDisabled();
    expect(earnButton).toBeDisabled();
    expect(predictButton).toBeDisabled();

    fireEvent.press(swapButton);
    fireEvent.press(perpsButton);
    fireEvent.press(earnButton);
    fireEvent.press(predictButton);

    expect(
      queryByTestId(getRouteProbeTestId(Routes.PERPS.PERPS_HOME)),
    ).toBeNull();
  });
});
