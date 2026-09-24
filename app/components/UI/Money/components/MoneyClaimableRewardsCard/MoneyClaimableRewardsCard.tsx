import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AccessibilityInfo, Animated } from 'react-native';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Button,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  SectionDivider,
  SensitiveText,
  SensitiveTextLength,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { formatUsd } from '../../../Rewards/components/KolDashboard/rewardsUiFixtures';
import {
  claimAllRewards,
  useClaimableRewards,
} from '../../../Rewards/components/KolDashboard/rewardsClaimStore';
import { useClaimEligibilityFlow } from '../../../Rewards/components/KolDashboard/ClaimEligibilityFlow';
import useMoneyToasts from '../../hooks/useMoneyToasts';
import { MoneyClaimableRewardsCardTestIds } from './MoneyClaimableRewardsCard.testIds';

const COUNTDOWN_DURATION_MS = 700;
const OPACITY_DURATION_MS = 350;
const HIDE_AFTER_ZERO_MS = 200;

interface MoneyClaimableRewardsCardProps {
  /**
   * Whether the claimable amount should be masked.
   */
  privacyMode?: boolean;
}

const MoneyClaimableRewardsCard = ({
  privacyMode = false,
}: MoneyClaimableRewardsCardProps) => {
  const { showToast, MoneyToastOptions } = useMoneyToasts();
  const claimableRewards = useClaimableRewards();
  // The store drops to zero the moment a claim starts, so the rolling digits
  // read from local state until they land on the same value.
  const [countdownAmount, setCountdownAmount] = useState(claimableRewards);
  const [isCountingDown, setIsCountingDown] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const available = isCountingDown ? countdownAmount : claimableRewards;
  const amountOpacity = useRef(new Animated.Value(1)).current;
  const animationFrameRef = useRef<number | undefined>(undefined);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  useEffect(
    () => () => {
      if (animationFrameRef.current !== undefined) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (hideTimeoutRef.current !== undefined) {
        clearTimeout(hideTimeoutRef.current);
      }
    },
    [],
  );

  const amountAnimatedStyle = useMemo(
    () => ({ opacity: amountOpacity }),
    [amountOpacity],
  );

  const hideCard = useCallback(() => {
    if (hideTimeoutRef.current !== undefined) {
      clearTimeout(hideTimeoutRef.current);
    }
    hideTimeoutRef.current = setTimeout(() => {
      setIsDismissed(true);
    }, HIDE_AFTER_ZERO_MS);
  }, []);

  const animateAmountToZero = useCallback(
    (startAmount: number) => {
      let startedAt: number | undefined;
      const tick = (timestamp: number) => {
        startedAt ??= timestamp;
        const progress = Math.min(
          (timestamp - startedAt) / COUNTDOWN_DURATION_MS,
          1,
        );
        if (progress >= 1) {
          setCountdownAmount(0);
          hideCard();
          return;
        }
        // Ease-out, so the digits roll fast up front and settle softly.
        setCountdownAmount(startAmount * (1 - (1 - (1 - progress) ** 3)));
        animationFrameRef.current = requestAnimationFrame(tick);
      };
      animationFrameRef.current = requestAnimationFrame(tick);
    },
    [hideCard],
  );

  const runClaimAnimation = useCallback(
    (startAmount: number) => {
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

  const completeClaim = useCallback(() => {
    if (claimableRewards <= 0) {
      return;
    }
    const startAmount = claimableRewards;
    // Hold the pre-claim amount on screen so the digits roll down from it
    // rather than snapping to the zeroed store value.
    setCountdownAmount(startAmount);
    setIsCountingDown(true);
    claimAllRewards();
    showToast(MoneyToastOptions.claimSuccess());
    AccessibilityInfo.isReduceMotionEnabled()
      .then((reduceMotion) => {
        if (reduceMotion) {
          setCountdownAmount(0);
          hideCard();
          return;
        }
        runClaimAnimation(startAmount);
      })
      .catch(() => {
        runClaimAnimation(startAmount);
      });
  }, [
    claimableRewards,
    hideCard,
    MoneyToastOptions,
    runClaimAnimation,
    showToast,
  ]);

  const { startClaimFlow, claimEligibilitySheets } =
    useClaimEligibilityFlow(completeClaim);

  const handleClaimPress = useCallback(() => {
    if (claimableRewards <= 0) {
      return;
    }
    startClaimFlow();
  }, [claimableRewards, startClaimFlow]);

  // A claim on the Rewards Claims tab zeroes the store, which retires this
  // card too — but only once any count-down running here has finished.
  if (isDismissed || (!isCountingDown && claimableRewards <= 0)) {
    return null;
  }

  return (
    <Box testID={MoneyClaimableRewardsCardTestIds.CONTAINER}>
      {claimEligibilitySheets}
      <Box twClassName="mx-4 mt-2">
        <Box twClassName="rounded-2xl bg-muted px-4 py-4">
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            justifyContent={BoxJustifyContent.Between}
          >
            <Box twClassName="flex-1 pr-4">
              <Text
                variant={TextVariant.BodySm}
                color={TextColor.TextAlternative}
              >
                {strings('money.claimable_rewards.title')}
              </Text>
              <Animated.View style={amountAnimatedStyle}>
                <SensitiveText
                  variant={TextVariant.HeadingSm}
                  fontWeight={FontWeight.Medium}
                  color={TextColor.SuccessDefault}
                  isHidden={privacyMode}
                  length={SensitiveTextLength.Short}
                  testID={MoneyClaimableRewardsCardTestIds.AMOUNT}
                >
                  {formatUsd(available)}
                </SensitiveText>
              </Animated.View>
            </Box>
            {/* Button applies `self-start` unless it is full width, which would
                override the row's centering, so it is wrapped to stay centered. */}
            <Box>
              <Button
                variant={ButtonVariant.Secondary}
                size={ButtonSize.Lg}
                onPress={handleClaimPress}
                isDisabled={isCountingDown || claimableRewards <= 0}
                testID={MoneyClaimableRewardsCardTestIds.CLAIM_BUTTON}
              >
                {strings('rewards.kol.claim')}
              </Button>
            </Box>
          </Box>
        </Box>
      </Box>
      <SectionDivider
        marginVertical={8}
        testID={MoneyClaimableRewardsCardTestIds.DIVIDER}
      />
    </Box>
  );
};

export default MoneyClaimableRewardsCard;
