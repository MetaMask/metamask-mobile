import React, { useEffect, useState } from 'react';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
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

/**
 * Animates a 0..1 fill value: empty while a refill is pending, then eases out
 * to `progress`. Reduce Motion jumps straight to the value. Returns whether
 * the fill has reached its value (the claimable shimmer waits for this).
 */
export const useCashbackFill = ({
  progress,
  refillKey = 0,
  isRefillPending = false,
}: {
  progress: number;
  refillKey?: number;
  isRefillPending?: boolean;
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
  }, [clamped, fill, isRefillPending, reduceMotion, refillKey]);

  return { fill, isFilled, clamped };
};

// The pill shows the amount, so the sublabel never repeats it.
export const getCashbackSublabel = ({
  status,
  progress,
  incrementLabel,
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
        : strings('card.card_home.cashback_panel.zero');
  }
};

// Fully rounded ends to match the track's rounded-full.
const PROGRESS_BAR_RADIUS = 999;
// Soft white sweep over the green fill (same shape as ShimmerOverlay's default,
// a little brighter so it reads on the thin bar).
const PROGRESS_SHIMMER_COLORS = [
  'rgba(255,255,255,0)',
  'rgba(255,255,255,0.45)',
  'rgba(255,255,255,0)',
] as const;

const ProgressBar = ({
  progress,
  isComplete,
  isShimmering,
  refillKey,
  isRefillPending,
}: {
  progress: number;
  isComplete: boolean;
  /** Subtle sweep over the full bar while a payout is ready to claim. */
  isShimmering: boolean;
  refillKey?: number;
  isRefillPending?: boolean;
}) => {
  const tw = useTailwind();
  const {
    fill: width,
    isFilled,
    clamped,
  } = useCashbackFill({ progress, refillKey, isRefillPending });

  const fillStyle = useAnimatedStyle(() => ({
    width: `${width.value * 100}%`,
  }));

  const fill = (
    <Animated.View
      style={[
        tw.style(
          'h-1.5 rounded-full',
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
      twClassName="mt-3 h-1.5 w-full rounded-full bg-border-muted overflow-hidden"
      testID={CashbackPanelSelectors.PROGRESS}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
    >
      {/* The shimmer starts once the fill has reached its value. */}
      {isShimmering && isFilled ? (
        <Box testID={CashbackPanelSelectors.PROGRESS_SHIMMER}>
          <ShimmerOverlay
            borderRadius={PROGRESS_BAR_RADIUS}
            colors={PROGRESS_SHIMMER_COLORS}
          >
            {fill}
          </ShimmerOverlay>
        </Box>
      ) : (
        fill
      )}
    </Box>
  );
};

/** Claim / set up / amount pill, shared by the panel and the ring layout. */
export const CashbackPill = (props: CashbackPanelProps) => {
  const { status, availableLabel, claimableLabel, onClaim, onSetup } = props;

  if (status === 'claimable' || status === 'claiming') {
    const isClaiming = status === 'claiming';
    return (
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

  return (
    <Box
      twClassName="mx-4 mt-4 rounded-xl bg-background-muted p-4"
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
            testID={CashbackPanelSelectors.TITLE}
          >
            {strings('card.card_home.cashback_panel.title')}
          </Text>
          {isLoading ? (
            <Skeleton
              twClassName="h-4 w-32 rounded-md mt-1"
              testID={CashbackPanelSelectors.SKELETON}
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
          <CashbackPill {...props} />
        )}
      </Box>
      {!isLoading && status !== 'unavailable' ? (
        <ProgressBar
          progress={progress}
          isComplete={isComplete}
          isShimmering={status === 'claimable'}
          refillKey={refillKey}
          isRefillPending={isRefillPending}
        />
      ) : null}
    </Box>
  );
};

export default CashbackPanel;
