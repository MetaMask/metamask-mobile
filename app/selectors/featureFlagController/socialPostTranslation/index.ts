import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';
import {
  VersionGatedFeatureFlag,
  validatedVersionGatedFeatureFlag,
} from '../../../util/remoteFeatureFlag';

/**
 * Read on every selection. The remote flag object does not change when only
 * this env fallback changes, so it has to be its own selector input.
 */
const selectSocialPostTranslationEnvFallback = (): boolean =>
  process.env.MM_SOCIAL_POST_TRANSLATION_ENABLED === 'true';

/**
 * Remote flag `socialPostTranslationEnabled`, shaped
 * `{ enabled, minimumVersion }`. `MM_SOCIAL_POST_TRANSLATION_ENABLED=true`
 * is the local fallback when the remote value is missing or overridden.
 */
export const selectSocialPostTranslationEnabled = createSelector(
  selectRemoteFeatureFlags,
  selectSocialPostTranslationEnvFallback,
  (remoteFeatureFlags, localFlag) => {
    const remoteFlag =
      remoteFeatureFlags?.socialPostTranslationEnabled as unknown as VersionGatedFeatureFlag;

    return validatedVersionGatedFeatureFlag(remoteFlag) ?? localFlag;
  },
);
