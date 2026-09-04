import {
  MoneyAccountUpgradeController,
  type MoneyAccountUpgradeControllerMessenger,
} from '@metamask/money-account-upgrade-controller';
import type { MoneyAccountVaultConfig } from '@metamask/money-account-utils';
import { RpcEndpointType } from '@metamask/network-controller';
import { toHex } from '@metamask/controller-utils';
import type { MessengerClientInitFunction } from '../types';
import type { MoneyAccountUpgradeControllerInitMessenger } from '../messengers/money-account-upgrade-controller-messenger';
import Engine from '../../Engine';
import { PopularList } from '../../../util/networks/customNetworks';
import { isMoneyAccountEnabled } from '../../../lib/Money/feature-flags';
import Logger from '../../../util/Logger';

/** Sentry tag used to group/filter Money Account upgrade failures. */
const SENTRY_FEATURE_TAG = 'money-account-upgrade';

/**
 * How many bootstrap failures a single session reports to Sentry. The
 * controller re-runs a failed bootstrap on every `KeyringController` and
 * `RemoteFeatureFlagController` state change — and the keyring publishes one
 * on every unlock, lock, and account mutation — so during an outage an
 * uncapped hook would emit a Sentry event per keyring mutation for the whole
 * session. The first few carry all the diagnostic signal; later ones are
 * logged locally but not reported.
 */
const MAX_REPORTED_BOOTSTRAP_FAILURES = 3;

/**
 * Initialize the MoneyAccountUpgradeController.
 *
 * Construction restores the persisted upgrade records and wires the
 * mobile-specific parts of the controller's bootstrap as hooks; the controller
 * owns the bootstrap itself (feature flag, unlock, vault config, serialized
 * re-runs). `init()` — which subscribes and runs the first sync — is
 * deliberately not called here: it makes messenger calls and the chain hook
 * reads `Engine.context`, so `Engine` calls it once every controller is
 * constructed and the context is assigned.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the controller.
 * @param request.initMessenger - The messenger for the bootstrap hooks.
 * @param request.persistedState - The persisted state to hydrate from.
 * @returns The initialized controller.
 */
export const moneyAccountUpgradeControllerInit: MessengerClientInitFunction<
  MoneyAccountUpgradeController,
  MoneyAccountUpgradeControllerMessenger,
  MoneyAccountUpgradeControllerInitMessenger
> = ({ controllerMessenger, initMessenger, persistedState }) => {
  /**
   * Ensures the vault chain exists in the user's NetworkController
   * configuration. If missing, adds it from `PopularList`. The upgrade flow's
   * `eip-7702-authorization` step calls
   * `NetworkController:findNetworkClientIdByChainId`, which throws if the
   * chain hasn't been configured, and Monad is not enabled by default.
   */
  const ensureChainConfigured = async ({
    chainId,
  }: MoneyAccountVaultConfig): Promise<void> => {
    const { networkConfigurationsByChainId } = initMessenger.call(
      'NetworkController:getState',
    );
    if (networkConfigurationsByChainId[chainId]) {
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

  let reportedBootstrapFailures = 0;

  const onBootstrapError = (error: unknown) => {
    const wrapped = error instanceof Error ? error : new Error(String(error));
    reportedBootstrapFailures += 1;
    if (reportedBootstrapFailures > MAX_REPORTED_BOOTSTRAP_FAILURES) {
      Logger.log(
        '[MoneyAccountUpgradeController] bootstrap failed; report suppressed',
        { reason: wrapped.message },
      );
      return;
    }
    Logger.error(wrapped, {
      tags: { feature: SENTRY_FEATURE_TAG },
      context: {
        name: 'money_account_upgrade',
        data: {
          phase: 'bootstrap',
          failure: reportedBootstrapFailures,
          ...(reportedBootstrapFailures === MAX_REPORTED_BOOTSTRAP_FAILURES
            ? { furtherReportsSuppressed: true }
            : {}),
        },
      },
    });
  };

  const controller = new MoneyAccountUpgradeController({
    messenger: controllerMessenger,
    state: persistedState.MoneyAccountUpgradeController,
    hooks: {
      isEnabled: isMoneyAccountEnabled,
      ensureChainConfigured,
      onBootstrapError,
    },
  });

  return { controller };
};
