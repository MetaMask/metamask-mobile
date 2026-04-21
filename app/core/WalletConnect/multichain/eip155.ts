import { KnownCaipNamespace } from '@metamask/utils';
import { getPermittedAccounts, getPermittedChains } from '../../Permissions';
import type { ChainAdapter, NamespaceConfig } from './types';

const METHODS: string[] = [
  'eth_sendTransaction',
  'eth_sign',
  'eth_signTransaction',
  'eth_signTypedData',
  'eth_signTypedData_v3',
  'eth_signTypedData_v4',
  'personal_sign',
  'eth_sendRawTransaction',
  'eth_accounts',
  'eth_getBalance',
  'eth_call',
  'eth_estimateGas',
  'eth_blockNumber',
  'eth_getCode',
  'eth_getTransactionCount',
  'eth_getTransactionReceipt',
  'eth_getTransactionByHash',
  'eth_getBlockByHash',
  'eth_getBlockByNumber',
  'net_version',
  'eth_chainId',
  'eth_requestAccounts',
  'wallet_addEthereumChain',
  'wallet_switchEthereumChain',
  'wallet_getPermissions',
  'wallet_requestPermissions',
  'wallet_watchAsset',
  'wallet_scanQRCode',
  'wallet_sendCalls',
  'wallet_getCallsStatus',
  'wallet_getCapabilities',
];

const EVENTS: string[] = ['chainChanged', 'accountsChanged'];

const REDIRECT_METHODS: string[] = [
  'eth_requestAccounts',
  'eth_sendTransaction',
  'eth_signTransaction',
  'personal_sign',
  'eth_signTypedData',
  'eth_signTypedData_v3',
  'eth_signTypedData_v4',
  'wallet_watchAsset',
  'wallet_addEthereumChain',
  'wallet_switchEthereumChain',
  'wallet_sendCalls',
];

const EIP155_PREFIX = `${KnownCaipNamespace.Eip155}:` as const;

export const eip155Adapter: ChainAdapter = {
  namespace: KnownCaipNamespace.Eip155,
  methods: METHODS,
  events: EVENTS,
  redirectMethods: REDIRECT_METHODS,

  async buildNamespace({ channelId }): Promise<NamespaceConfig | undefined> {
    const permittedChains = await getPermittedChains(channelId);
    const chains = permittedChains.filter((chain) =>
      chain.startsWith(EIP155_PREFIX),
    );

    if (chains.length === 0) {
      return undefined;
    }

    const approvedAccounts = getPermittedAccounts(channelId);
    const accounts = Array.isArray(approvedAccounts)
      ? chains.flatMap((chain) =>
          approvedAccounts.map((account) => `${chain}:${account}`),
        )
      : [];

    return { chains, methods: METHODS, events: EVENTS, accounts };
  },
};
