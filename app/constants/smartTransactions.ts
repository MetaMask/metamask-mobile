/* eslint-disable import/prefer-default-export */

import { isProduction } from '../util/environment';
import { NETWORKS_CHAIN_ID } from './network';
import { Hex } from '@metamask/utils';

// TODO: deprecate this and use the feature flags instead
const ALLOWED_SMART_TRANSACTIONS_CHAIN_IDS_DEVELOPMENT: Hex[] = [
  NETWORKS_CHAIN_ID.MAINNET,
  NETWORKS_CHAIN_ID.SEPOLIA,
  NETWORKS_CHAIN_ID.BASE,
  NETWORKS_CHAIN_ID.LINEA_MAINNET,
  NETWORKS_CHAIN_ID.BSC,
  NETWORKS_CHAIN_ID.ARBITRUM,
  NETWORKS_CHAIN_ID.POLYGON,
];

// TODO: deprecate this and use the feature flags instead
const ALLOWED_SMART_TRANSACTIONS_CHAIN_IDS_PRODUCTION: Hex[] = [
  NETWORKS_CHAIN_ID.MAINNET,
  NETWORKS_CHAIN_ID.BASE,
  NETWORKS_CHAIN_ID.LINEA_MAINNET,
  NETWORKS_CHAIN_ID.BSC,
  NETWORKS_CHAIN_ID.ARBITRUM,
  NETWORKS_CHAIN_ID.POLYGON,
];

export const getAllowedSmartTransactionsChainIds = (): Hex[] =>
  isProduction()
    ? ALLOWED_SMART_TRANSACTIONS_CHAIN_IDS_PRODUCTION
    : ALLOWED_SMART_TRANSACTIONS_CHAIN_IDS_DEVELOPMENT;
