import { FeatureFlags } from '@metamask/swaps-controller/dist/swapsInterfaces';
import Device from '../../util/device';
import { CHAIN_ID_TO_NAME_MAP } from '@metamask/swaps-controller/dist/constants';

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
    // @ts-expect-error interface mismatch
    typeof featureFlagsByChainId === 'boolean'
      ? chainFeatureFlags
      : chainFeatureFlags?.[featureFlagKey] ?? false;

  return liveness;
};
