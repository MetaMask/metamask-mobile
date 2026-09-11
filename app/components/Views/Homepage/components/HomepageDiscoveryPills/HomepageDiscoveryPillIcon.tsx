import React from 'react';
import { Image } from 'react-native';
import {
  Icon,
  IconColor,
  IconSize,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import type { HomepageDiscoveryPillIconStyle } from '../../abTestConfig';
import {
  HOMEPAGE_DISCOVERY_PILL_COLOR_ICON_SOURCES,
  HOMEPAGE_DISCOVERY_PILL_GRAY_ICONS,
  type HomepageDiscoveryPillId,
} from './homepageDiscoveryPills.constants';

interface HomepageDiscoveryPillIconProps {
  pillId: HomepageDiscoveryPillId;
  iconStyle: HomepageDiscoveryPillIconStyle;
}

const HomepageDiscoveryPillIcon: React.FC<HomepageDiscoveryPillIconProps> = ({
  pillId,
  iconStyle,
}) => {
  const tw = useTailwind();
  if (iconStyle === 'color') {
    return (
      <Image
        source={HOMEPAGE_DISCOVERY_PILL_COLOR_ICON_SOURCES[pillId]}
        style={tw.style('h-8 w-8')}
        resizeMode="contain"
        accessibilityIgnoresInvertColors
      />
    );
  }

  return (
    <Icon
      name={HOMEPAGE_DISCOVERY_PILL_GRAY_ICONS[pillId]}
      size={IconSize.Lg}
      color={IconColor.IconAlternative}
    />
  );
};

export default HomepageDiscoveryPillIcon;
