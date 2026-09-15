import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AccessibilityInfo, Animated } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Button,
  ButtonSize,
  ButtonVariant,
  SectionDivider,
  SectionHeader,
  Text,
  TextColor,
  TextVariant,
  FontWeight,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import { navigateToRewardsRoute } from '../../utils';
import useRewardsToast from '../../hooks/useRewardsToast';
import {
  formatUsd,
  getEarningsHistory,
  KOL_EARNINGS_FIXTURE,
  KOL_EARNINGS_HISTORY_PREVIEW_COUNT,
  type KolEarningsHistoryKind,
} from './rewardsUiFixtures';
import { KOL_DASHBOARD_SELECTORS } from './KolDashboard.testIds';
import ClaimMoneyFallOverlay from './ClaimMoneyFallOverlay';
import { EarningsHistoryRow, HistoryKindAvatar } from './EarningsHistoryRows';

const BREAKDOWN_ROWS: {
  kind: Extract<KolEarningsHistoryKind, 'referrals' | 'commission' | 'rebate'>;
  labelKey: 'referrals' | 'trade_commissions' | 'trading_rebates';
  amount: number;
}[] = [
  {
    kind: 'referrals',
    labelKey: 'referrals',
    amount: KOL_EARNINGS_FIXTURE.referralsRecorded,
  },
  {
    kind: 'commission',
    labelKey: 'trade_commissions',
    amount: KOL_EARNINGS_FIXTURE.tradeCommissionsRecorded,
  },
  {
    kind: 'rebate',
    labelKey: 'trading_rebates',
    amount: KOL_EARNINGS_FIXTURE.tradingRebates,
  },
];

interface EarningsTabProps {
  onClaimableChange?: (hasClaimable: boolean) => void;
  /** Invited users don't earn from referrals they send. */
  hideReferrals?: boolean;
}

const COUNTDOWN_DURATION_MS = 700;
const OPACITY_DURATION_MS = 350;
// The bills keep falling after the amount settles: the last one starts at
// BILL_COUNT * stagger and takes its own fall duration to clear the screen.
const MONEY_FALL_DURATION_MS = 1540;

const EarningsTab: React.FC<EarningsTabProps> = ({
  onClaimableChange,
  hideReferrals = false,
}) => {
  const navigation = useNavigation<AppNavigationProp>();
  const { showToast, RewardsToastOptions } = useRewardsToast();
  const [available, setAvailable] = useState(
    KOL_EARNINGS_FIXTURE.availableToClaim,
  );
  const [isFalling, setIsFalling] = useState(false);
  const [isClaimed, setIsClaimed] = useState(false);
  const amountOpacity = useRef(new Animated.Value(1)).current;
  const animationFrameRef = useRef<number | undefined>(undefined);
  const moneyFallTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  useEffect(
    () => () => {
      if (animationFrameRef.current !== undefined) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (moneyFallTimeoutRef.current !== undefined) {
        clearTimeout(moneyFallTimeoutRef.current);
      }
    },
    [],
  );

  const amountAnimatedStyle = useMemo(
    () => ({ opacity: amountOpacity }),
    [amountOpacity],
  );

  const breakdownRows = useMemo(
    () =>
      hideReferrals
        ? BREAKDOWN_ROWS.filter((row) => row.kind !== 'referrals')
        : BREAKDOWN_ROWS,
    [hideReferrals],
  );

  const historyPreview = useMemo(
    () =>
      getEarningsHistory(hideReferrals).slice(
        0,
        KOL_EARNINGS_HISTORY_PREVIEW_COUNT,
      ),
    [hideReferrals],
  );

  const animateAmountToZero = useCallback((startAmount: number) => {
    let startedAt: number | undefined;
    const tick = (timestamp: number) => {
      startedAt ??= timestamp;
      const progress = Math.min(
        (timestamp - startedAt) / COUNTDOWN_DURATION_MS,
        1,
      );
      if (progress >= 1) {
        setAvailable(0);
        return;
      }
      // Ease-out, so the digits roll fast up front and settle softly.
      setAvailable(startAmount * (1 - (1 - (1 - progress) ** 3)));
      animationFrameRef.current = requestAnimationFrame(tick);
    };
    animationFrameRef.current = requestAnimationFrame(tick);
  }, []);

  const runClaimAnimation = useCallback(
    (startAmount: number) => {
      setIsFalling(true);
      moneyFallTimeoutRef.current = setTimeout(
        () => setIsFalling(false),
        MONEY_FALL_DURATION_MS,
      );
      // Dips and recovers alongside the rolling digits.
      Animated.sequence([
        Animated.timing(amountOpacity, {
          toValue: 0.4,
          duration: OPACITY_DURATION_MS / 2,
          useNativeDriver: true,
        }),
        Animated.timing(amountOpacity, {
          toValue: 1,
          duration: OPACITY_DURATION_MS / 2,
          useNativeDriver: true,
        }),
      ]).start();
      animateAmountToZero(startAmount);
    },
    [amountOpacity, animateAmountToZero],
  );

  const handleClaim = useCallback(() => {
    if (available <= 0 || isClaimed) {
      return;
    }
    // The button settles into its claimed state right away rather than waiting
    // for the count-down to finish.
    setIsClaimed(true);
    onClaimableChange?.(false);
    showToast(
      RewardsToastOptions.success(strings('rewards.kol.claim_success_toast')),
    );
    AccessibilityInfo.isReduceMotionEnabled()
      .then((reduceMotion) => {
        if (reduceMotion) {
          setAvailable(0);
          setIsFalling(false);
          return;
        }
        runClaimAnimation(available);
      })
      .catch(() => {
        runClaimAnimation(available);
      });
  }, [
    available,
    isClaimed,
    onClaimableChange,
    runClaimAnimation,
    showToast,
    RewardsToastOptions,
  ]);

  return (
    <Box
      twClassName="mt-3 pt-4 pb-6"
      testID={KOL_DASHBOARD_SELECTORS.EARNINGS_TAB}
    >
      <ClaimMoneyFallOverlay visible={isFalling} />
      <Box twClassName="px-4">
        <Box twClassName="overflow-hidden rounded-2xl bg-muted">
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            justifyContent={BoxJustifyContent.Between}
            twClassName="p-4"
          >
            <Box twClassName="flex-1">
              <Text
                variant={TextVariant.BodySm}
                color={TextColor.TextAlternative}
              >
                {strings('rewards.kol.available_to_claim')}
              </Text>
              <Animated.View style={amountAnimatedStyle}>
                <Text
                  variant={TextVariant.HeadingLg}
                  testID={KOL_DASHBOARD_SELECTORS.AVAILABLE_TO_CLAIM}
                >
                  {formatUsd(available)}
                </Text>
              </Animated.View>
            </Box>
            {/* Button applies `self-start` unless it is full width, which would
                override the row's centering, so it is wrapped to stay centered. */}
            <Box>
              <Button
                variant={ButtonVariant.Primary}
                size={ButtonSize.Md}
                onPress={handleClaim}
                isDisabled={isClaimed || available <= 0}
                testID={KOL_DASHBOARD_SELECTORS.CLAIM_BUTTON}
              >
                {strings(
                  isClaimed ? 'rewards.kol.claimed' : 'rewards.kol.claim',
                )}
              </Button>
            </Box>
          </Box>
          <Box
            flexDirection={BoxFlexDirection.Row}
            twClassName="border-t border-muted"
          >
            <Box twClassName="flex-1 p-4">
              <Text
                variant={TextVariant.BodySm}
                color={TextColor.TextAlternative}
              >
                {strings('rewards.kol.last_7_days')}
              </Text>
              <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
                {formatUsd(KOL_EARNINGS_FIXTURE.last7Days)}
              </Text>
            </Box>
            {/* Stops roughly midway between the card's top border and the
                label's cap height, which sits ~6px inside the 16px padding. */}
            <Box twClassName="w-px my-3 bg-border-muted" />
            <Box twClassName="flex-1 p-4">
              <Text
                variant={TextVariant.BodySm}
                color={TextColor.TextAlternative}
              >
                {strings('rewards.kol.recorded_earnings_label')}
              </Text>
              <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
                {formatUsd(KOL_EARNINGS_FIXTURE.recordedEarnings)}
              </Text>
            </Box>
          </Box>
        </Box>
      </Box>

      <SectionDivider marginVertical={8} />

      <SectionHeader
        title={strings('rewards.kol.breakdown')}
        isInteractive
        onPress={() =>
          navigateToRewardsRoute(
            navigation,
            Routes.REWARDS_PERFORMANCE_VIEW,
            hideReferrals ? { hideReferrals: true } : undefined,
          )
        }
        twClassName="pt-0 pb-4"
        testID={KOL_DASHBOARD_SELECTORS.BREAKDOWN_HEADER}
      />
      <Box twClassName="px-4">
        <Box twClassName="gap-4">
          {breakdownRows.map((row) => (
            <Box
              key={row.kind}
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              twClassName="gap-3"
            >
              <HistoryKindAvatar kind={row.kind} />
              <Text variant={TextVariant.BodyMd} twClassName="flex-1">
                {strings(`rewards.kol.${row.labelKey}`)}
              </Text>
              <Text variant={TextVariant.BodyMd}>{formatUsd(row.amount)}</Text>
            </Box>
          ))}
        </Box>
      </Box>

      <SectionDivider marginVertical={8} />

      <SectionHeader
        title={strings('rewards.kol.history')}
        isInteractive
        onPress={() =>
          navigateToRewardsRoute(
            navigation,
            Routes.REWARDS_EARNINGS_HISTORY_VIEW,
            hideReferrals ? { hideReferrals: true } : undefined,
          )
        }
        twClassName="pt-0 pb-4"
        testID={KOL_DASHBOARD_SELECTORS.HISTORY_HEADER}
      />
      <Box twClassName="px-4">
        <Box twClassName="gap-4" testID={KOL_DASHBOARD_SELECTORS.HISTORY_LIST}>
          {historyPreview.map((item) => (
            <EarningsHistoryRow key={item.id} item={item} />
          ))}
        </Box>
      </Box>
    </Box>
  );
};

export default EarningsTab;
