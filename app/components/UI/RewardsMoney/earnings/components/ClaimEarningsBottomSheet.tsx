import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Button,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  HeaderStandard,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import BottomSheet, {
  type BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import { strings } from '../../../../../../locales/i18n';
import useRewardsToast from '../../../Rewards/hooks/useRewardsToast';
import type { EarningOriginType } from '../../../../../core/Engine/controllers/rewards-money-controller/types';
import { CLAIM_WATCHDOG_MS, REWARDS_MONEY_TEST_IDS } from '../../constants';
import { formatMusd } from '../../utils/format';
import { deriveClaimability } from '../utils/deriveClaimability';
import useClaimEarnings, {
  type ClaimFailureReason,
} from '../hooks/useClaimEarnings';
import useEarningsSummary from '../hooks/useEarningsSummary';

/**
 * Only the scope crosses the navigation boundary. The summary is re-read from
 * the controller: a payload frozen into a route param outlives the 60s TTL and
 * would show an amount that no longer matches what a claim pays.
 */
export interface ClaimEarningsBottomSheetParams {
  originTypes: EarningOriginType[];
}

interface ClaimEarningsBottomSheetProps {
  route: { params: ClaimEarningsBottomSheetParams };
}

const FAILURE_MESSAGE_KEY: Record<ClaimFailureReason, string> = {
  NOT_SUBMITTABLE: 'rewards_money.claim.error_not_submittable',
  CONFIRMATION_FAILED: 'rewards_money.claim.error_confirmation_failed',
  CONFIRMATION_TIMEOUT: 'rewards_money.claim.error_confirmation_timeout',
  CLAIM_ALREADY_OPEN: 'rewards_money.claim.error_already_open',
  VOUCHER_EXPIRED: 'rewards_money.claim.error_voucher_expired',
  NO_VOUCHER: 'rewards_money.claim.error_awaiting_release',
  SUBMIT_FAILED: 'rewards_money.claim.error_submit_failed',
  UNKNOWN: 'rewards_money.claim.error_submit_failed',
};

const BLOCKING_REASON_KEY: Record<string, string> = {
  SUSPENDED: 'rewards_money.claim.blocked_suspended',
  ADDRESS_BLOCKED: 'rewards_money.claim.blocked_address',
  NO_ELIGIBLE_BALANCE: 'rewards_money.claim.blocked_no_balance',
  BELOW_MINIMUM: 'rewards_money.claim.blocked_below_minimum',
  SIGNER_UNAVAILABLE: 'rewards_money.claim.blocked_signer',
  TAX_DETERMINATION_REQUIRED: 'rewards_money.claim.blocked_tax_determination',
};

/**
 * Confirms and runs a claim.
 *
 * The amount is `claimable` for the screen's scope — the same number the
 * Earnings screen shows, by construction rather than by a second calculation.
 */
const ClaimEarningsBottomSheet: React.FC<ClaimEarningsBottomSheetProps> = ({
  route,
}) => {
  const { originTypes } = route.params;
  const { summary, isLoading: isSummaryLoading } =
    useEarningsSummary(originTypes);
  const sheetRef = useRef<BottomSheetRef>(null);
  const navigation = useNavigation<AppNavigationProp>();
  const { showToast, RewardsToastOptions } = useRewardsToast();
  const {
    claim,
    isClaiming,
    hasSubmitted,
    hasConfirmed,
    error,
    isSubmittable,
    reset,
  } = useClaimEarnings();

  // Locking the sheet is separate from `isClaiming` so the watchdog can release
  // it while the request is still outstanding.
  const [isLocked, setIsLocked] = useState(false);
  const watchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const claimability = useMemo(
    () => deriveClaimability(summary, originTypes),
    [summary, originTypes],
  );

  // On chain but not yet terminal. Shown so the user is not left looking at a
  // bare spinner while the batch settles.
  const isConfirming = hasSubmitted && !hasConfirmed && !error;

  const clearWatchdog = useCallback(() => {
    if (watchdogRef.current) {
      clearTimeout(watchdogRef.current);
      watchdogRef.current = null;
    }
  }, []);

  useEffect(() => clearWatchdog, [clearWatchdog]);

  // Any failure re-enables dismissal immediately rather than waiting out the
  // watchdog — the user is not mid-flight any more.
  useEffect(() => {
    if (error) {
      clearWatchdog();
      setIsLocked(false);
      showToast(
        RewardsToastOptions.error(
          strings('rewards_money.claim.error_title'),
          strings(FAILURE_MESSAGE_KEY[error.reason]),
        ),
      );
      reset();
    }
  }, [error, clearWatchdog, showToast, RewardsToastOptions, reset]);

  // Success is reported on confirmation, never on submission. A submitted
  // batch can still revert — which is what happens against a stub signer — so
  // closing on submission told the user it worked when it had not.
  useEffect(() => {
    if (hasConfirmed) {
      clearWatchdog();
      setIsLocked(false);
      showToast(
        RewardsToastOptions.success(strings('rewards_money.claim.success')),
      );
      navigation.goBack();
    }
  }, [hasConfirmed, clearWatchdog, showToast, RewardsToastOptions, navigation]);

  const handleClose = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleConfirm = useCallback(() => {
    setIsLocked(true);
    // Release the lock if nothing has come back. Without this a wedged request
    // traps the user behind a sheet they cannot dismiss.
    watchdogRef.current = setTimeout(() => {
      setIsLocked(false);
    }, CLAIM_WATCHDOG_MS);

    claim(claimability.claimableTypes);
  }, [claim, claimability.claimableTypes]);

  const canConfirm =
    claimability.canClaim && isSubmittable && !isClaiming && !isSummaryLoading;

  const blockedMessage = (() => {
    if (!isSubmittable) {
      return strings('rewards_money.claim.error_not_submittable');
    }
    if (claimability.canClaim) {
      return null;
    }
    const key = claimability.blockingReason
      ? BLOCKING_REASON_KEY[claimability.blockingReason]
      : undefined;
    return key
      ? strings(key)
      : strings('rewards_money.claim.blocked_no_balance');
  })();

  return (
    <BottomSheet
      ref={sheetRef}
      // This one prop disables backdrop press, the swipe-down gesture and the
      // Android hardware back button together.
      isInteractable={!isLocked}
      testID={REWARDS_MONEY_TEST_IDS.CLAIM_SHEET}
    >
      <HeaderStandard
        title={strings('rewards_money.claim.title')}
        onClose={isLocked ? undefined : handleClose}
        closeButtonProps={{ testID: 'rewards-money-claim-close-button' }}
      />
      <Box
        flexDirection={BoxFlexDirection.Column}
        alignItems={BoxAlignItems.Start}
        justifyContent={BoxJustifyContent.Center}
        twClassName="px-4 pb-4 w-full gap-4"
      >
        <Text
          variant={TextVariant.DisplayMd}
          fontWeight={FontWeight.Bold}
          testID={REWARDS_MONEY_TEST_IDS.CLAIM_SHEET_AMOUNT}
        >
          {formatMusd(summary?.claimable)}
        </Text>

        {isConfirming ? (
          <Text
            variant={TextVariant.BodySm}
            color={TextColor.TextAlternative}
            testID={REWARDS_MONEY_TEST_IDS.CLAIM_SHEET_CONFIRMING}
          >
            {strings('rewards_money.claim.confirming')}
          </Text>
        ) : null}

        <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
          {strings('rewards_money.claim.description')}
        </Text>

        {claimability.coverage === 'partial' ? (
          <Text
            variant={TextVariant.BodySm}
            color={TextColor.TextAlternative}
            testID={REWARDS_MONEY_TEST_IDS.CLAIM_SHEET_PARTIAL_NOTICE}
          >
            {strings('rewards_money.claim.partial_notice')}
          </Text>
        ) : null}

        {blockedMessage ? (
          <Text
            variant={TextVariant.BodySm}
            color={TextColor.TextAlternative}
            testID={REWARDS_MONEY_TEST_IDS.CLAIM_SHEET_BLOCKED_NOTICE}
          >
            {blockedMessage}
          </Text>
        ) : null}

        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          onPress={handleConfirm}
          isDisabled={!canConfirm}
          isLoading={isClaiming}
          twClassName="w-full"
          testID={REWARDS_MONEY_TEST_IDS.CLAIM_SHEET_CONFIRM}
        >
          {strings('rewards_money.claim.confirm')}
        </Button>
      </Box>
    </BottomSheet>
  );
};

export default ClaimEarningsBottomSheet;
