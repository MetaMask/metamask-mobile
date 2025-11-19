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
    | 'ab test'
    | 'boolean nested'
    | 'object';
  description: string | undefined;
  isOverridden: boolean;
}

interface AbTestValueType {
  name: string;
  value: boolean;
  scope: {
    type: string;
    value: number;
  };
}

/**
 * Gets the type of a feature flag value
 */
export const getFeatureFlagType = (value: unknown): FeatureFlagInfo['type'] => {
  if (value === null) {
    return 'object';
  }
  if (typeof value === 'boolean') {
    return 'boolean';
  } else if (typeof value === 'string') {
    return 'string';
  } else if (typeof value === 'number') {
    return 'number';
  } else if (
    value &&
    typeof value === 'object' &&
    Object.hasOwnProperty.call(value, 'enabled') &&
    Object.hasOwnProperty.call(value, 'minimumVersion')
  ) {
    return 'boolean with minimumVersion';
  } else if (
    value &&
    Array.isArray(value) &&
    !!(value as unknown as AbTestValueType[])[0]?.name &&
    typeof (value as unknown as AbTestValueType[])[0].value === 'boolean' &&
    typeof (value as unknown as AbTestValueType[])[0].scope === 'object'
  ) {
    return 'ab test';
  } else if (
    typeof value === 'object' &&
    Array.isArray(value) &&
    typeof (value as unknown as { value: boolean }[])[0]?.value === 'boolean'
  ) {
    return 'boolean nested';
  } else if (Array.isArray(value)) {
    return 'array';
  } else if (typeof value === 'object') {
    return 'object';
  }
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
    otaUpdatesEnabled: 'OTA updates functionality',
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
