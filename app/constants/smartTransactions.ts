/* eslint-disable import/prefer-default-export */

import { isProduction } from '../util/environment';
import { NETWORKS_CHAIN_ID } from './network';

const ALLOWED_SMART_TRANSACTIONS_CHAIN_IDS_DEVELOPMENT: string[] = [
  NETWORKS_CHAIN_ID.MAINNET,
  NETWORKS_CHAIN_ID.SEPOLIA,
  NETWORKS_CHAIN_ID.BASE,
  NETWORKS_CHAIN_ID.LINEA_MAINNET,
  NETWORKS_CHAIN_ID.BSC,
];

const ALLOWED_SMART_TRANSACTIONS_CHAIN_IDS_PRODUCTION: string[] = [
  NETWORKS_CHAIN_ID.MAINNET,
  // NETWORKS_CHAIN_ID.BASE, // TODO: Add base to production when ready
  // NETWORKS_CHAIN_ID.LINEA_MAINNET, // TODO: Add linea mainnet to production when ready
  // NETWORKS_CHAIN_ID.BSC, // TODO: Add BSC to production when ready
];

export const getAllowedSmartTransactionsChainIds = (): string[] =>
  isProduction()
    ? ALLOWED_SMART_TRANSACTIONS_CHAIN_IDS_PRODUCTION
    : ALLOWED_SMART_TRANSACTIONS_CHAIN_IDS_DEVELOPMENT;
