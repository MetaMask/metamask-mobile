import { toHex } from '@metamask/controller-utils';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import { ParseOutput, parse } from 'eth-url-parser';
import { Alert } from 'react-native';
import { strings } from '../../../../locales/i18n';
import { ETH_ACTIONS } from '../../../constants/deeplinks';
import formattedDeeplinkParsedValue from '../../../util/formattedDeeplinkParsedValue';
import { NetworkSwitchErrorType } from '../../../constants/error';
import { getDecimalChainId } from '../../../util/networks';
import { MAINNET } from '../../../constants/network';
import AppConstants from '../../AppConstants';
import Engine from '../../Engine';
import Routes from '../../../constants/navigation/Routes';
import { InitSendLocation } from '../../../components/Views/confirmations/constants/send';
import { AssetType } from '../../../components/Views/confirmations/types/token';
import {
  addTransactionForDeeplink,
  isDeeplinkRedesignedConfirmationCompatible,
} from '../../../components/Views/confirmations/utils/deeplink';
import {
  ChainType,
  handleSendPageNavigation,
} from '../../../components/Views/confirmations/utils/send';
import NavigationService from '../../NavigationService';
import handleApproveUrl from './legacy/handleApproveUrl';
import switchNetwork from '../../../util/networks/switchNetwork';

/**
 * ERC-681 treats `value` as optional. When it is absent, open Send so the
 * user can enter an amount instead of building a transaction with no value.
 */
function openAmountlessNativeSend({
  chainId,
  recipient,
  origin,
}: {
  chainId: Hex;
  recipient: string;
  origin: string;
}) {
  const { NetworkController } = Engine.context;
  NetworkController.findNetworkClientIdByChainId(chainId);

  const network =
    NetworkController.state.networkConfigurationsByChainId[chainId];
  const symbol = network?.nativeCurrency ?? 'ETH';
  const decimalChainId = Number.parseInt(chainId, 16).toString(10);
  const assetId = `eip155:${decimalChainId}/slip44:60`;
  const asset: AssetType = {
    address: assetId,
    assetId,
    chainId,
    decimals: 18,
    image: '',
    logo: undefined,
    name: network?.name ?? symbol,
    symbol,
    ticker: symbol,
    balance: '0',
    isNative: true,
    isETH: chainId === CHAIN_IDS.MAINNET,
  };

  handleSendPageNavigation(NavigationService.navigation.navigate, {
    location:
      origin === AppConstants.DEEPLINKS.ORIGIN_QR_CODE
        ? InitSendLocation.QRScanner
        : InitSendLocation.Deeplink,
    predefinedRecipient: {
      address: recipient,
      chainType: ChainType.EVM,
    },
    asset,
  });
}

async function handleEthereumUrl({
  url,
  origin,
}: {
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
    const { MultichainNetworkController } = Engine.context;

    if (!MultichainNetworkController.state.isEvmSelected) {
      await MultichainNetworkController.setActiveNetwork(MAINNET);
    }
    // If the deeplink has a goerli chainId, show deprecation modal and return
    if (
      ethUrl.chain_id === getDecimalChainId(CHAIN_IDS.GOERLI) ||
      ethUrl.chain_id === CHAIN_IDS.GOERLI
    ) {
      NavigationService.navigation.navigate('DeprecatedNetworkDetails', {});
      return;
    }

    // eth-url-parser serialises large uint256 values in scientific notation
    // (e.g. "1e+21"). Convert to a plain decimal string so that downstream
    // toHex calls don't throw. See issue #23672.
    if (ethUrl.parameters?.uint256) {
      ethUrl.parameters.uint256 = formattedDeeplinkParsedValue(
        ethUrl.parameters.uint256,
      );
    }

    if (isDeeplinkRedesignedConfirmationCompatible(ethUrl.function_name)) {
      if (
        !ethUrl.function_name &&
        !ethUrl.parameters?.value &&
        ethUrl.target_address
      ) {
        openAmountlessNativeSend({
          chainId: ethUrl.chain_id ? toHex(ethUrl.chain_id) : CHAIN_IDS.MAINNET,
          recipient: ethUrl.target_address,
          origin,
        });
        return;
      }

      await addTransactionForDeeplink({
        ...txMeta,
        origin,
      });
      return;
    }

    /**
     * Validate and switch network before performing any other action
     */
    switchNetwork({ switchToChainId: ethUrl.chain_id });

    switch (ethUrl.function_name) {
      case ETH_ACTIONS.TRANSFER: {
        NavigationService.navigation.navigate(Routes.SEND.DEFAULT, {
          screen: Routes.SEND.RECIPIENT,
          params: { txMeta: { ...txMeta, action: 'send-token' } },
        });
        break;
      }
      case ETH_ACTIONS.APPROVE: {
        await handleApproveUrl({ ethUrl, origin });
        break;
      }
      default: {
        if (ethUrl.parameters?.value) {
          ethUrl.parameters.value = formattedDeeplinkParsedValue(
            ethUrl.parameters.value,
          );
          NavigationService.navigation.navigate(Routes.SEND.DEFAULT, {
            screen: Routes.SEND.RECIPIENT,
            params: { txMeta: { ...txMeta, action: 'send-eth' } },
          });
        } else {
          NavigationService.navigation.navigate(Routes.SEND.DEFAULT, {
            screen: Routes.SEND.RECIPIENT,
            params: { txMeta },
          });
        }
      }
    }
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (e: any) {
    let alertMessage;
    switch (e.message) {
      case NetworkSwitchErrorType.missingNetworkId:
        alertMessage = strings('send.network_missing_id');
        break;
      default:
        alertMessage = strings('send.network_not_found_description', {
          chain_id: getDecimalChainId(ethUrl.chain_id),
        });
    }
    Alert.alert(strings('send.network_not_found_title'), alertMessage);
  }
}

export default handleEthereumUrl;
