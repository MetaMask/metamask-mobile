import React from 'react';
import {
  Icon,
  IconColor,
  IconSize,
} from '@metamask/design-system-react-native';
import type { HomepageDiscoveryPillIconStyle } from '../../abTestConfig';
import {
  HOMEPAGE_DISCOVERY_PILL_GRAY_ICONS,
  type HomepageDiscoveryPillId,
} from './homepageDiscoveryPills.constants';

interface HomepageDiscoveryPillIconProps {
  pillId: HomepageDiscoveryPillId;
  iconStyle: HomepageDiscoveryPillIconStyle;
}

/**
 * Discovery-pill mark. Both AB `iconStyle`s use the DS `Icon` so the homepage
 * Lucide override applies; color PNGs are no longer rendered.
 */
const HomepageDiscoveryPillIcon: React.FC<HomepageDiscoveryPillIconProps> = ({
  pillId,
}) => (
  <Icon
    name={HOMEPAGE_DISCOVERY_PILL_GRAY_ICONS[pillId]}
    size={IconSize.Lg}
    color={IconColor.IconAlternative}
  />
);

export default HomepageDiscoveryPillIcon;
