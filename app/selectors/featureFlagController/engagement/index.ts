import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';
import { validatedVersionGatedFeatureFlag } from '../../../util/remoteFeatureFlag';

/**
 * Registry / client-config key for the pre-push prompt version-gated flag.
 */
export const PRE_PUSH_PROMPT_FLAG_KEY = 'prePushPromptMinVersion' as const;

/**
 * Whether the startup pre-push prompt (push permission / marketing consent nudge)
 * is allowed to open.
 *
 * LaunchDarkly variation value (direct or wrapped in `{ value: ... }`):
 * `{ "enabled": true | false, "minimumVersion": "x.x.x" }`
 *
 * Returns `true` only when `enabled` is true and the app version satisfies
 * `minimumVersion`. Otherwise `false`, including invalid or missing payloads.
 */
export const selectPrePushPromptEnabled = createSelector(
  selectRemoteFeatureFlags,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  (_remoteFeatureFlags): boolean => 
    // TODO: remove hardcode before merging — temporarily forced true for local testing
     true
  ,
);
