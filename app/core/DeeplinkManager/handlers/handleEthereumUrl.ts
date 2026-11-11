import { CHAIN_IDS } from '@metamask/transaction-controller';
import { getNativeTokenAddress } from '@metamask/assets-controllers';
import { toHex } from '@metamask/controller-utils';
import { Hex } from '@metamask/utils';
import { ParseOutput, parse } from 'eth-url-parser';
import { Alert } from 'react-native';
import { strings } from '../../../../locales/i18n';
import { ETH_ACTIONS } from '../../../constants/deeplinks';
import formattedDeeplinkParsedValue from '../../../util/formattedDeeplinkParsedValue';
import { NetworkSwitchErrorType } from '../../../constants/error';
import { getDecimalChainId } from '../../../util/networks';
import { MAINNET } from '../../../constants/network';
import Engine from '../../Engine';
import ReduxService from '../../redux';
import Routes from '../../../constants/navigation/Routes';
import {
  addTransactionForDeeplink,
  isDeeplinkRedesignedConfirmationCompatible,
} from '../../../components/Views/confirmations/utils/deeplink';
import { handleSendPageNavigation } from '../../../components/Views/confirmations/utils/send';
import { derivePredefinedRecipientParams } from '../../../components/Views/confirmations/utils/address';
import { AssetType } from '../../../components/Views/confirmations/types/token';
import { selectAssetsBySelectedAccountGroup } from '../../../selectors/assets/assets-list';
import NavigationService from '../../NavigationService';
import handleApproveUrl from './legacy/handleApproveUrl';
import { mapDeeplinkOriginToInitSendLocation } from './handleSolanaUrl';
import switchNetwork from '../../../util/networks/switchNetwork';

/**
 * ERC-681: "With no indicated amount, the user should be prompted to enter the
 * amount to be paid." Covers plain sends without `value` and ERC-20 transfers
 * without `uint256`; other function calls keep their existing handling.
 */
const isAmountlessSendUrl = ({ function_name, parameters }: ParseOutput) => {
  if (function_name === ETH_ACTIONS.TRANSFER) {
    return !parameters?.uint256;
  }
  return !function_name && !parameters?.value;
};

/**
 * Opens the Send flow with the recipient prefilled and the amount left for the
 * user, mirroring how `handleSolanaUrl` treats Solana Pay URIs without an amount.
 * The asset is preselected when the selected account group holds it; otherwise
 * the flow starts at asset selection.
 */
const navigateToAmountlessSend = (ethUrl: ParseOutput, origin: string) => {
  // Deeplinks fall back to mainnet rather than the selected network
  const chainId: Hex = ethUrl.chain_id
    ? toHex(ethUrl.chain_id)
    : CHAIN_IDS.MAINNET;

  const { NetworkController } = Engine.context;
  if (!NetworkController.findNetworkClientIdByChainId(chainId)) {
    throw new Error(`Unable to find network with chain id ${chainId}`);
  }

  const isErc20Transfer = ethUrl.function_name === ETH_ACTIONS.TRANSFER;
  const assetAddress = isErc20Transfer
    ? ethUrl.target_address
    : getNativeTokenAddress(chainId);
  const recipient = isErc20Transfer
    ? ethUrl.parameters?.address
    : ethUrl.target_address;

  const ownedAssets = selectAssetsBySelectedAccountGroup(
    ReduxService.store.getState(),
  );
  const asset = ownedAssets[chainId]?.find(
    ({ assetId }) => assetId.toLowerCase() === assetAddress.toLowerCase(),
  ) as AssetType | undefined;

  handleSendPageNavigation(NavigationService.navigation.navigate, {
    location: mapDeeplinkOriginToInitSendLocation(origin),
    asset,
    predefinedRecipient: recipient
      ? derivePredefinedRecipientParams(recipient)
      : undefined,
  });
};

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

    if (isAmountlessSendUrl(ethUrl)) {
      navigateToAmountlessSend(ethUrl, origin);
      return;
    }

    if (isDeeplinkRedesignedConfirmationCompatible(ethUrl.function_name)) {
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
