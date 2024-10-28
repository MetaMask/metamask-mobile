import { strings } from '../../../../locales/i18n';
import { showAlert } from '../../../actions/alert';
import { handleNetworkSwitch } from '../../../util/networks';
import DevLogger from '../../SDKConnect/utils/DevLogger';
import DeeplinkManager from '../DeeplinkManager';

import {
  selectChainId,
  selectNetworkConfigurations,
} from '../../../selectors/networkController';
import { store } from '../../../store';
import { toHex } from '@metamask/controller-utils';

function switchNetwork({
  deeplinkManager,
  switchToChainId,
}: {
  deeplinkManager: DeeplinkManager;
  switchToChainId: `${number}` | undefined;
}) {
  if (
    typeof switchToChainId === 'number' ||
    typeof switchToChainId === 'string'
  ) {
    const chainId = selectChainId(store.getState());
    const networkConfigurations = selectNetworkConfigurations(store.getState());

    Object.entries(networkConfigurations).find(
      ([, { chainId: configChainId }]) =>
        configChainId === toHex(switchToChainId),
    );

    if (chainId === toHex(switchToChainId)) {
      return;
    }

    const newChainId = String(switchToChainId);
    const networkName = handleNetworkSwitch(newChainId);

    if (!networkName) {
      throw new Error(`Unable to find network with chain id ${chainId}`);
    }

    deeplinkManager.dispatch(
      showAlert({
        isVisible: true,
        autodismiss: 5000,
        content: 'clipboard-alert',
        data: { msg: strings('send.warn_network_change') + networkName },
      }),
    );
  } else {
    DevLogger.log(
      'Invalid Type: switchToChainId must be a string or number but was ' +
        typeof switchToChainId,
    );
  }
}

export default switchNetwork;
