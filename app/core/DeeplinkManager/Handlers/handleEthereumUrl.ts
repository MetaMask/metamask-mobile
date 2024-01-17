import { ETH_ACTIONS } from '../../../constants/deeplinks';
import { NetworkSwitchErrorType } from '../../../constants/error';
import { ParseOutput, parse } from 'eth-url-parser';
import { Alert } from 'react-native';
import { strings } from '../../../../locales/i18n';
import DeeplinkManager from '../DeeplinkManager';
import formattedDeeplinkParsedValue from '../../../util/formattedDeeplinkParsedValue';

async function handleEthereumUrl({
  deeplinkManager,
  url,
  origin,
}: {
  deeplinkManager: DeeplinkManager;
  url: string;
  origin: string;
}) {
  let ethUrl: ParseOutput;
  try {
    ethUrl = parse(url);
  } catch (e) {
    if (e) Alert.alert(strings('deeplink.invalid'), e.toString());
    return;
  }

  const txMeta = { ...ethUrl, source: url };

  try {
    /**
     * Validate and switch network before performing any other action
     */
    deeplinkManager._handleNetworkSwitch(ethUrl.chain_id);

    switch (ethUrl.function_name) {
      case ETH_ACTIONS.TRANSFER: {
        deeplinkManager.navigation.navigate('SendView', {
          screen: 'Send',
          params: { txMeta: { ...txMeta, action: 'send-token' } },
        });
        break;
      }
      case ETH_ACTIONS.APPROVE: {
        await deeplinkManager._approveTransaction(ethUrl, origin);
        break;
      }
      default: {
        if (ethUrl.parameters?.value) {
          ethUrl.parameters.value = formattedDeeplinkParsedValue(
            ethUrl.parameters.value,
          );
          deeplinkManager.navigation.navigate('SendView', {
            screen: 'Send',
            params: { txMeta: { ...txMeta, action: 'send-eth' } },
          });
        } else {
          deeplinkManager.navigation.navigate('SendFlowView', {
            screen: 'SendTo',
            params: { txMeta },
          });
        }
      }
    }
  } catch (e: any) {
    let alertMessage;
    switch (e.message) {
      case NetworkSwitchErrorType.missingNetworkId:
        alertMessage = strings('send.network_missing_id');
        break;
      default:
        alertMessage = strings('send.network_not_found_description', {
          chain_id: ethUrl.chain_id,
        });
    }
    Alert.alert(strings('send.network_not_found_title'), alertMessage);
  }
}

export default handleEthereumUrl;
