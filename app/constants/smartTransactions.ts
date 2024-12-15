/* eslint-disable import/prefer-default-export */

import { isProduction } from '../util/environment';
import { NETWORKS_CHAIN_ID } from './network';

const ALLOWED_SMART_TRANSACTIONS_CHAIN_IDS_DEVELOPMENT: string[] = [
  NETWORKS_CHAIN_ID.MAINNET,
  NETWORKS_CHAIN_ID.SEPOLIA,
];

const ALLOWED_SMART_TRANSACTIONS_CHAIN_IDS_PRODUCTION: string[] = [
  NETWORKS_CHAIN_ID.MAINNET,
];

export const getAllowedSmartTransactionsChainIds = (): string[] =>
  isProduction()
    ? ALLOWED_SMART_TRANSACTIONS_CHAIN_IDS_PRODUCTION
    : ALLOWED_SMART_TRANSACTIONS_CHAIN_IDS_DEVELOPMENT;
