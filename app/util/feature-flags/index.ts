import { getVersion } from 'react-native-device-info';
import compareVersions from 'compare-versions';

export interface FeatureFlagInfo {
  key: string;
  value: unknown;
  originalValue: unknown;
  type:
    | 'boolean'
    | 'string'
    | 'number'
    | 'array'
    | 'boolean with minimumVersion'
    | 'boolean nested'
    | 'object';
  description: string | undefined;
  isOverridden: boolean;
}

/**
 * Gets the type of a feature flag value
 */
export const getFeatureFlagType = (value: unknown): FeatureFlagInfo['type'] => {
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'string') return 'string';
  if (typeof value === 'number') return 'number';
  if (Array.isArray(value)) return 'array';
  if (
    typeof value === 'object' &&
    typeof value?.enabled === 'boolean' &&
    typeof value?.minimumVersion === 'string'
  ) {
    return 'boolean with minimumVersion';
  }
  if (typeof value === 'object' && typeof value.value === 'boolean')
    return 'boolean nested';
  if (typeof value === 'object' && value !== null) return 'object';
  return 'string';
};

/**
 * Gets descriptions for known feature flags
 */
export const getFeatureFlagDescription = (key: string): string | undefined => {
  const descriptions: Record<string, string> = {
    confirmation_redesign: 'Controls redesigned confirmation flows',
    sendRedesign: 'Controls redesigned send flow',
    bridgeConfigV2: 'Bridge configuration and supported chains',
    enableMultichainAccounts: 'Multichain account functionality',
    enableMultichainAccountsState2: 'Enhanced multichain account features',
    assetsDefiPositionsEnabled: 'DeFi positions tracking',
    assetsAccountApiBalancesEnabled: 'Account API balance fetching',
    bitcoinTestnetsEnabled: 'Bitcoin testnet support',
    solanaTestnetsEnabled: 'Solana testnet support',
    walletFrameworkRpcFailoverEnabled: 'RPC failover functionality',
    trxStakingEnabled: 'TRON staking features',
    tokenSearchDiscoveryEnabled: 'Token search and discovery',
    productSafetyDappScanningEnabled: 'DApp security scanning',
    minimumAppVersion: 'Minimum app version requirements',
  };
  return descriptions[key];
};

export const isMinimumRequiredVersionSupported = (
  minRequiredVersion: string,
) => {
  if (!minRequiredVersion) return false;
  try {
    const currentVersion = getVersion();
    return compareVersions.compare(currentVersion, minRequiredVersion, '>=');
  } catch {
    return false;
  }
};
