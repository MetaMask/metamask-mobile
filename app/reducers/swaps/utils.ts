import Device from '../../util/device';

interface FeatureFlags {
  [network: string]:
    | {
        mobileActive?: boolean;
        mobileActiveIOS?: boolean;
        mobileActiveAndroid?: boolean;
        [key: string]: unknown;
      }
    | boolean
    | undefined;
  smart_transactions: {
    mobile_active: boolean;
    extension_active: boolean;
  };
  smartTransactions: {
    mobileActive: boolean;
    extensionActive: boolean;
    mobileActiveIOS: boolean;
    mobileActiveAndroid: boolean;
  };
}

export const CHAIN_ID_TO_NAME_MAP: { [key: string]: string } = {
  '0x1': 'ethereum',
  '0x38': 'bsc',
  '0x89': 'polygon',
  '0xa86a': 'avalanche',
  '0xa4b1': 'arbitrum',
  '0xa': 'optimism',
  '0x144': 'zksync',
  '0xe708': 'linea',
  '0x539': 'ethereum',
  '0x2105': 'base',
  '0x531': 'sei',
};

export const getChainFeatureFlags = (
  featureFlags: FeatureFlags,
  chainId: `0x${string}`,
) => {
  const chainName = CHAIN_ID_TO_NAME_MAP[chainId];
  const chainFeatureFlags = featureFlags[chainName];
  return chainFeatureFlags;
};

type FeatureFlagDeviceKey =
  | 'mobileActiveIOS'
  | 'mobileActiveAndroid'
  | 'mobileActive';
export const getFeatureFlagDeviceKey: () => FeatureFlagDeviceKey = () => {
  const isIphone = Device.isIos();
  const isAndroid = Device.isAndroid();

  let featureFlagDeviceKey: FeatureFlagDeviceKey;
  if (isIphone) {
    featureFlagDeviceKey = 'mobileActiveIOS';
  } else if (isAndroid) {
    featureFlagDeviceKey = 'mobileActiveAndroid';
  } else {
    featureFlagDeviceKey = 'mobileActive';
  }

  return featureFlagDeviceKey;
};

export const getSwapsLiveness = (
  featureFlags: FeatureFlags,
  chainId: `0x${string}`,
) => {
  const chainFeatureFlags = getChainFeatureFlags(featureFlags, chainId);
  const featureFlagKey = getFeatureFlagDeviceKey();

  const liveness =
    typeof chainFeatureFlags === 'boolean'
      ? chainFeatureFlags
      : (chainFeatureFlags?.[featureFlagKey] ?? false);

  return liveness;
};
