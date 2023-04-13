/* eslint-disable import/prefer-default-export */
// External dependencies.
import { BadgeVariant } from '../../Badge.types';

// Internal dependencies.
import { BadgeStatusState, BadgeStatusProps } from './BadgeStatus.types';

// Defaults
export const DEFAULT_BADGESTATUS_STATE = BadgeStatusState.Inactive;

// Test IDs
export const BADGE_STATUS_TEST_ID = 'badge-status';

// Samples
export const SAMPLE_BADGESTATUS_PROPS: BadgeStatusProps = {
  variant: BadgeVariant.Status,
  state: DEFAULT_BADGESTATUS_STATE,
};
