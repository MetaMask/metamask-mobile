import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Button,
  ButtonSize,
  ButtonVariant,
  Icon,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
  FontWeight,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import {
  formatSignedUsd,
  formatUsd,
  KOL_EARNINGS_FIXTURE,
} from './rewardsUiFixtures';
import { KOL_DASHBOARD_SELECTORS } from './KolDashboard.testIds';
import ClaimMoneyFallOverlay from './ClaimMoneyFallOverlay';

const HISTORY_ICON: Record<
  (typeof KOL_EARNINGS_FIXTURE.history)[number]['kind'],
  IconName
> = {
  referrals: IconName.UserCircleAdd,
  commission: IconName.SwapVertical,
  rebate: IconName.TrendDown,
};

interface EarningsTabProps {
  onClaimableChange?: (hasClaimable: boolean) => void;
}

const EarningsTab: React.FC<EarningsTabProps> = ({ onClaimableChange }) => {
  const [available, setAvailable] = useState(
    KOL_EARNINGS_FIXTURE.availableToClaim,
  );
  const [isFalling, setIsFalling] = useState(false);
  const animationFrameRef = useRef<number | undefined>(undefined);

  useEffect(
    () => () => {
      if (animationFrameRef.current !== undefined) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    },
    [],
  );

  const animateAmountToZero = useCallback((startAmount: number) => {
    const startedAt = Date.now();
    const durationMs = 900;
    const tick = () => {
      const progress = Math.min((Date.now() - startedAt) / durationMs, 1);
      setAvailable(startAmount * (1 - progress));
      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(tick);
      } else {
        setAvailable(0);
        setIsFalling(false);
      }
    };
    animationFrameRef.current = requestAnimationFrame(tick);
  }, []);

  const handleClaim = useCallback(() => {
    if (available <= 0) {
      return;
    }
    onClaimableChange?.(false);
    AccessibilityInfo.isReduceMotionEnabled()
      .then((reduceMotion) => {
        if (reduceMotion) {
          setAvailable(0);
          setIsFalling(false);
          return;
        }
        setIsFalling(true);
        animateAmountToZero(available);
      })
      .catch(() => {
        setIsFalling(true);
        animateAmountToZero(available);
      });
  }, [animateAmountToZero, available, onClaimableChange]);

  return (
    <Box
      twClassName="px-4 pt-4 pb-6"
      testID={KOL_DASHBOARD_SELECTORS.EARNINGS_TAB}
    >
      <ClaimMoneyFallOverlay visible={isFalling} />
      <Box twClassName="overflow-hidden rounded-2xl bg-muted">
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Between}
          twClassName="p-4"
        >
          <Box>
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
            >
              {strings('rewards.kol.available_to_claim')}
            </Text>
            <Text
              variant={TextVariant.HeadingLg}
              testID={KOL_DASHBOARD_SELECTORS.AVAILABLE_TO_CLAIM}
            >
              {formatUsd(available)}
            </Text>
          </Box>
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Md}
            onPress={handleClaim}
            isDisabled={available <= 0}
            testID={KOL_DASHBOARD_SELECTORS.CLAIM_BUTTON}
          >
            {strings('rewards.kol.claim')}
          </Button>
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
          <Box twClassName="w-px bg-muted" />
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

      <Text variant={TextVariant.HeadingMd} twClassName="mt-6 mb-3">
        {strings('rewards.kol.breakdown')}
      </Text>
      <Box twClassName="gap-3">
        <Box
          flexDirection={BoxFlexDirection.Row}
          justifyContent={BoxJustifyContent.Between}
        >
          <Text variant={TextVariant.BodyMd}>
            {strings('rewards.kol.referrals')}
          </Text>
          <Text variant={TextVariant.BodyMd}>
            {formatUsd(KOL_EARNINGS_FIXTURE.referralsRecorded)}
          </Text>
        </Box>
        <Box
          flexDirection={BoxFlexDirection.Row}
          justifyContent={BoxJustifyContent.Between}
        >
          <Text variant={TextVariant.BodyMd}>
            {strings('rewards.kol.trade_commissions')}
          </Text>
          <Text variant={TextVariant.BodyMd}>
            {formatUsd(KOL_EARNINGS_FIXTURE.tradeCommissionsRecorded)}
          </Text>
        </Box>
        <Box
          flexDirection={BoxFlexDirection.Row}
          justifyContent={BoxJustifyContent.Between}
        >
          <Text variant={TextVariant.BodyMd}>
            {strings('rewards.kol.trading_rebates')}
          </Text>
          <Text variant={TextVariant.BodyMd}>
            {formatUsd(KOL_EARNINGS_FIXTURE.tradingRebates)}
          </Text>
        </Box>
      </Box>

      <Text variant={TextVariant.HeadingMd} twClassName="mt-6 mb-3">
        {strings('rewards.kol.history')}
      </Text>
      <Box twClassName="gap-4">
        {KOL_EARNINGS_FIXTURE.history.map((item) => (
          <Box
            key={item.id}
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            twClassName="gap-3"
          >
            <Box
              alignItems={BoxAlignItems.Center}
              justifyContent={BoxJustifyContent.Center}
              twClassName="h-10 w-10 rounded-full bg-muted"
            >
              <Icon name={HISTORY_ICON[item.kind]} size={IconSize.Md} />
            </Box>
            <Box twClassName="flex-1">
              <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
                {strings(`rewards.kol.history_${item.kind}`)}
              </Text>
              <Text
                variant={TextVariant.BodyXs}
                color={TextColor.TextAlternative}
              >
                {item.relativeTime}
              </Text>
            </Box>
            <Text variant={TextVariant.BodyMd} color={TextColor.SuccessDefault}>
              {formatSignedUsd(item.amount)}
            </Text>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default EarningsTab;
