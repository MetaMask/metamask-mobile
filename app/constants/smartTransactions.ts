/* eslint-disable import/prefer-default-export */

import { isProduction } from '../util/environment';
import { NETWORKS_CHAIN_ID } from './network';

const ALLOWED_SMART_TRANSACTIONS_CHAIN_IDS_DEVELOPMENT: string[] = [
  NETWORKS_CHAIN_ID.MAINNET,
  // NETWORKS_CHAIN_ID.SEPOLIA, // TODO: Add sepolia to dev when ready
  // NETWORKS_CHAIN_ID.BASE, // TODO: Add base to dev when ready
  // NETWORKS_CHAIN_ID.LINEA_MAINNET, // TODO: Add linea mainnet to dev when ready
  NETWORKS_CHAIN_ID.BSC,
];

const ALLOWED_SMART_TRANSACTIONS_CHAIN_IDS_PRODUCTION: string[] = [
  NETWORKS_CHAIN_ID.MAINNET,
  // NETWORKS_CHAIN_ID.BASE, // TODO: Add base to production when ready
  // NETWORKS_CHAIN_ID.LINEA_MAINNET, // TODO: Add linea mainnet to production when ready
  NETWORKS_CHAIN_ID.BSC,
];

export const getAllowedSmartTransactionsChainIds = (): string[] =>
  isProduction()
    ? ALLOWED_SMART_TRANSACTIONS_CHAIN_IDS_PRODUCTION
    : ALLOWED_SMART_TRANSACTIONS_CHAIN_IDS_DEVELOPMENT;
