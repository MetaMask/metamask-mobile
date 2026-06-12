import React, { useEffect, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedProps,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import {
  FontWeight,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import VipIcon from '../../../../../images/rewards/vip.svg';

const VIP_ICON_SIZE = 14;
import {
  VIP_GOLD_BACKGROUND_MUTED,
  VIP_GOLD_BORDER_GRADIENT_HEAD,
  VIP_GOLD_BORDER_GRADIENT_TAIL,
  VIP_GOLD_TEXT_DEFAULT,
} from '../Vip/Vip.constants';

const BORDER_STROKE_WIDTH = 1.5;
const BORDER_RADIUS = 6;
const BORDER_SWEEP_DURATION_MS = 2500;
const GRADIENT_ID = 'rewardsVipReferralTagBorderGradient';

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

const styles = StyleSheet.create({
  container: {
    // eslint-disable-next-line @metamask/design-tokens/color-no-hex
    backgroundColor: VIP_GOLD_BACKGROUND_MUTED,
    borderRadius: BORDER_RADIUS,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    gap: 3,
  },
  label: {
    // eslint-disable-next-line @metamask/design-tokens/color-no-hex
    color: VIP_GOLD_TEXT_DEFAULT,
  },
  border: { position: 'absolute', top: 0, left: 0 },
});

interface AnimatedBorderProps {
  width: number;
  height: number;
}

/**
 * Continuously rotating gold gradient stroke around the tag's rounded-rect
 * border — the gradient endpoints orbit the centre so the bright highlight
 * travels around the edge.
 */
const AnimatedBorder: React.FC<AnimatedBorderProps> = ({ width, height }) => {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, {
        duration: BORDER_SWEEP_DURATION_MS,
        easing: Easing.linear,
      }),
      -1,
      false,
    );
    return () => cancelAnimation(progress);
  }, [progress]);

  const gradientAnimatedProps = useAnimatedProps(() => {
    'worklet';
    const angle = 2 * Math.PI * progress.value;
    const cx = width / 2;
    const cy = height / 2;
    const r = Math.hypot(cx, cy);
    return {
      x1: cx + r * Math.cos(angle),
      y1: cy + r * Math.sin(angle),
      x2: cx - r * Math.cos(angle),
      y2: cy - r * Math.sin(angle),
    };
  });

  const inset = BORDER_STROKE_WIDTH / 2;

  return (
    <Svg
      width={width}
      height={height}
      style={styles.border}
      pointerEvents="none"
    >
      <Defs>
        <AnimatedLinearGradient
          id={GRADIENT_ID}
          gradientUnits="userSpaceOnUse"
          animatedProps={gradientAnimatedProps}
        >
          {/* eslint-disable-next-line @metamask/design-tokens/color-no-hex */}
          <Stop offset="0" stopColor={VIP_GOLD_BORDER_GRADIENT_TAIL} />
          {/* eslint-disable-next-line @metamask/design-tokens/color-no-hex */}
          <Stop offset="0.5" stopColor={VIP_GOLD_BORDER_GRADIENT_HEAD} />
          {/* eslint-disable-next-line @metamask/design-tokens/color-no-hex */}
          <Stop offset="1" stopColor={VIP_GOLD_BORDER_GRADIENT_TAIL} />
        </AnimatedLinearGradient>
      </Defs>
      <Rect
        x={inset}
        y={inset}
        width={width - BORDER_STROKE_WIDTH}
        height={height - BORDER_STROKE_WIDTH}
        rx={BORDER_RADIUS}
        fill="none"
        stroke={`url(#${GRADIENT_ID})`}
        strokeWidth={BORDER_STROKE_WIDTH}
      />
    </Svg>
  );
};

/**
 * Gold "VIP" tag shown next to a referral code that belongs to a VIP. Renders a
 * 14×14 gold fox + "VIP" label (Body/Xs/Medium) with a continuously shifting
 * gold gradient border.
 */
const RewardsVipReferralTag: React.FC = () => {
  const [size, setSize] = useState<{ width: number; height: number } | null>(
    null,
  );

  const handleLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize((prev) =>
      prev && prev.width === width && prev.height === height
        ? prev
        : { width, height },
    );
  };

  return (
    <View
      onLayout={handleLayout}
      style={styles.container}
      testID="rewards-vip-referral-tag"
    >
      {size ? <AnimatedBorder width={size.width} height={size.height} /> : null}
      <VipIcon name="VipIcon" width={VIP_ICON_SIZE} height={VIP_ICON_SIZE} />
      <Text
        variant={TextVariant.BodyXs}
        fontWeight={FontWeight.Medium}
        style={styles.label}
      >
        {strings('rewards.vip.referral_tag_label')}
      </Text>
    </View>
  );
};

export default RewardsVipReferralTag;
