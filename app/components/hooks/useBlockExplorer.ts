import { useCallback } from 'react';
import { RPC, NO_RPC_BLOCK_EXPLORER } from '../../constants/network';
import { findBlockExplorerForRpc } from '../../util/networks';
import { getEtherscanAddressUrl } from '../../util/etherscan';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import {
  selectNetworkConfigurations,
  selectProviderConfig,
} from '../../selectors/networkController';
import Routes from '../../constants/navigation/Routes';

const useBlockExplorer = () => {
  const navigation = useNavigation();
  const providerConfig = useSelector(selectProviderConfig);
  const networkConfigurations = useSelector(selectNetworkConfigurations);

  const toBlockExplorer = useCallback(
    (address: string) => {
      const { type, rpcUrl } = providerConfig;
      let accountLink: string;
      if (type === RPC && rpcUrl) {
        const blockExplorer =
          findBlockExplorerForRpc(rpcUrl, networkConfigurations) ||
          NO_RPC_BLOCK_EXPLORER;

        // Ensure blockExplorer is defined (NO_RPC_BLOCK_EXPLORER provides a fallback if undefined)
        accountLink = `${blockExplorer}/address/${address}`;
      } else {
        // If it's not RPC, fallback to getEtherscanAddressUrl
        accountLink = getEtherscanAddressUrl(type, address);
      }

      // Navigate to the WebView screen with the constructed URL
      navigation.navigate(Routes.WEBVIEW.MAIN, {
        screen: Routes.WEBVIEW.SIMPLE,
        params: {
          url: accountLink,
        },
      });
    },
    [networkConfigurations, navigation, providerConfig],
  );
  return {
    toBlockExplorer,
  };
};

export default useBlockExplorer;
