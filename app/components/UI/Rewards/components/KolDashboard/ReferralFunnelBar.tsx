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

/**
 * A referral funnel bar that fills from empty when the Performance screen is
 * opened, so the drop-off between funnel steps reads as movement rather than
 * four already-drawn bars.
 *
 * Width animates on the UI thread via Reanimated. Under Reduce Motion, and in
 * E2E runs, the bar is drawn at its final width instead — no fill, nothing
 * mid-flight when an assertion or screenshot lands.
 */
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
      twClassName="mt-1 h-2 overflow-hidden rounded-full bg-muted"
      testID={testID}
    >
      <Reanimated.View
        style={[tw.style('h-2 rounded-full bg-icon-default'), fillStyle]}
      />
    </Box>
  );
};

export default ReferralFunnelBar;
