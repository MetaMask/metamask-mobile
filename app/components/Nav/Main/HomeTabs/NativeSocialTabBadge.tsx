import React from 'react';
import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  BadgeStatus,
  BadgeStatusStatus,
  BadgeWrapper,
  BadgeWrapperPosition,
  BadgeWrapperPositionAnchorShape,
  Box,
} from '@metamask/design-system-react-native';

import {
  TAB_BAR_FLOATING_HEIGHT,
  TAB_BAR_FLOATING_HORIZONTAL_INSET,
  TAB_BAR_FLOATING_GAP,
} from '../../../../component-library/components/Navigation/TabBarFloating/TabBarFloating.constants';
import { getTabBarFloatingBottomPadding } from '../../../../component-library/components/Navigation/TabBarFloating/TabBarFloating.utils';

export const SOCIAL_TAB_BADGE_OVERLAY_TEST_ID = 'social-tab-badge-overlay';
export const NATIVE_TAB_ICON_SIZE = 28;
export const FLOATING_TAB_ICON_SIZE = 24;
/** Horizontal padding from the floating pill's `p-1` class. */
const FLOATING_TAB_BAR_PILL_PADDING = 4;

interface NativeSocialTabBadgeProps {
  tabIndex: number;
  tabCount: number;
  iconSize?: number;
}

interface NativeSocialTabBadgePositionInput {
  width: number;
  height: number;
  bottomInset: number;
  tabIndex: number;
  tabCount: number;
  iconSize?: number;
}

export const getNativeSocialTabBadgePosition = ({
  width,
  height,
  bottomInset,
  tabIndex,
  tabCount,
  iconSize,
}: NativeSocialTabBadgePositionInput) => {
  const bottomPadding = getTabBarFloatingBottomPadding(bottomInset);
  const tabBarWidth =
    width -
    TAB_BAR_FLOATING_HORIZONTAL_INSET * 2 -
    TAB_BAR_FLOATING_GAP -
    TAB_BAR_FLOATING_HEIGHT;
  const tabBarContentWidth = tabBarWidth - FLOATING_TAB_BAR_PILL_PADDING * 2;
  const tabWidth = tabBarContentWidth / tabCount;

  return {
    left:
      TAB_BAR_FLOATING_HORIZONTAL_INSET +
      FLOATING_TAB_BAR_PILL_PADDING +
      tabWidth * (tabIndex + 0.5) -
      (iconSize ?? NATIVE_TAB_ICON_SIZE) / 2,
    top: height - bottomPadding - TAB_BAR_FLOATING_HEIGHT + 6,
  };
};

/**
 * UIKit owns the native tab item views, so the badge is positioned from the
 * same iOS 26 geometry used by the floating tab bar. It is non-interactive so
 * the native tab remains the hit target underneath it.
 */
const NativeSocialTabBadge = ({
  tabIndex,
  tabCount,
  iconSize = NATIVE_TAB_ICON_SIZE,
}: NativeSocialTabBadgeProps) => {
  const { width, height } = useWindowDimensions();
  const { bottom } = useSafeAreaInsets();
  const { left, top } = getNativeSocialTabBadgePosition({
    width,
    height,
    bottomInset: bottom,
    tabIndex,
    tabCount,
    iconSize,
  });

  return (
    <Box
      pointerEvents="none"
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      twClassName="absolute"
      style={{
        left,
        top,
        width: iconSize,
        height: iconSize,
      }}
    >
      <BadgeWrapper
        position={BadgeWrapperPosition.TopRight}
        positionAnchorShape={BadgeWrapperPositionAnchorShape.Circular}
        badge={
          <BadgeStatus
            status={BadgeStatusStatus.Active}
            twClassName="translate-y-1"
            testID={SOCIAL_TAB_BADGE_OVERLAY_TEST_ID}
          />
        }
      >
        <Box
          pointerEvents="none"
          style={{ width: iconSize, height: iconSize }}
        />
      </BadgeWrapper>
    </Box>
  );
};

export default NativeSocialTabBadge;
