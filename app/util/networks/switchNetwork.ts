import { strings } from '../../../locales/i18n';
import { showAlert } from '../../actions/alert';
import { handleNetworkSwitch } from './handleNetworkSwitch';
import DevLogger from '../../core/SDKConnect/utils/DevLogger';

import { selectEvmChainId } from '../../selectors/networkController';
import { store } from '../../store';
import { toHex } from '@metamask/controller-utils';

function switchNetwork({
  switchToChainId,
}: {
  switchToChainId: `${number}` | undefined;
}) {
  if (
    typeof switchToChainId === 'number' ||
    typeof switchToChainId === 'string'
  ) {
    const newChainId = String(switchToChainId);
    const networkName = handleNetworkSwitch(newChainId);

    if (!networkName) {
      const activeChainId = selectEvmChainId(store.getState());
      if (activeChainId === toHex(newChainId)) {
        return;
      }
      throw new Error(`Unable to find network with chain id ${newChainId}`);
    }

    store.dispatch(
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
