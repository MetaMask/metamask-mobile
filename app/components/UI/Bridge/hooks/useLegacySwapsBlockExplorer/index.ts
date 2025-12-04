import { useCallback, useEffect, useState } from 'react';
import etherscanLink from '@metamask/etherscan-link';
import { RPC } from '../../../../../constants/network';
import {
  findBlockExplorerForRpc,
  getBlockExplorerName,
} from '../../../../../util/networks';
import { strings } from '../../../../../../locales/i18n';
import { getEtherscanBaseUrl } from '../../../../../util/etherscan';
import { useSelector } from 'react-redux';
import {
  ProviderConfig,
  selectProviderConfig,
} from '../../../../../selectors/networkController';
import { NetworkConfiguration } from '@metamask/network-controller';

/**
 * @deprecated Please use either global useBlockExplorer or useMultichainBlockExplorerTxUrl
 */
export function useLegacySwapsBlockExplorer(
  networkConfigurations: Record<`0x${string}`, NetworkConfiguration>,
  providerConfigTokenExplorer?: ProviderConfig | null,
) {
  const [explorer, setExplorer] = useState({
    name: '',
    value: null,
    isValid: false,
    isRPC: false,
    baseUrl: '',
  });
  const providerConfig = useSelector(selectProviderConfig);

  useEffect(() => {
    const definitiveProviderConfig =
      providerConfigTokenExplorer ?? providerConfig;
    try {
      const { rpcUrl, type } = definitiveProviderConfig;

      let blockExplorer;
      let name;

      if (type === RPC) {
        blockExplorer = findBlockExplorerForRpc(rpcUrl, networkConfigurations);
        name =
          getBlockExplorerName(blockExplorer) ||
          strings('swaps.block_explorer');
      } else {
        blockExplorer = getEtherscanBaseUrl(type);
        name = 'Etherscan';
      }

      if (!blockExplorer) {
        throw new Error('No block explorer url');
      }

      const url = new URL(blockExplorer);
      if (!['http:', 'https:'].includes(url.protocol)) {
        throw new Error('Block explorer URL is not a valid http(s) protocol');
      }

      setExplorer({
        name,
        value: blockExplorer,
        isValid: true,
        isRPC: type === RPC,
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
  }, [networkConfigurations, providerConfig, providerConfigTokenExplorer]);

  const tx = useCallback(
    (hash: string | undefined) => {
      if (!explorer.isValid || !hash) {
        return '';
      }
      // Regardless of whether the chain uses Etherscan,
      // we should always use the RPC explorer URL that we retrieved,
      // as the built-in URL mapping from `etherscanLink` may be outdated.
      // istanbul ignore next: explorer.value is always set when isValid is true
      return etherscanLink.createCustomExplorerLink(hash, explorer.value ?? '');
    },
    [explorer],
  );
  const account = useCallback(
    (address: string) => {
      if (!explorer.isValid) {
        return '';
      }
      // Regardless of whether the chain uses Etherscan,
      // we should always use the RPC explorer URL that we retrieved,
      // as the built-in URL mapping from `etherscanLink` may be outdated.
      // istanbul ignore next: explorer.value is always set when isValid is true
      return etherscanLink.createCustomAccountLink(
        address,
        explorer.value ?? '',
      );
    },
    [explorer],
  );
  const token = useCallback(
    (address: string) => {
      if (!explorer.isValid) {
        return '';
      }
      // Regardless of whether the chain uses Etherscan,
      // we should always use the RPC explorer URL that we retrieved,
      // as the built-in URL mapping from `etherscanLink` may be outdated.
      // istanbul ignore next: explorer.value is always set when isValid is true
      return etherscanLink.createCustomTokenTrackerLink(
        address,
        explorer.value ?? '',
      );
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
