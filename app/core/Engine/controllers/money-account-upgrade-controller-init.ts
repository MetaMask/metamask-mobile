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
 * Promise that resolves once the latest `MoneyAccountUpgradeController.init()`
 * has run. Rejects if that bootstrap fails, or if none has been scheduled yet
 * (i.e. the keyring is still locked). Because the controller can be re-inited
 * when the vault config changes, this always tracks the most recent run in the
 * bootstrap chain. Callers that depend on the controller being initialized —
 * e.g. `upgradeAccount` — should `await` this first.
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
 * `RemoteFeatureFlagController` directly (via `getState` and the `stateChange`
 * event). We deliberately avoid reading vaultConfig from Redux because Redux is
 * updated via the `EngineService` batcher (a 250ms-debounced dispatch) and
 * would be stale relative to the controller state we are reacting to.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the controller.
 * @param request.initMessenger - The init messenger for unlock and feature-flag signals.
 * @param request.persistedState - The persisted state to hydrate from.
 * @returns The initialized controller.
 */
export const moneyAccountUpgradeControllerInit: MessengerClientInitFunction<
  MoneyAccountUpgradeController,
  MoneyAccountUpgradeControllerMessenger,
  MoneyAccountUpgradeControllerInitMessenger
> = ({ controllerMessenger, initMessenger, persistedState }) => {
  const controller = new MoneyAccountUpgradeController({
    messenger: controllerMessenger,
    state: persistedState.MoneyAccountUpgradeController,
  });

  const reportBootstrapError = (error: Error) => {
    Logger.error(error, {
      tags: { feature: SENTRY_FEATURE_TAG },
      context: {
        name: 'money_account_upgrade',
        data: { phase: 'bootstrap' },
      },
    });
  };

  const bootstrap = async (vaultConfig: MoneyAccountVaultConfig) => {
    const chainId = vaultConfig.chainId as Hex;

    await ensureChainConfigured(chainId);

    await controller.init({
      chainId,
      boringVaultAddress: vaultConfig.boringVault as Hex,
    });
  };

  const mergedFlags = (state: RemoteFeatureFlagControllerState) => ({
    ...state.remoteFeatureFlags,
    ...(state.localOverrides ?? {}),
  });

  const readVaultConfig = (): MoneyAccountVaultConfig | undefined =>
    getMoneyAccountVaultConfig(
      mergedFlags(initMessenger.call('RemoteFeatureFlagController:getState')),
    );

  const configsEqual = (
    a: MoneyAccountVaultConfig,
    b: MoneyAccountVaultConfig,
  ) =>
    a.chainId === b.chainId &&
    a.boringVault === b.boringVault &&
    a.tellerAddress === b.tellerAddress &&
    a.accountantAddress === b.accountantAddress &&
    a.lensAddress === b.lensAddress;

  // The vault config the most recent bootstrap run was given. Used to decide
  // whether a later state change is a genuine change worth re-initing for.
  let lastRunConfig: MoneyAccountVaultConfig | null = null;

  // Run a single bootstrap for `vaultConfig`. Re-inits chain onto the previous
  // run so they are serialized; the previous rejection is swallowed so one
  // failure doesn't poison later re-inits, but each run still reports its own
  // failure.
  const runBootstrap = (vaultConfig: MoneyAccountVaultConfig) => {
    lastRunConfig = vaultConfig;
    const next = bootstrapPromise
      ? bootstrapPromise
          .catch(() => undefined)
          .then(() => bootstrap(vaultConfig))
      : bootstrap(vaultConfig);
    bootstrapPromise = next;
    next.catch(reportBootstrapError);
  };

  // Runs the first bootstrap using a just-in-time read of the flag state,
  // falling back to the config that triggered scheduling if the flag has
  // since vanished.
  const runFirstBootstrap = (scheduledConfig: MoneyAccountVaultConfig) => {
    const freshConfig = readVaultConfig();
    if (!freshConfig) {
      reportBootstrapError(new Error('Missing Money Account vault config'));
    }
    runBootstrap(freshConfig ?? scheduledConfig);
  };

  let bootstrapScheduled = false;
  let bootstrapRan = false;
  const scheduleBootstrap = (vaultConfig: MoneyAccountVaultConfig) => {
    if (bootstrapScheduled) {
      return;
    }
    bootstrapScheduled = true;

    const start = () => {
      bootstrapRan = true;
      runFirstBootstrap(vaultConfig);
    };

    const { isUnlocked } = initMessenger.call('KeyringController:getState');
    if (isUnlocked) {
      start();
    } else {
      const onUnlock = () => {
        initMessenger.unsubscribe('KeyringController:unlock', onUnlock);
        start();
      };
      initMessenger.subscribe('KeyringController:unlock', onUnlock);
    }
  };

  const onFlagState = (state: RemoteFeatureFlagControllerState) => {
    const flags = mergedFlags(state);
    if (!isMoneyAccountEnabled(flags)) {
      return;
    }

    const vaultConfig = getMoneyAccountVaultConfig(flags);
    if (!vaultConfig) {
      // Only log before scheduling. We stay subscribed for the whole session,
      // so logging on every unrelated flag change once we're already running
      // would just be noise.
      if (!bootstrapScheduled) {
        reportBootstrapError(new Error('Missing Money Account vault config'));
      }
      return;
    }

    if (!bootstrapScheduled) {
      scheduleBootstrap(vaultConfig);
      return;
    }

    // Scheduled but not yet run (awaiting unlock): the just-in-time read at run
    // time will pick up the latest config, so nothing to do here. Once it has
    // run, re-init if the vault config genuinely changed.
    if (
      bootstrapRan &&
      lastRunConfig &&
      !configsEqual(vaultConfig, lastRunConfig)
    ) {
      runBootstrap(vaultConfig);
    }
  };

  initMessenger.subscribe(
    'RemoteFeatureFlagController:stateChange',
    onFlagState,
  );
  onFlagState(initMessenger.call('RemoteFeatureFlagController:getState'));

  return { controller };
};
