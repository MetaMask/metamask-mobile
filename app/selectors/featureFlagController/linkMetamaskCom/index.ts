import { hasProperty } from '@metamask/utils';
import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';
import { FeatureFlagNames } from '../../../constants/featureFlags';
import {
  validatedVersionGatedFeatureFlag,
  type VersionGatedFeatureFlag,
} from '../../../util/remoteFeatureFlag';

const DEFAULT_LINK_METAMASK_COM_ENABLED = false;

/**
 * Whether `link.metamask.com` universal links are accepted in JavaScript.
 * Native App Links claiming cannot be gated; this flag gates in-app routing.
 */
export const selectLinkMetamaskComEnabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags): boolean => {
    if (
      !hasProperty(remoteFeatureFlags, FeatureFlagNames.linkMetamaskComEnabled)
    ) {
      return DEFAULT_LINK_METAMASK_COM_ENABLED;
    }

    const rawFlag = remoteFeatureFlags[FeatureFlagNames.linkMetamaskComEnabled];

    if (typeof rawFlag === 'boolean') {
      return rawFlag;
    }

    const remoteFlag = rawFlag as unknown as VersionGatedFeatureFlag;
    return (
      validatedVersionGatedFeatureFlag(remoteFlag) ??
      DEFAULT_LINK_METAMASK_COM_ENABLED
    );
  },
);
