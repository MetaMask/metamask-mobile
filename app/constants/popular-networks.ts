import { PopularList } from '../util/networks/customNetworks';
import { NETWORKS_CHAIN_ID } from './network';

export const POPULAR_NETWORK_CHAIN_IDS = new Set([
  ...PopularList.map((popular) => popular.chainId),
  NETWORKS_CHAIN_ID.MAINNET,
  NETWORKS_CHAIN_ID.LINEA_MAINNET,
]);

export const POPULAR_NETWORK_CHAIN_IDS_CAIP = new Set([
  ...PopularList.map((popular) => popular.chainId),
  NETWORKS_CHAIN_ID.MAINNET,
  NETWORKS_CHAIN_ID.LINEA_MAINNET,
]);
