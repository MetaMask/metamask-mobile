import {
  MoneyAccountUpgradeController,
  type MoneyAccountUpgradeControllerMessenger,
} from '@metamask/money-account-upgrade-controller';
import type { Hex } from '@metamask/utils';
import { RpcEndpointType } from '@metamask/network-controller';
import { toHex } from '@metamask/controller-utils';
import type { MessengerClientInitFunction } from '../types';
import type { MoneyAccountUpgradeControllerInitMessenger } from '../messengers/money-account-upgrade-controller-messenger';
import Engine from '../../Engine';
import ReduxService from '../../redux';
import type { RootState } from '../../../reducers';
import { selectMoneyAccountVaultConfig } from '../../../selectors/featureFlagController/moneyAccount';
import { selectEvmNetworkConfigurationsByChainId } from '../../../selectors/networkController';
import { PopularList } from '../../../util/networks/customNetworks';
import Logger from '../../../util/Logger';

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
 * The upgrade controller needs a bearer token (via ChompApiService →
 * AuthenticationController) to fetch service details, which is only available
 * once the keyring is unlocked. We therefore defer bootstrapping until the
 * first unlock event (or run it immediately if the keyring is already
 * unlocked).
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the controller.
 * @param request.initMessenger - The init messenger for unlock signals.
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

  const bootstrap = async () => {
    const vaultConfig = selectMoneyAccountVaultConfig(
      ReduxService.store.getState() as RootState,
    );
    if (!vaultConfig) {
      throw new Error('Missing Money Account vault config');
    }

    const chainId = vaultConfig.chainId as Hex;

    await ensureChainConfigured(chainId);

    await controller.init({
      chainId,
      boringVaultAddress: vaultConfig.boringVault as Hex,
    });
  };

  const runBootstrap = () => {
    bootstrapPromise = bootstrap();
    bootstrapPromise.catch((error) => {
      Logger.error(error as Error, 'MoneyAccountUpgradeController bootstrap');
    });
  };

  const keyringState = initMessenger.call('KeyringController:getState');

  if (keyringState.isUnlocked) {
    runBootstrap();
  } else {
    const onUnlock = () => {
      initMessenger.unsubscribe('KeyringController:unlock', onUnlock);
      runBootstrap();
    };
    initMessenger.subscribe('KeyringController:unlock', onUnlock);
  }

  return { controller };
};
