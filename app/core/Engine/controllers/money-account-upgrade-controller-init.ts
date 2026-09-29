import {
  MoneyAccountUpgradeController,
  type MoneyAccountUpgradeControllerMessenger,
} from '@metamask/money-account-upgrade-controller';
import type { MoneyAccountVaultConfig } from '@metamask/money-account-utils';
import { RpcEndpointType } from '@metamask/network-controller';
import { toHex } from '@metamask/controller-utils';
import type { MessengerClientInitFunction } from '../types';
import Engine from '../../Engine';
import ReduxService from '../../redux';
import type { RootState } from '../../../reducers';
import { selectEvmNetworkConfigurationsByChainId } from '../../../selectors/networkController';
import { PopularList } from '../../../util/networks/customNetworks';
import { isMoneyAccountEnabled } from '../../../lib/Money/feature-flags';
import Logger from '../../../util/Logger';

/** Sentry tag used to group/filter Money Account upgrade failures. */
const SENTRY_FEATURE_TAG = 'money-account-upgrade';

/**
 * Reports a bootstrap failure to Sentry. The controller calls this when a
 * bootstrap run fails or the vault config is missing.
 *
 * @param error - The failure to report.
 */
const reportBootstrapError = (error: unknown): void => {
  const wrapped = error instanceof Error ? error : new Error(String(error));
  Logger.error(wrapped, {
    tags: { feature: SENTRY_FEATURE_TAG },
    context: {
      name: 'money_account_upgrade',
      data: { phase: 'bootstrap' },
    },
  });
};

/**
 * Ensures the vault chain exists in the user's NetworkController configuration.
 * If missing, adds it from `PopularList`. The upgrade flow's
 * `eip-7702-authorization` step calls
 * `NetworkController:findNetworkClientIdByChainId`, which throws if the chain
 * hasn't been configured, and Monad is not enabled by default
 * so we need to make sure it's there before bootstrap runs.
 *
 * @param vaultConfig - The vault config whose chain should be configured.
 */
const ensureChainConfigured = async ({
  chainId,
}: MoneyAccountVaultConfig): Promise<void> => {
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

/**
 * Initialize the MoneyAccountUpgradeController.
 *
 * The controller owns its own bootstrap: after `controller.init()` is called
 * (from Engine, once all messenger clients exist), it watches
 * `RemoteFeatureFlagController` and `KeyringController` and bootstraps when
 * the Money Account flag is on and the wallet is unlocked.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the controller.
 * @param request.persistedState - The persisted state to hydrate from.
 * @returns The initialized controller.
 */
export const moneyAccountUpgradeControllerInit: MessengerClientInitFunction<
  MoneyAccountUpgradeController,
  MoneyAccountUpgradeControllerMessenger
> = ({ controllerMessenger, persistedState }) => {
  const controller = new MoneyAccountUpgradeController({
    messenger: controllerMessenger,
    state: persistedState.MoneyAccountUpgradeController,
    hooks: {
      isEnabled: isMoneyAccountEnabled,
      ensureChainConfigured,
      onBootstrapError: reportBootstrapError,
    },
  });

  return { controller };
};
