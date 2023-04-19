import { useCallback, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import etherscanLink from '@metamask/etherscan-link';
import { RPC } from '../../constants/network';
import {
  findBlockExplorerForRpc,
  getBlockExplorerName,
} from '../../util/networks';
import { strings } from '../../../locales/i18n';
import { getEtherscanBaseUrl } from '../../util/etherscan';
import { selectProviderConfig } from '../../selectors/networkController';

interface ValidExplorer {
  isValid: true;
  name: string;
  value: string;
  isRPC: boolean;
  baseUrl: string;
}

interface InvalidExplorer {
  isValid: false;
  name: string | null;
  value: string | null;
  isRPC?: boolean;
  baseUrl?: string;
}

type Explorer = ValidExplorer | InvalidExplorer;

function useBlockExplorer() {
  const providerConfig = useSelector(selectProviderConfig);
  const frequentRpcList = useSelector(
    (state: any) =>
      state.engine.backgroundState.PreferencesController.frequentRpcList,
  );

  const [explorer, setExplorer] = useState<Explorer>({
    name: '',
    value: null,
    isValid: false,
    isRPC: false,
    baseUrl: '',
  });

  useEffect(() => {
    if (providerConfig.type === RPC) {
      try {
        if (!providerConfig.rpcTarget) {
          throw new Error('No rpc target');
        }

        const blockExplorer = findBlockExplorerForRpc(
          providerConfig.rpcTarget,
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
        value: providerConfig.chainId,
        isValid: true,
        isRPC: false,
        baseUrl: getEtherscanBaseUrl(providerConfig.type),
      });
    }
  }, [frequentRpcList, providerConfig]);

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
