import { hasProperty } from '@metamask/utils';
import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';
import { FeatureFlagNames } from '../../../constants/featureFlags';
import {
  validatedVersionGatedFeatureFlag,
  type VersionGatedFeatureFlag,
} from '../../../util/remoteFeatureFlag';

const DEFAULT_LEDGER_DMK_ENABLED = false;

/**
 * Selector for the Ledger DMK feature flag.
 *
 * Resolution order:
 * 1. Boolean dev-tool local override (takes precedence).
 * 2. Remote version-gated flag via `validatedVersionGatedFeatureFlag`.
 * 3. Default (`false`) when the flag is absent, undefined, or override-activated.
 *
 * @returns Boolean indicating whether Ledger DMK is enabled.
 */
export const selectLedgerDmkEnabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    if (!hasProperty(remoteFeatureFlags, FeatureFlagNames.ledgerDmk)) {
      return DEFAULT_LEDGER_DMK_ENABLED;
    }

    const rawFlag = remoteFeatureFlags[FeatureFlagNames.ledgerDmk];

    // Boolean dev-tool local overrides take precedence.
    if (typeof rawFlag === 'boolean') {
      return rawFlag;
    }

    const remoteFlag = rawFlag as unknown as VersionGatedFeatureFlag;
    return (
      validatedVersionGatedFeatureFlag(remoteFlag) ?? DEFAULT_LEDGER_DMK_ENABLED
    );
  },
);
