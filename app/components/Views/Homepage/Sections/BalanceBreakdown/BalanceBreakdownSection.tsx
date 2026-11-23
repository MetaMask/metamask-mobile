import React, { useCallback, useRef } from 'react';
import type { LayoutChangeEvent } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Box } from '@metamask/design-system-react-native';
import { AnimationDuration } from '@metamask/design-tokens';
import HomepageBalanceBreakdown from '../../components/HomepageBalanceBreakdown';
import type { HomepageBalanceBreakdownProps } from '../../components/HomepageBalanceBreakdown/HomepageBalanceBreakdown';
import type { HomepageDeviceCapability } from '../../types';

export const BALANCE_BREAKDOWN_SECTION_TEST_ID =
  'homepage-balance-breakdown-section';

const BALANCE_BREAKDOWN_LAYOUT_DURATION = AnimationDuration.Regularly;
const BALANCE_BREAKDOWN_CONSTRAINED_DURATION = AnimationDuration.Fast;

export interface BalanceBreakdownSectionProps
  extends HomepageBalanceBreakdownProps {
  deviceCapability?: HomepageDeviceCapability;
}

const getLayoutDuration = (
  deviceCapability?: HomepageDeviceCapability,
): number => {
  if (
    deviceCapability?.hardwareTier === 'LOW' ||
    deviceCapability?.networkTier === 'NONE' ||
    deviceCapability?.networkTier === 'SLOW_CELLULAR'
  ) {
    return BALANCE_BREAKDOWN_CONSTRAINED_DURATION;
  }

  return BALANCE_BREAKDOWN_LAYOUT_DURATION;
};

const BalanceBreakdownSection = ({
  deviceCapability,
  ...props
}: BalanceBreakdownSectionProps) => {
  const sectionHeight = useSharedValue(-1);
  const previousHeight = useRef<number | undefined>(undefined);
  const layoutDuration = getLayoutDuration(deviceCapability);

  const handleContentLayout = useCallback(
    ({ nativeEvent }: LayoutChangeEvent) => {
      const nextHeight = Math.ceil(nativeEvent.layout.height);

      if (previousHeight.current === nextHeight) {
        return;
      }

      previousHeight.current = nextHeight;
      sectionHeight.value =
        sectionHeight.value < 0
          ? nextHeight
          : withTiming(nextHeight, {
              duration: layoutDuration,
            });
    },
    [layoutDuration, sectionHeight],
  );

  const animatedSectionStyle = useAnimatedStyle(() => ({
    height: sectionHeight.value >= 0 ? sectionHeight.value : undefined,
  }));

  return (
    <Box twClassName="overflow-hidden">
      <Animated.View style={animatedSectionStyle}>
        <Box
          onLayout={handleContentLayout}
          paddingBottom={1}
          testID={BALANCE_BREAKDOWN_SECTION_TEST_ID}
        >
          <HomepageBalanceBreakdown
            {...props}
            contentLayoutDuration={layoutDuration}
          />
        </Box>
      </Animated.View>
    </Box>
  );
};

export default BalanceBreakdownSection;
