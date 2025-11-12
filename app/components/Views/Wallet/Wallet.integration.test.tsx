import React from 'react';
import deviceStateFixture from '../../../../state-logs-v7.59.0-(2968).json';
import { renderIntegrationScreen } from '../../../util/test/integration/render';
import type { DeepPartial } from '../../../util/test/renderWithProvider';
import type { RootState } from '../../../reducers';
import Wallet from '.';
import Routes from '../../../constants/navigation/Routes';
import { WalletViewSelectorsIDs } from '../../../../e2e/selectors/wallet/WalletView.selectors';

// Single Engine mock: provide controllers as plain objects (no jest.fn),
// wired to no-op methods; state is sourced from the Redux store preload.
jest.mock('../../../core/Engine', () => {
  const engine = {
    context: {
      AccountTrackerController: {
        refresh() {
          return undefined;
        },
      },
      GasFeeController: {
        startPolling() {
          return undefined;
        },
        stopPollingByPollingToken() {
          return undefined;
        },
      },
      PreferencesController: {
        setTokenNetworkFilter() {
          return undefined;
        },
      },
      TokensController: {
        addTokens() {
          return undefined;
        },
      },
      NftDetectionController: {
        detectNfts() {
          return undefined;
        },
      },
      CurrencyRateController: {
        startPolling() {
          return undefined;
        },
        stopPollingByPollingToken() {
          return undefined;
        },
      },
      TokenRatesController: {
        startPolling() {
          return undefined;
        },
        stopPollingByPollingToken() {
          return undefined;
        },
      },
      TokenListController: {
        startPolling() {
          return undefined;
        },
        stopPollingByPollingToken() {
          return undefined;
        },
      },
      TokenBalancesController: {
        startPolling() {
          return undefined;
        },
        stopPollingByPollingToken() {
          return undefined;
        },
      },
      TokenDetectionController: {
        startPolling() {
          return undefined;
        },
        stopPollingByPollingToken() {
          return undefined;
        },
      },
      MultichainAssetsRatesController: {
        startPolling() {
          return undefined;
        },
        stopPollingByPollingToken() {
          return undefined;
        },
      },
      NetworkController: {
        state: { networksMetadata: {} },
        findNetworkClientIdByChainId() {
          return '';
        },
        getNetworkConfigurationByNetworkClientId() {
          return null;
        },
      },
    },
    getTotalEvmFiatAccountBalance() {
      return { balance: '0', fiatBalance: '0' };
    },
    async lookupEnabledNetworks() {
      return undefined;
    },
  };
  return { __esModule: true, default: engine };
});

// Also provide a minimal singleton for Engine/Engine consumers
jest.mock('../../../core/Engine/Engine', () => {
  const singleton = {
    get context() {
      return {
        MultichainNetworkController: {
          async getNetworksWithTransactionActivityByAccounts() {
            return undefined;
          },
        },
      };
    },
    get controllerMessenger() {
      return {
        subscribe() {
          return undefined;
        },
        unsubscribe() {
          return undefined;
        },
      };
    },
  };
  return { __esModule: true, default: singleton };
});

// Provide deterministic app version for version-gated feature flags
jest.mock('react-native-device-info', () => ({
  __esModule: true,
  getVersion: () => '99.0.0',
}));

// Do not mock modals/components: we aim to stay as close as possible.
// Only the Engine import is replaced by a static in-memory object.

describe('Wallet (background-only integration)', () => {
  it('renders wallet home with minimal state and shows key UI elements', () => {
    // Load device state logs from JSON fixture (no Node built-ins)
    const deviceState = deviceStateFixture as unknown as DeepPartial<RootState>;

    // Minimal guard rails to avoid banners/effects loops
    const bg = (deviceState.engine?.backgroundState ?? {}) as unknown as Record<
      string,
      unknown
    >;
    const prefs = (bg?.PreferencesController ?? {}) as unknown as Record<
      string,
      unknown
    >;
    const rewards = (bg?.RewardsController ?? {}) as unknown as Record<
      string,
      unknown
    >;
    const accountsCtl = (bg?.AccountsController ?? {}) as unknown as {
      internalAccounts?: {
        accounts?: Record<string, { id: string }>;
        selectedAccount?: string;
      };
    };
    const accountTree = (bg?.AccountTreeController ?? {}) as unknown as {
      accountTree?: {
        selectedAccountGroup?: unknown;
        wallets?: Record<string, unknown>;
      };
    };

    // Derive selected account id
    const availableAccounts = accountsCtl?.internalAccounts?.accounts ?? {};
    const selectedAccountId =
      accountsCtl?.internalAccounts?.selectedAccount ??
      Object.keys(availableAccounts)[0];
    const normalizedSelectedAccountId =
      typeof selectedAccountId === 'string' ? selectedAccountId : '';

    // Build a minimal valid account group structure containing the selected account
    const GROUP_ID = 'entropy:wallet1/0';
    const WALLETS_KEY = 'entropy:wallet1';
    const normalizedAccountTree = {
      selectedAccountGroup: GROUP_ID,
      wallets: {
        [WALLETS_KEY]: {
          id: WALLETS_KEY,
          type: 'Entropy',
          metadata: { name: 'Wallet 1', entropy: { id: 'wallet1' } },
          groups: {
            [GROUP_ID]: {
              id: GROUP_ID,
              type: 'MultipleAccount',
              metadata: { name: 'Group 1', pinned: false, hidden: false },
              accounts: normalizedSelectedAccountId
                ? [normalizedSelectedAccountId]
                : [],
            },
          },
        },
      },
    };
    const remoteFlags = (bg?.RemoteFeatureFlagController ?? {}) as unknown as {
      remoteFeatureFlags?: Record<string, unknown>;
    };
    const remoteFeatureFlags = {
      ...(remoteFlags?.remoteFeatureFlags ?? {}),
      enableMultichainAccountsState2: {
        enabled: false,
        featureVersion: null,
        minimumVersion: null,
      },
      enableMultichainAccounts: {
        enabled: false,
        featureVersion: null,
        minimumVersion: null,
      },
      // Rewards flags off to avoid intro modal/effects
      rewardsEnabled: {
        enabled: false,
        featureVersion: null,
        minimumVersion: null,
      },
      rewardsAnnouncementModalEnabled: {
        enabled: false,
        featureVersion: null,
        minimumVersion: null,
      },
      rewardsEnableCardSpend: {
        enabled: false,
        featureVersion: null,
        minimumVersion: null,
      },
      // Perps flags disabled
      perpsPerpTradingEnabled: {
        enabled: false,
        featureVersion: null,
        minimumVersion: null,
      },
      perpsPerpTradingServiceInterruptionBannerEnabled: {
        enabled: false,
        featureVersion: null,
        minimumVersion: null,
      },
      perpsPerpGtmOnboardingModalEnabled: {
        enabled: false,
        featureVersion: null,
        minimumVersion: null,
      },
    };

    const state: DeepPartial<RootState> = {
      ...(deviceState as Record<string, unknown>),
      settings: {
        ...((deviceState.settings as Record<string, unknown>) ?? {}),
        basicFunctionalityEnabled: true,
      },
      engine: {
        ...((deviceState.engine as Record<string, unknown>) ?? {}),
        backgroundState: {
          ...(bg ?? {}),
          RewardsController: {
            ...(rewards ?? {}),
            activeAccount:
              (rewards as { activeAccount?: unknown })?.activeAccount ?? null,
          },
          PreferencesController: {
            ...(prefs ?? {}),
            tokenNetworkFilter: { '0x1': true },
            useTokenDetection: false,
          },
          AccountTreeController: {
            ...(accountTree ?? {}),
            accountTree: normalizedAccountTree,
          },
          MultichainNetworkController: {
            ...(bg?.MultichainNetworkController as Record<string, unknown>),
            isEvmSelected: true,
          },
          RemoteFeatureFlagController: {
            ...(bg?.RemoteFeatureFlagController as Record<string, unknown>),
            remoteFeatureFlags,
          },
        },
      },
    } as unknown as DeepPartial<RootState>;

    const { getByTestId } = renderIntegrationScreen(
      Wallet as unknown as React.ComponentType,
      { name: Routes.WALLET_VIEW },
      { state },
    );

    expect(getByTestId(WalletViewSelectorsIDs.WALLET_CONTAINER)).toBeTruthy();
    expect(getByTestId(WalletViewSelectorsIDs.TOTAL_BALANCE_TEXT)).toBeTruthy();
    expect(getByTestId(WalletViewSelectorsIDs.WALLET_SEND_BUTTON)).toBeTruthy();
  });
});
