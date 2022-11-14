/* eslint-disable import/prefer-default-export */

// External dependencies.
import { TEST_BADGE_NETWORK_PROPS } from './variants/BadgeNetwork/BadgeNetwork.constants';

// Internal dependencies.
import { BadgeProps, BadgeVariants } from './Badge.types';

// Test IDs
export const BADGE_NETWORK_TEST_ID = 'badge-network';

// Test consts
export const TEST_BADGE_PROPS: BadgeProps = {
  variant: BadgeVariants.Network,
  ...TEST_BADGE_NETWORK_PROPS,
};
