import {
  MoneyAccountUpgradeController,
  type MoneyAccountUpgradeControllerMessenger,
} from '@metamask/money-account-upgrade-controller';
import type { Hex } from '@metamask/utils';
import { RpcEndpointType } from '@metamask/network-controller';
import { toHex } from '@metamask/controller-utils';
import type { RemoteFeatureFlagControllerState } from '@metamask/remote-feature-flag-controller';
import type { MessengerClientInitFunction } from '../types';
import type { MoneyAccountUpgradeControllerInitMessenger } from '../messengers/money-account-upgrade-controller-messenger';
import Engine from '../../Engine';
import ReduxService from '../../redux';
import type { RootState } from '../../../reducers';
import {
  getMoneyAccountVaultConfig,
  type MoneyAccountVaultConfig,
} from '../../../selectors/featureFlagController/moneyAccount';
import { selectEvmNetworkConfigurationsByChainId } from '../../../selectors/networkController';
import { PopularList } from '../../../util/networks/customNetworks';
import { isMoneyAccountEnabled } from '../../../lib/Money/feature-flags';
import Logger from '../../../util/Logger';

/** Sentry tag used to group/filter Money Account upgrade failures. */
const SENTRY_FEATURE_TAG = 'money-account-upgrade';

/**
 * Ensures the given chain exists in the user's NetworkController configuration.
 * If missing, adds it from `PopularList`. The upgrade flow's
 * `eip-7702-authorization` step calls
 * `NetworkController:findNetworkClientIdByChainId`, which throws if the chain
 * hasn't been configured, and Monad is not enabled by default
 * so we need to  make sure it's there before init runs.
 */
const ensureChainConfigured = async (chainId: Hex): Promise<void> => {
  const networkConfigurations = selectEvmNetworkConfigurationsByChainId(
    ReduxService.store.getState() as RootState,
  );
  if (networkConfigurations[chainId]) {
    return;
  }

  const popularEntry = PopularList.find(
    (network) => toHex(network.chainId as string) === chainId,
  );
  if (!popularEntry) {
    throw new Error(
      `Money Account upgrade chain ${chainId} is not in PopularList; cannot auto-add to NetworkController`,
    );
  }

  await Engine.context.NetworkController.addNetwork({
    chainId,
    blockExplorerUrls: popularEntry.rpcPrefs?.blockExplorerUrl
      ? [popularEntry.rpcPrefs.blockExplorerUrl]
      : [],
    defaultRpcEndpointIndex: 0,
    defaultBlockExplorerUrlIndex: popularEntry.rpcPrefs?.blockExplorerUrl
      ? 0
      : undefined,
    name: popularEntry.nickname,
    nativeCurrency: popularEntry.ticker,
    rpcEndpoints: [
      {
        url: popularEntry.rpcUrl,
        failoverUrls: popularEntry.failoverRpcUrls,
        name: popularEntry.nickname,
        type: RpcEndpointType.Custom,
      },
    ],
  });
};

let bootstrapPromise: Promise<void> | null = null;

/**
 * Promise that resolves once `MoneyAccountUpgradeController.init()` has run.
 * Rejects if bootstrap fails, or if it hasn't been scheduled yet (i.e. the
 * keyring is still locked). Callers that depend on the controller being
 * initialized — e.g. `upgradeAccount` — should `await` this first.
 */
export const whenMoneyAccountUpgradeReady = (): Promise<void> => {
  if (!bootstrapPromise) {
    return Promise.reject(
      new Error(
        'MoneyAccountUpgradeController bootstrap has not been scheduled yet',
      ),
    );
  }
  return bootstrapPromise;
};

/** @internal For test use only. */
export const __resetMoneyAccountUpgradeBootstrapForTesting = () => {
  bootstrapPromise = null;
};

/**
 * Initialize the MoneyAccountUpgradeController.
 *
 * Bootstrapping is controlled by two signals: the `moneyEnableMoneyAccount`
 * remote feature flag being on and the keyring being unlocked.
 *
 * The flag value and vault config are sourced from the
 * `RemoteFeatureFlagController` directly (via `getState` at startup and the
 * `stateChange` event for later updates). We deliberately avoid reading
 * vaultConfig from Redux at bootstrap time because Redux is updated via the
 * `EngineService` batcher (a 250ms-debounced dispatch) and would be stale
 * relative to the controller state we are reacting to.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the controller.
 * @param request.initMessenger - The init messenger for unlock and feature-flag signals.
 * @returns The initialized controller.
 */
export const moneyAccountUpgradeControllerInit: MessengerClientInitFunction<
  MoneyAccountUpgradeController,
  MoneyAccountUpgradeControllerMessenger,
  MoneyAccountUpgradeControllerInitMessenger
> = ({ controllerMessenger, initMessenger }) => {
  const controller = new MoneyAccountUpgradeController({
    messenger: controllerMessenger,
  });

  const bootstrap = async (vaultConfig: MoneyAccountVaultConfig) => {
    const chainId = vaultConfig.chainId as Hex;

    await ensureChainConfigured(chainId);

    await controller.init({
      chainId,
      boringVaultAddress: vaultConfig.boringVault as Hex,
    });
  };

  const runBootstrap = (vaultConfig: MoneyAccountVaultConfig) => {
    bootstrapPromise = bootstrap(vaultConfig);
    bootstrapPromise.catch((error) => {
      Logger.error(error as Error, {
        tags: { feature: SENTRY_FEATURE_TAG },
        context: {
          name: 'money_account_upgrade',
          data: { phase: 'bootstrap' },
        },
      });
    });
  };

  let bootstrapScheduled = false;
  const scheduleBootstrap = (vaultConfig: MoneyAccountVaultConfig) => {
    if (bootstrapScheduled) {
      return;
    }
    bootstrapScheduled = true;

    const { isUnlocked } = initMessenger.call('KeyringController:getState');
    if (isUnlocked) {
      runBootstrap(vaultConfig);
    } else {
      const onUnlock = () => {
        initMessenger.unsubscribe('KeyringController:unlock', onUnlock);
        runBootstrap(vaultConfig);
      };
      initMessenger.subscribe('KeyringController:unlock', onUnlock);
    }
  };

  const mergedFlags = (state: RemoteFeatureFlagControllerState) => ({
    ...state.remoteFeatureFlags,
    ...(state.localOverrides ?? {}),
  });

  const tryStart = (state: RemoteFeatureFlagControllerState): boolean => {
    const flags = mergedFlags(state);
    if (!isMoneyAccountEnabled(flags)) {
      return false;
    }
    const vaultConfig = getMoneyAccountVaultConfig(flags);
    if (!vaultConfig) {
      Logger.error(new Error('Missing Money Account vault config'), {
        tags: { feature: SENTRY_FEATURE_TAG },
        context: {
          name: 'money_account_upgrade',
          data: { phase: 'bootstrap' },
        },
      });
      return false;
    }
    scheduleBootstrap(vaultConfig);
    return true;
  };

  const onFlagChange = (state: RemoteFeatureFlagControllerState) => {
    if (tryStart(state)) {
      initMessenger.unsubscribe(
        'RemoteFeatureFlagController:stateChange',
        onFlagChange,
      );
    }
  };

  if (!tryStart(initMessenger.call('RemoteFeatureFlagController:getState'))) {
    initMessenger.subscribe(
      'RemoteFeatureFlagController:stateChange',
      onFlagChange,
    );
  }

  return { controller };
};
