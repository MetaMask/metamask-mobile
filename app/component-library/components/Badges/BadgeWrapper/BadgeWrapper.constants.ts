// External dependencies.
import { BadgeProps, BadgeVariants } from '../Badge/Badge.types';
import { TEST_NETWORK_PROPS } from '../Badge/variants/BadgeNetwork/BadgeNetwork.constants';

export const BADGE_WRAPPER_BADGE_TEST_ID = 'badge-wrapper-badge';

export const TEST_BADGE_PROPS: BadgeProps = {
  variant: BadgeVariants.Network,
  networkProps: TEST_NETWORK_PROPS,
};
