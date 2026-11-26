import React, { useEffect, useState } from 'react';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import {
  AvatarToken,
  AvatarTokenSize,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Button,
  ButtonSemantic,
  ButtonSemanticSeverity,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  IconName,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { MUSD_TOKEN } from '../../../Earn/constants/musd';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { Skeleton } from '../../../../../component-library/components-temp/Skeleton';
import { strings } from '../../../../../../locales/i18n';
import ShimmerOverlay from '../../Views/SpendingLimit/components/ShimmerOverlay';
import { CashbackPanelSelectors } from './CashbackPanel.testIds';

export type CashbackPanelStatus =
  | 'loading'
  | 'accruing'
  | 'claimable'
  | 'claiming'
  | 'setupMoneyAccount'
  | 'setupFunding'
  | 'autoPayout'
  | 'unavailable';

export interface CashbackPanelProps {
  status: CashbackPanelStatus;
  /** Everything accrued, formatted (e.g. "$12.30"). */
  availableLabel: string;
  /** The whole-increment amount a claim pays out, formatted (e.g. "$10.00"). */
  claimableLabel: string;
  /** Carry-over towards the next increment, formatted (e.g. "$2.30"). */
  remainderLabel: string;
  /** The payout increment, formatted (e.g. "$5"). */
  incrementLabel: string;
  /** Progress towards the next increment, 0 to 1. */
  progress: number;
  /**
   * Lifetime cashback earned from card spend, formatted. Shown in the empty
   * state (nothing accrued yet, e.g. right after a claim) when above zero.
   */
  lifetimeEarnedLabel?: string;
  /** Card cashback rate in percent (e.g. "1"), shown in the title. */
  percentageLabel?: string;
  onClaim: () => void;
  onSetup: () => void;
  /**
   * Bumped each time Card home comes into focus and its transition has
   * ended: the fill restarts from empty and animates to `progress`.
   */
  refillKey?: number;
  /** Card home is focusing and still in transition: hold the fill at empty. */
  isRefillPending?: boolean;
}

/** Fill duration when Card home comes into focus or the value changes. */
export const CASHBACK_FILL_DURATION_MS = 700;

/** Half a cycle of the claiming pulse on the full green bar. */
export const CASHBACK_PULSE_HALF_MS = 650;

/**
 * Animates a 0..1 fill value: empty while a refill is pending, then eases out
 * to `progress`. Reduce Motion jumps straight to the value. Returns whether
 * the fill has reached its value (the claimable shimmer waits for this).
 */
export const useCashbackFill = ({
  progress,
  refillKey = 0,
  isRefillPending = false,
  isHeld = false,
}: {
  progress: number;
  refillKey?: number;
  isRefillPending?: boolean;
  /** Hold the fill at `progress` with no refill (e.g. while claiming). */
  isHeld?: boolean;
}): { fill: SharedValue<number>; isFilled: boolean; clamped: number } => {
  const reduceMotion = useReducedMotion();
  const clamped = Math.min(1, Math.max(0, progress));
  const fill = useSharedValue(reduceMotion ? clamped : 0);
  const [isFilled, setIsFilled] = useState(reduceMotion);

  useEffect(() => {
    if (reduceMotion) {
      fill.value = clamped;
      setIsFilled(true);
      return;
    }
    if (isHeld) {
      fill.value = clamped;
      setIsFilled(true);
      return;
    }
    setIsFilled(false);
    if (isRefillPending) {
      fill.value = 0;
      return;
    }
    fill.value = withTiming(
      clamped,
      {
        duration: CASHBACK_FILL_DURATION_MS,
        easing: Easing.out(Easing.cubic),
      },
      (finished) => {
        if (finished) {
          runOnJS(setIsFilled)(true);
        }
      },
    );
  }, [clamped, fill, isHeld, isRefillPending, reduceMotion, refillKey]);

  return { fill, isFilled, clamped };
};

const getLifetimeLabel = (amount: string) =>
  strings('card.card_home.cashback_panel.lifetime', { amount });

// The pill shows the amount, so the sublabel never repeats it.
export const getCashbackSublabel = ({
  status,
  progress,
  incrementLabel,
  lifetimeEarnedLabel,
}: CashbackPanelProps): string => {
  switch (status) {
    case 'claimable':
      // Destination is only shown in the confirm dialog, never in the panel.
      return strings('card.card_home.cashback_panel.ready');
    case 'claiming':
      return strings('card.card_home.cashback_panel.claiming');
    case 'setupMoneyAccount':
      return strings('card.card_home.cashback_panel.setup_money_account');
    case 'setupFunding':
      return strings('card.card_home.cashback_panel.setup_funding');
    case 'autoPayout':
      return strings('card.card_home.cashback_panel.auto_payout', {
        target: incrementLabel,
      });
    case 'unavailable':
      return strings('card.card_home.cashback_panel.unavailable');
    case 'accruing':
    default:
      return progress > 0
        ? strings('card.card_home.cashback_panel.getting_there', {
            target: incrementLabel,
          })
        : lifetimeEarnedLabel
          ? getLifetimeLabel(lifetimeEarnedLabel)
          : strings('card.card_home.cashback_panel.zero');
  }
};

/** "1% cashback" when the rate is known, otherwise "Cashback". */
export const getCashbackTitle = (percentageLabel?: string): string =>
  percentageLabel
    ? strings('card.card_home.cashback_panel.title_rate', {
        percentage: percentageLabel,
      })
    : strings('card.card_home.cashback_panel.title');

/** Hold time for each line of the empty-state crossfade. */
export const CASHBACK_CROSSFADE_HOLD_MS = 5000;
/** Fade out / fade in time for the empty-state crossfade. */
export const CASHBACK_CROSSFADE_FADE_MS = 400;

/**
 * Empty state for a returning user: alternates the lifetime total with the
 * spend prompt, fading between them. Reduce Motion keeps the lifetime line.
 */
const CrossfadeSublabel = ({ lines }: { lines: [string, string] }) => {
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (reduceMotion) {
      setIndex(0);
      opacity.value = 1;
      return undefined;
    }
    const timers: ReturnType<typeof setTimeout>[] = [];
    const cycle = () => {
      timers.push(
        setTimeout(() => {
          opacity.value = withTiming(0, {
            duration: CASHBACK_CROSSFADE_FADE_MS,
          });
          timers.push(
            setTimeout(() => {
              setIndex((current) => (current + 1) % 2);
              opacity.value = withTiming(1, {
                duration: CASHBACK_CROSSFADE_FADE_MS,
              });
              cycle();
            }, CASHBACK_CROSSFADE_FADE_MS),
          );
        }, CASHBACK_CROSSFADE_HOLD_MS),
      );
    };
    cycle();
    return () => timers.forEach(clearTimeout);
  }, [opacity, reduceMotion]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View style={style}>
      <Text
        variant={TextVariant.BodySm}
        color={TextColor.TextAlternative}
        accessibilityLabel={lines.join('. ')}
        testID={CashbackPanelSelectors.SUBLABEL}
      >
        {lines[index]}
      </Text>
    </Animated.View>
  );
};

// Clips the claim pill's shimmer to ButtonBase's rounded-full.
// Softer than ShimmerOverlay's default (0.25) peak: the pill is small and
// green, so the default read as too intense (design call, 26 Nov 2026).
const PILL_SHIMMER_COLORS = [
  'rgba(255,255,255,0)',
  'rgba(255,255,255,0.08)',
  'rgba(255,255,255,0)',
] as const;

const PILL_RADIUS = 999;

const ProgressBar = ({
  progress,
  isComplete,
  onFilledChange,
  isPulsing = false,
  refillKey,
  isRefillPending,
  accessibilityLabel,
}: {
  progress: number;
  isComplete: boolean;
  /** Spoken name, e.g. "Cashback progress, $2.30 of $5". */
  accessibilityLabel: string;
  /** Soft opacity pulse on a held, full bar while a claim is in flight. */
  isPulsing?: boolean;
  /** Reports when the fill has reached its value (the pill shimmers after). */
  onFilledChange?: (isFilled: boolean) => void;
  refillKey?: number;
  isRefillPending?: boolean;
}) => {
  const tw = useTailwind();
  const {
    fill: width,
    isFilled,
    clamped,
  } = useCashbackFill({
    progress,
    refillKey,
    isRefillPending,
    isHeld: isPulsing,
  });
  useEffect(() => {
    onFilledChange?.(isFilled);
  }, [isFilled, onFilledChange]);

  const reduceMotion = useReducedMotion();
  const pulse = useSharedValue(1);
  useEffect(() => {
    if (!isPulsing || reduceMotion) {
      pulse.value = withTiming(1, { duration: 150 });
      return;
    }
    pulse.value = withRepeat(
      withSequence(
        withTiming(0.45, {
          duration: CASHBACK_PULSE_HALF_MS,
          easing: Easing.inOut(Easing.quad),
        }),
        withTiming(1, {
          duration: CASHBACK_PULSE_HALF_MS,
          easing: Easing.inOut(Easing.quad),
        }),
      ),
      -1,
    );
  }, [isPulsing, pulse, reduceMotion]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${width.value * 100}%`,
    opacity: pulse.value,
  }));

  const fill = (
    <Animated.View
      style={[
        tw.style(
          'h-2 rounded-full',
          isComplete ? 'bg-success-default' : 'bg-primary-default',
        ),
        fillStyle,
      ]}
      testID={CashbackPanelSelectors.PROGRESS_FILL}
    />
  );

  // No MMDS progress bar yet (design system gap), so this is a Box track
  // with an animated fill on semantic tokens.
  return (
    <Box
      twClassName="mt-4 h-2 w-full rounded-full bg-border-muted overflow-hidden"
      testID={CashbackPanelSelectors.PROGRESS}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
    >
      {fill}
    </Box>
  );
};

/** Claim / set up / amount pill. */
export const CashbackPill = ({
  isShimmering = false,
  ...props
}: CashbackPanelProps & {
  /** Sweep over the claim pill while a payout is ready to claim. */
  isShimmering?: boolean;
}) => {
  const { status, availableLabel, claimableLabel, onClaim, onSetup } = props;

  if (status === 'claimable' || status === 'claiming') {
    const isClaiming = status === 'claiming';
    const claimButton = (
      <ButtonSemantic
        severity={ButtonSemanticSeverity.Success}
        size={ButtonSize.Sm}
        twClassName="rounded-full"
        onPress={onClaim}
        isLoading={isClaiming}
        isDisabled={isClaiming}
        accessibilityLabel={strings(
          'card.card_home.cashback_panel.claim_a11y',
          {
            amount: claimableLabel,
          },
        )}
        testID={CashbackPanelSelectors.PILL}
      >
        {claimableLabel}
      </ButtonSemantic>
    );
    return isShimmering && !isClaiming ? (
      <Box testID={CashbackPanelSelectors.PILL_SHIMMER}>
        <ShimmerOverlay
          borderRadius={PILL_RADIUS}
          colors={PILL_SHIMMER_COLORS}
          sweepDurationMs={2000}
          pauseDurationMs={2500}
        >
          {claimButton}
        </ShimmerOverlay>
      </Box>
    ) : (
      claimButton
    );
  }

  if (status === 'setupMoneyAccount' || status === 'setupFunding') {
    return (
      <Button
        variant={ButtonVariant.Secondary}
        size={ButtonSize.Sm}
        twClassName="rounded-full"
        onPress={onSetup}
        testID={CashbackPanelSelectors.PILL}
      >
        {strings('card.card_home.cashback_panel.set_up')}
      </Button>
    );
  }

  return (
    <Button
      variant={ButtonVariant.Secondary}
      size={ButtonSize.Sm}
      twClassName="rounded-full"
      isDisabled
      onPress={() => undefined}
      testID={CashbackPanelSelectors.PILL}
    >
      {availableLabel}
    </Button>
  );
};

/**
 * Card home cashback panel: accrued mUSD back, progress towards the next
 * payout increment and a one-tap claim pill.
 */
const CashbackPanel = (props: CashbackPanelProps) => {
  const { status, progress, refillKey, isRefillPending } = props;

  const isLoading = status === 'loading';
  const isComplete = status === 'claimable' || status === 'claiming';
  // Nothing accrued and nothing to claim, but cashback earned before.
  const isReturningEmpty =
    status === 'accruing' && progress <= 0 && !!props.lifetimeEarnedLabel;
  // The claim pill shimmers once the bar has filled, unless Reduce Motion is on.
  const reduceMotion = useReducedMotion();
  const [isBarFilled, setIsBarFilled] = useState(false);
  const isPillShimmering =
    status === 'claimable' && isBarFilled && !reduceMotion;

  return (
    <Box
      twClassName="mx-4 rounded-xl bg-background-muted p-4"
      testID={CashbackPanelSelectors.CONTAINER}
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        gap={3}
      >
        <AvatarToken
          name={MUSD_TOKEN.symbol}
          src={MUSD_TOKEN.imageSource as { uri?: string } | number}
          size={AvatarTokenSize.Md}
          testID={CashbackPanelSelectors.ICON}
        />
        <Box twClassName="flex-1">
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            numberOfLines={1}
            testID={CashbackPanelSelectors.TITLE}
          >
            {getCashbackTitle(props.percentageLabel)}
          </Text>
          {isLoading ? (
            <Skeleton
              twClassName="h-4 w-32 rounded-md mt-1"
              testID={CashbackPanelSelectors.SKELETON}
            />
          ) : isReturningEmpty ? (
            <CrossfadeSublabel
              lines={[
                getLifetimeLabel(props.lifetimeEarnedLabel as string),
                strings('card.card_home.cashback_panel.zero'),
              ]}
            />
          ) : (
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
              testID={CashbackPanelSelectors.SUBLABEL}
            >
              {getCashbackSublabel(props)}
            </Text>
          )}
        </Box>
        {isLoading ? (
          <Skeleton twClassName="h-8 w-20 rounded-full" />
        ) : (
          // MMDS buttons default to self-start, which would pin the pill to the
          // top of this row; the wrapper is centred by the row instead.
          <Box>
            <CashbackPill {...props} isShimmering={isPillShimmering} />
          </Box>
        )}
      </Box>
      {!isLoading && status !== 'unavailable' ? (
        <ProgressBar
          progress={progress}
          isComplete={isComplete}
          onFilledChange={setIsBarFilled}
          isPulsing={status === 'claiming'}
          accessibilityLabel={strings(
            'card.card_home.cashback_panel.progress_a11y',
            {
              amount: isComplete ? props.incrementLabel : props.remainderLabel,
              target: props.incrementLabel,
            },
          )}
          refillKey={refillKey}
          isRefillPending={isRefillPending}
        />
      ) : null}
    </Box>
  );
};

export default CashbackPanel;
