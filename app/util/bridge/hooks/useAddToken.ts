import { useSelector } from 'react-redux';
import {
  type NetworkConfiguration,
  RpcEndpointType,
} from '@metamask/network-controller';
import Engine from '../../../core/Engine';
import {
  selectEvmNetworkConfigurationsByChainId,
  selectSelectedNetworkClientId,
} from '../../../selectors/networkController';
import { QuoteResponse } from '../../../components/UI/Bridge/types';
import { decimalToHex } from '../../conversions';
import { addHexPrefix } from 'ethereumjs-util';
import { PopularList } from '../../networks/customNetworks';
import { Hex } from '@metamask/utils';

export default function useAddToken() {
  const networkConfigurations = useSelector(
    selectEvmNetworkConfigurationsByChainId,
  );
  const sourceNetworkClientId = useSelector(selectSelectedNetworkClientId);

  const addSourceToken = (quoteResponse: QuoteResponse) => {
    const {
      address,
      decimals,
      symbol,
      icon: image,
    } = quoteResponse.quote.srcAsset;
    Engine.context.TokensController.addToken({
      address,
      decimals,
      symbol,
      image,
      networkClientId: sourceNetworkClientId,
    });
  };

  const addDestToken = async (quoteResponse: QuoteResponse) => {
    // Look up the destination chain
    const hexDestChainId = addHexPrefix(
      String(decimalToHex(quoteResponse.quote.destChainId)),
    ) as Hex;
    const foundDestNetworkConfig: NetworkConfiguration | undefined =
      networkConfigurations[hexDestChainId];
    let addedDestNetworkConfig: NetworkConfiguration | undefined;
    // If user has not added the network in MetaMask, add it for them silently
    if (!foundDestNetworkConfig) {
      const featuredRpc = PopularList.find(
        (rpc) => rpc.chainId === hexDestChainId,
      );
      if (!featuredRpc) {
        throw new Error('No featured RPC found');
      }
      addedDestNetworkConfig = (await Engine.context.NetworkController.addNetwork({
        chainId: featuredRpc.chainId,
        name: featuredRpc.nickname,
        nativeCurrency: featuredRpc.ticker,
        rpcEndpoints: [
          {
            url: featuredRpc.rpcUrl,
            failoverUrls: featuredRpc.failoverRpcUrls,
            type: RpcEndpointType.Custom,
          },
        ],
        defaultRpcEndpointIndex: 0,
        blockExplorerUrls: [featuredRpc.rpcPrefs.blockExplorerUrl],
        defaultBlockExplorerUrlIndex: 0,
      })) as NetworkConfiguration;
    }

    const destNetworkConfig = foundDestNetworkConfig || addedDestNetworkConfig;
    if (!destNetworkConfig) {
      throw new Error('No destination network configuration found');
    }

    // Add the token after network is guaranteed to exist
    const rpcEndpointIndex = destNetworkConfig.defaultRpcEndpointIndex;
    const destNetworkClientId =
      destNetworkConfig.rpcEndpoints[rpcEndpointIndex].networkClientId;
    const {
      address,
      decimals,
      symbol,
      icon: image,
    } = quoteResponse.quote.destAsset;
    Engine.context.TokensController.addToken({
      address,
      decimals,
      symbol,
      image,
      networkClientId: destNetworkClientId,
    });
  };

  return { addSourceToken, addDestToken };
}
