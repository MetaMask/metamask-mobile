/* eslint-disable import/prefer-default-export */

// External dependencies.
import { SAMPLE_BADGE_NETWORK_PROPS } from './variants/BadgeNetwork/BadgeNetwork.constants';

// Internal dependencies.
import { BadgeProps, BadgeVariants } from './Badge.types';

// Test IDs
export const BADGE_NETWORK_TEST_ID = 'badge-network';

// Sample consts
export const SAMPLE_BADGE_PROPS: BadgeProps = {
  variant: BadgeVariants.Network,
  ...SAMPLE_BADGE_NETWORK_PROPS,
};
