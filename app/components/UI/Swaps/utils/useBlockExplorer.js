import { useCallback, useEffect, useState } from 'react';
import etherscanLink from '@metamask/etherscan-link';
import { RPC } from '../../../../constants/network';
import {
  findBlockExplorerForRpc,
  getBlockExplorerName,
} from '../../../../util/networks';
import { strings } from '../../../../../locales/i18n';
import { getEtherscanBaseUrl } from '../../../../util/etherscan';
import { useSelector } from 'react-redux';
import {
  selectEvmChainId,
  selectProviderConfig,
} from '../../../../selectors/networkController';
import { selectNetworkName } from '../../../../selectors/networkInfos';

function useBlockExplorer(networkConfigurations, providerConfigTokenExplorer) {
  const [explorer, setExplorer] = useState({
    name: '',
    value: null,
    isValid: false,
    isRPC: false,
    baseUrl: '',
  });
  const providerConfig = useSelector(selectProviderConfig);
  const chainId = useSelector(selectEvmChainId);
  const networkName = useSelector(selectNetworkName);

  useEffect(() => {
    const definitiveProviderConfig =
      providerConfigTokenExplorer ?? providerConfig;
    try {
      const networkConfigurationsByChainId = networkConfigurations?.[chainId]
      let blockExplorer = networkConfigurationsByChainId.blockExplorerUrls?.[
        networkConfigurationsByChainId.defaultBlockExplorerUrlIndex
      ]
      
      if (!blockExplorer) {
        // If no block explorer URL is found in the network configurations,
        // we attempt to retrieve it using a hardcoded Etherscan URL mapping.
        // Additionally, since `definitiveProviderConfig.type` defaults to `rpc` for non-built-in networks,
        // the fallback is applied only to built-in networks, as they all use Etherscan.
        if (definitiveProviderConfig.type !== RPC) {
          blockExplorer = getEtherscanBaseUrl(definitiveProviderConfig.type)
        }

        if (!blockExplorer) {
          throw new Error('No block explorer url');
        }
      }

      const url = new URL(blockExplorer);
      if (!['http:', 'https:'].includes(url.protocol)) {
        throw new Error('Block explorer URL is not a valid http(s) protocol');
      }

      const name =
        getBlockExplorerName(blockExplorer) ||
        strings('swaps.block_explorer');
      setExplorer({
        name,
        value: blockExplorer,
        isValid: true,
        isRPC: true,
        baseUrl: url.href,
      });
    } catch {
      setExplorer({
        name: '',
        value: null,
        isValid: false,
        isRPC: false,
        baseUrl: '',
      });
    }
  }, [
    networkConfigurations,
    providerConfig,
    providerConfigTokenExplorer,
    chainId,
    networkName,
  ]);

  const tx = useCallback(
    (hash) => {
      if (!explorer.isValid) {
        return '';
      }
      // Regardless of whether the chain uses Etherscan,
      // we should always use the RPC explorer URL that we retrieved,
      // as the built-in URL mapping from `etherscanLink` may be outdated.
      return etherscanLink.createCustomExplorerLink(hash, explorer.value);
    },
    [explorer],
  );
  const account = useCallback(
    (address) => {
      if (!explorer.isValid) {
        return '';
      }
      // Regardless of whether the chain uses Etherscan,
      // we should always use the RPC explorer URL that we retrieved,
      // as the built-in URL mapping from `etherscanLink` may be outdated.
      return etherscanLink.createCustomAccountLink(address, explorer.value);
    },
    [explorer],
  );
  const token = useCallback(
    (address) => {
      if (!explorer.isValid) {
        return '';
      }
      // Regardless of whether the chain uses Etherscan,
      // we should always use the RPC explorer URL that we retrieved,
      // as the built-in URL mapping from `etherscanLink` may be outdated.
      return etherscanLink.createCustomTokenTrackerLink(address, explorer.value);
    },
    [explorer],
  );

  return {
    ...explorer,
    tx,
    account,
    token,
  };
}

export default useBlockExplorer;
