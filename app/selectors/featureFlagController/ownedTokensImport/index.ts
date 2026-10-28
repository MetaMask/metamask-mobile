import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';
import {
  validatedVersionGatedFeatureFlag,
  type VersionGatedFeatureFlag,
} from '../../../util/remoteFeatureFlag';

export const OWNED_TOKENS_IMPORT_FLAG = 'ownedTokensImportEnabled';

export const selectOwnedTokensImportEnabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags): boolean => {
    const remoteFlag = remoteFeatureFlags?.[
      OWNED_TOKENS_IMPORT_FLAG
    ] as unknown as VersionGatedFeatureFlag;

    return validatedVersionGatedFeatureFlag(remoteFlag) ?? false;
  },
);
