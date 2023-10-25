import { showAlert } from '../../../actions/alert';
import { handleNetworkSwitch as switchNetwork } from '../../../util/networks';
import { DeeplinkManager } from '../DeeplinkManager';
import { strings } from '../../../../locales/i18n';

function handleNetworkSwitch(
  instance: DeeplinkManager,
  switchToChainId: `${number}` | undefined,
) {
  const networkName = switchNetwork(switchToChainId as string);

  if (!networkName) return;

  instance.dispatch(
    showAlert({
      isVisible: true,
      autodismiss: 5000,
      content: 'clipboard-alert',
      data: { msg: strings('send.warn_network_change') + networkName },
    }),
  );
}

export default handleNetworkSwitch;
