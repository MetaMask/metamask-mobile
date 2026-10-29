import React, { useEffect } from 'react';
import Reanimated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { Box } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { hasTestOverrides } from '../../../../../util/test/utils';
import {
  REFERRAL_FUNNEL_FILL_TIMING,
  referralFunnelFillDelay,
} from '../../constants/referralFunnelAnimation';

interface ReferralFunnelBarProps {
  /** Share of the funnel's top-of-funnel count this row represents, 0–1. */
  ratio: number;
  /** Row position in the funnel, top to bottom. Drives the stagger. */
  index: number;
  testID?: string;
}

const clampRatio = (ratio: number): number => Math.max(0, Math.min(1, ratio));

const ReferralFunnelBar: React.FC<ReferralFunnelBarProps> = ({
  ratio,
  index,
  testID,
}) => {
  const tw = useTailwind();
  const prefersReducedMotion = useReducedMotion();
  const skipFill = prefersReducedMotion || hasTestOverrides;
  const target = clampRatio(ratio);
  const fill = useSharedValue(skipFill ? target : 0);

  useEffect(() => {
    if (skipFill) {
      fill.value = target;
      return;
    }

    fill.value = withDelay(
      referralFunnelFillDelay(index),
      withTiming(target, REFERRAL_FUNNEL_FILL_TIMING),
    );
  }, [fill, index, skipFill, target]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${fill.value * 100}%`,
  }));

  return (
    <Box
      twClassName="mt-2 h-2 overflow-hidden rounded-full bg-muted"
      testID={testID}
    >
      <Reanimated.View
        style={[tw.style('h-2 rounded-full bg-icon-default'), fillStyle]}
      />
    </Box>
  );
};

export default ReferralFunnelBar;
