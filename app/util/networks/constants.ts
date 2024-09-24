import { RpcEndpointType } from '@metamask/network-controller';
import { mockNetworkState } from '../test/network';

export const mainnetNetworkState = mockNetworkState({
  chainId: '0x1',
  id: 'mainnet',
  nickname: 'Ethereum Mainnet',
  ticker: 'ETH',
  blockExplorerUrl: 'https://etherscan.io',
  type: RpcEndpointType.Infura,
});

export const lineaGoerliNetworkState = mockNetworkState({
  chainId: '0xe704',
  id: 'mainnet',
  nickname: 'Ethereum Mainnet',
  ticker: 'ETH',
  blockExplorerUrl: 'https://goerli.lineascan.build',
});
