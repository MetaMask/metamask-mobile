import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';
import { hasProperty } from '@metamask/utils';
import { selectBasicFunctionalityEnabled } from '../../settings';

const DEFAULT_IMPORT_SRP_WORD_SUGGESTION_ENABLED = false;
export const IMPORT_SRP_WORD_SUGGESTION_FLAG_NAME = 'importSrpWordSuggestion';

/**
 * Selector for the raw import SRP word suggestion remote flag value.
 * Returns the flag value without considering basic functionality.
 */
export const selectImportSrpWordSuggestionEnabledRawFlag = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    if (
      !hasProperty(remoteFeatureFlags, IMPORT_SRP_WORD_SUGGESTION_FLAG_NAME)
    ) {
      return DEFAULT_IMPORT_SRP_WORD_SUGGESTION_ENABLED;
    }
    const remoteFlag = remoteFeatureFlags[IMPORT_SRP_WORD_SUGGESTION_FLAG_NAME];

    return Boolean(remoteFlag);
  },
);

/**
 * Selector for the import SRP word suggestion enabled flag.
 * Returns false if basic functionality is disabled, otherwise returns the remote flag value.
 */
export const selectImportSrpWordSuggestionEnabledFlag = createSelector(
  selectBasicFunctionalityEnabled,
  selectImportSrpWordSuggestionEnabledRawFlag,
  (isBasicFunctionalityEnabled, importSrpWordSuggestionEnabledRawFlag) => {
    if (!isBasicFunctionalityEnabled) {
      return false;
    }
    return importSrpWordSuggestionEnabledRawFlag;
  },
);
