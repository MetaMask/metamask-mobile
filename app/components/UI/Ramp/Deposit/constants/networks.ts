import { CaipChainId } from '@metamask/utils';

interface DepositNetwork {
  chainId: CaipChainId;
  name: string;
}
export const ETHEREUM_MAINNET: DepositNetwork = {
  chainId: 'eip155:1',
  name: 'Ethereum',
};

export const LINEA_MAINNET: DepositNetwork = {
  chainId: 'eip155:59144',
  name: 'Linea',
};
export const BASE_MAINNET: DepositNetwork = {
  chainId: 'eip155:8453',
  name: 'Base',
};
export const SOLANA_MAINNET: DepositNetwork = {
  chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
  name: 'Solana',
};
export const BSC_MAINNET: DepositNetwork = {
  chainId: 'eip155:56',
  name: 'BNB Smart Chain',
};

export const DEPOSIT_NETWORKS_BY_CHAIN_ID: Record<CaipChainId, DepositNetwork> =
  {
    [ETHEREUM_MAINNET.chainId]: ETHEREUM_MAINNET,
    [LINEA_MAINNET.chainId]: LINEA_MAINNET,
    [BASE_MAINNET.chainId]: BASE_MAINNET,
    [SOLANA_MAINNET.chainId]: SOLANA_MAINNET,
    [BSC_MAINNET.chainId]: BSC_MAINNET,
  };
