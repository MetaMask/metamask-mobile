import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';

export const DEFAULT_SMART_TRANSACTIONS_ALLOWED_RPC_HOSTS: string[] = [
  '.infura.io',
  '.binance.org',
];

export const SMART_TRANSACTIONS_ALLOWED_RPC_HOSTS_FLAG =
  'smartTransactionsAllowedRpcHosts';

export const selectAllowedSmartTransactionsRpcHosts = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags): string[] => {
    const allowedRpcHosts =
      remoteFeatureFlags?.[SMART_TRANSACTIONS_ALLOWED_RPC_HOSTS_FLAG];
    return Array.isArray(allowedRpcHosts) &&
      allowedRpcHosts.length > 0 &&
      allowedRpcHosts.every((host): host is string => typeof host === 'string')
      ? allowedRpcHosts
      : DEFAULT_SMART_TRANSACTIONS_ALLOWED_RPC_HOSTS;
  },
);
