import { CurrencyRateController } from '@metamask/assets-controllers';
import { NetworkType } from '@metamask/controller-utils';
import { NetworkController } from '@metamask/network-controller';
import { getNetworkTypeById } from './index';
import Engine from '../../core/Engine';
import {
  selectChainId,
  selectNetworkConfigurations,
} from '../../selectors/networkController';
import { store } from '../../store';
import Logger from '../Logger';

/**
 * Switch to the given chain ID.
 *
 * @returns The network name of the network switched to (i.e. the network type
 * or nickname, for built-in or custom networks respectively), or undefined if
 * no switch occurred.
 */
const handleNetworkSwitch = (switchToChainId: string): string | undefined => {
  // If not specified, use the current network
  if (!switchToChainId) {
    return;
  }

  const currencyRateController = Engine.context
    .CurrencyRateController as CurrencyRateController;
  const networkController = Engine.context
    .NetworkController as NetworkController;
  const chainId = selectChainId(store.getState());
  const networkConfigurations = selectNetworkConfigurations(store.getState());

  // If current network is the same as the one we want to switch to, do nothing
  if (chainId === String(switchToChainId)) {
    return;
  }

  const entry = Object.entries(networkConfigurations).find(
    ([, { chainId: configChainId }]) => configChainId === switchToChainId,
  );

  if (entry) {
    const [networkConfigurationId, networkConfiguration] = entry;
    const { ticker, nickname } = networkConfiguration;
    currencyRateController.setNativeCurrency(ticker).catch((error) => {
      Logger.error(error, 'Failed to set native currency');
    });
    networkController
      .setActiveNetwork(networkConfigurationId)
      .catch((error) => {
        Logger.error(error, 'Failed to set active network');
      });
    return nickname;
  }

  const networkType = getNetworkTypeById(switchToChainId);

  if (networkType) {
    currencyRateController.setNativeCurrency('ETH').catch((error) => {
      Logger.error(error, 'Failed to set native currency');
    });
    // TODO: Align mobile and core types to remove this type cast
    networkController
      .setProviderType(networkType as NetworkType)
      .catch((error) => {
        Logger.error(error, 'Failed to set provider type');
      });
    return networkType;
  }
};

export default handleNetworkSwitch;
