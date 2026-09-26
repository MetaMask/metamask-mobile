import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';
import {
  validatedVersionGatedFeatureFlag,
  VersionGatedFeatureFlag,
} from '../../../util/remoteFeatureFlag';

export const RAMPS_OFF_RAMP_NON_EVM_FLAG_KEY = 'rampsOffRampNonEvm';

/**
 * Gates the non-EVM (e.g. Solana) off-ramp sell flow. Mirrors the Ramps API
 * `enableSolana` server-side gate: non-EVM ramps need a client flag because the
 * send step is delegated to a Snap, which older app versions don't support.
 */
export const selectOffRampNonEvmEnabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    const remoteFlag = remoteFeatureFlags[
      RAMPS_OFF_RAMP_NON_EVM_FLAG_KEY
    ] as unknown as VersionGatedFeatureFlag;
    return validatedVersionGatedFeatureFlag(remoteFlag) ?? false;
  },
);
