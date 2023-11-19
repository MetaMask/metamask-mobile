/* eslint-disable import/prefer-default-export */
// Internal dependencies.
import { BadgeStatusState, BadgeStatusProps } from './BadgeStatus.types';

// Defaults
export const DEFAULT_BADGESTATUS_STATE = BadgeStatusState.Inactive;

// Test IDs
export const BADGE_STATUS_TEST_ID = 'badge-status';

// Samples
export const SAMPLE_BADGESTATUS_PROPS: BadgeStatusProps = {
  state: DEFAULT_BADGESTATUS_STATE,
};
