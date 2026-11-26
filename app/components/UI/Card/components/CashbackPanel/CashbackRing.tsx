import React, { useEffect } from 'react';
import { Pressable } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import {
  Box,
  BoxAlignItems,
  BoxJustifyContent,
  FontWeight,
  IconSize,
  Spinner,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { Skeleton } from '../../../../../component-library/components-temp/Skeleton';
import { strings } from '../../../../../../locales/i18n';
import { useTheme } from '../../../../../util/theme';
import {
  CashbackPanelProps,
  getCashbackSublabel,
  useCashbackFill,
} from './CashbackPanel';
import { CashbackPanelSelectors } from './CashbackPanel.testIds';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const RING_SIZE = 60;
const RING_STROKE = 5;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CENTER = RING_SIZE / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
/** One breath of the claimable pulse (grow, then settle). */
const PULSE_HALF_MS = 900;

/**
 * PROTOTYPE (option 2): a compact cashback ring on the trailing side of the
 * Card home balance header. It fills towards the next payout increment with
 * the cashback balance in the middle. Tapping it claims (or opens set up),
 * so there is no separate status line or pill. Same props and states as the
 * panel, so the container can swap one for the other.
 */
const CashbackRing = (props: CashbackPanelProps) => {
  const {
    status,
    progress,
    availableLabel,
    claimableLabel,
    refillKey,
    isRefillPending,
    onClaim,
    onSetup,
  } = props;
  const tw = useTailwind();
  const { colors } = useTheme();
  const reduceMotion = useReducedMotion();

  const isLoading = status === 'loading';
  const isClaimable = status === 'claimable';
  const isClaiming = status === 'claiming';
  const isComplete = isClaimable || isClaiming;
  const needsSetup =
    status === 'setupMoneyAccount' || status === 'setupFunding';
  const showFill = !isLoading && status !== 'unavailable';

  const { fill, isFilled, clamped } = useCashbackFill({
    progress,
    refillKey,
    isRefillPending,
  });

  const fillProps = useAnimatedProps(() => ({
    strokeDashoffset: RING_CIRCUMFERENCE * (1 - fill.value),
  }));

  // The ring's equivalent of the panel shimmer: a soft pulse once the fill
  // has landed, only while a payout is ready to claim.
  const pulse = useSharedValue(1);
  const isPulsing = isClaimable && isFilled && !reduceMotion;
  useEffect(() => {
    if (isPulsing) {
      pulse.value = withRepeat(
        withTiming(1.08, {
          duration: PULSE_HALF_MS,
          easing: Easing.inOut(Easing.quad),
        }),
        -1,
        true,
      );
    } else {
      cancelAnimation(pulse);
      pulse.value = 1;
    }
    return () => cancelAnimation(pulse);
  }, [isPulsing, pulse]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  const handlePress = () => {
    if (isClaimable) {
      onClaim();
    } else if (needsSetup) {
      onSetup();
    }
  };

  const accessibilityLabel = isClaimable
    ? strings('card.card_home.cashback_panel.claim_a11y', {
        amount: claimableLabel,
      })
    : `${strings('card.card_home.cashback_panel.title')}, ${availableLabel}. ${
        isLoading ? '' : getCashbackSublabel(props)
      }`.trim();

  return (
    <Pressable
      onPress={handlePress}
      disabled={!isClaimable && !needsSetup}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ busy: isClaiming }}
      hitSlop={8}
      testID={CashbackPanelSelectors.RING_CONTAINER}
    >
      <Animated.View style={pulseStyle}>
        <Box
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Center}
          style={{ width: RING_SIZE, height: RING_SIZE }}
          accessibilityRole="progressbar"
          accessibilityValue={{
            min: 0,
            max: 100,
            now: Math.round(clamped * 100),
          }}
          testID={CashbackPanelSelectors.RING}
        >
          <Svg
            width={RING_SIZE}
            height={RING_SIZE}
            style={tw.style('absolute')}
          >
            <Circle
              cx={RING_CENTER}
              cy={RING_CENTER}
              r={RING_RADIUS}
              stroke={colors.border.muted}
              strokeWidth={RING_STROKE}
              fill="transparent"
            />
            {showFill ? (
              <AnimatedCircle
                animatedProps={fillProps}
                cx={RING_CENTER}
                cy={RING_CENTER}
                r={RING_RADIUS}
                stroke={
                  isComplete ? colors.success.default : colors.primary.default
                }
                strokeWidth={RING_STROKE}
                strokeLinecap="round"
                strokeDasharray={`${RING_CIRCUMFERENCE} ${RING_CIRCUMFERENCE}`}
                fill="transparent"
                transform={`rotate(-90 ${RING_CENTER} ${RING_CENTER})`}
                testID={CashbackPanelSelectors.RING_FILL}
              />
            ) : null}
          </Svg>
          {isLoading ? (
            <Skeleton
              twClassName="h-3 w-8 rounded-sm"
              testID={CashbackPanelSelectors.SKELETON}
            />
          ) : null}
          {isClaiming ? (
            <Spinner
              spinnerIconProps={{ size: IconSize.Sm }}
              testID={CashbackPanelSelectors.RING_SPINNER}
            />
          ) : null}
          {!isLoading && !isClaiming ? (
            <Text
              variant={TextVariant.BodyXs}
              fontWeight={FontWeight.Medium}
              testID={CashbackPanelSelectors.RING_AMOUNT}
            >
              {availableLabel}
            </Text>
          ) : null}
        </Box>
      </Animated.View>
    </Pressable>
  );
};

export default CashbackRing;
