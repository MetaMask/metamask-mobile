import { useCallback, useEffect, useState } from 'react';
import etherscanLink from '@metamask/etherscan-link';
import { RPC } from '../../../../constants/network';
import {
  findBlockExplorerForRpc,
  getBlockExplorerName,
} from '../../../../util/networks';
import { strings } from '../../../../../locales/i18n';
import { getEtherscanBaseUrl } from '../../../../util/etherscan';

function useBlockExplorer(provider, frequentRpcList) {
  const [explorer, setExplorer] = useState({
    name: '',
    value: null,
    isValid: false,
    isRPC: false,
    baseUrl: '',
  });

  useEffect(() => {
    if (provider.type === RPC) {
      try {
        const blockExplorer = findBlockExplorerForRpc(
          provider.rpcTarget,
          frequentRpcList,
        );
        if (!blockExplorer) {
          throw new Error('No block explorer url');
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
    } else {
      setExplorer({
        name: 'Etherscan',
        value: provider.chainId,
        isValid: true,
        isRPC: false,
        baseUrl: getEtherscanBaseUrl(provider.type),
      });
    }
  }, [frequentRpcList, provider]);

  const tx = useCallback(
    (hash) => {
      if (!explorer.isValid) {
        return '';
      }

      const create = explorer.isRPC
        ? etherscanLink.createCustomExplorerLink
        : etherscanLink.createExplorerLink;
      return create(hash, explorer.value);
    },
    [explorer],
  );
  const account = useCallback(
    (address) => {
      if (!explorer.isValid) {
        return '';
      }

      const create = explorer.isRPC
        ? etherscanLink.createCustomAccountLink
        : etherscanLink.createAccountLink;
      return create(address, explorer.value);
    },
    [explorer],
  );
  const token = useCallback(
    (address) => {
      if (!explorer.isValid) {
        return '';
      }

      const create = explorer.isRPC
        ? etherscanLink.createCustomTokenTrackerLink
        : etherscanLink.createTokenTrackerLink;
      return create(address, explorer.value);
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
