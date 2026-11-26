import React, { useEffect } from 'react';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
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
}

const getSublabel = ({
  status,
  remainderLabel,
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
      return strings('card.card_home.cashback_panel.progress', {
        amount: remainderLabel,
        target: incrementLabel,
      });
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
}: {
  progress: number;
  isComplete: boolean;
  /** Subtle sweep over the full bar while a payout is ready to claim. */
  isShimmering: boolean;
}) => {
  const tw = useTailwind();
  const reduceMotion = useReducedMotion();
  const clamped = Math.min(1, Math.max(0, progress));
  const width = useSharedValue(clamped);

  useEffect(() => {
    width.value = reduceMotion
      ? clamped
      : withTiming(clamped, { duration: 450 });
  }, [clamped, reduceMotion, width]);

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
      {isShimmering ? (
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

const Pill = (props: CashbackPanelProps) => {
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
  const { status, progress } = props;

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
              {getSublabel(props)}
            </Text>
          )}
        </Box>
        {isLoading ? (
          <Skeleton twClassName="h-8 w-20 rounded-full" />
        ) : (
          <Pill {...props} />
        )}
      </Box>
      {!isLoading && status !== 'unavailable' ? (
        <ProgressBar
          progress={progress}
          isComplete={isComplete}
          isShimmering={status === 'claimable'}
        />
      ) : null}
    </Box>
  );
};

export default CashbackPanel;
