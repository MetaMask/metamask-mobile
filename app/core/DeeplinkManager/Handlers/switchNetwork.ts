import { showAlert } from '../../../actions/alert';
import { handleNetworkSwitch } from '../../../util/networks';
import DeeplinkManager from '../DeeplinkManager';
import { strings } from '../../../../locales/i18n';

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
    const chainId = String(switchToChainId);

    const networkName = handleNetworkSwitch(chainId);

    if (!networkName) return;

    deeplinkManager.dispatch(
      showAlert({
        isVisible: true,
        autodismiss: 5000,
        content: 'clipboard-alert',
        data: { msg: strings('send.warn_network_change') + networkName },
      }),
    );
  } else {
    throw new Error(
      'Invalid Type: switchToChainId must be a string or number but was ' +
        typeof switchToChainId,
    );
  }
}

export default switchNetwork;
