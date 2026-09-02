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
import type {
  EarningOriginType,
  EarningsSummaryDto,
} from '../../../../../core/Engine/controllers/rewards-money-controller/types';
import { CLAIM_WATCHDOG_MS, REWARDS_MONEY_TEST_IDS } from '../../constants';
import { formatMusd } from '../../utils/format';
import { deriveClaimability } from '../utils/deriveClaimability';
import useClaimEarnings, {
  type ClaimFailureReason,
} from '../hooks/useClaimEarnings';

export interface ClaimEarningsBottomSheetParams {
  summary: EarningsSummaryDto;
  originTypes: EarningOriginType[];
}

interface ClaimEarningsBottomSheetProps {
  route: { params: ClaimEarningsBottomSheetParams };
}

const FAILURE_MESSAGE_KEY: Record<ClaimFailureReason, string> = {
  NOT_SUBMITTABLE: 'rewards_money.claim.error_not_submittable',
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
  const { summary, originTypes } = route.params;
  const sheetRef = useRef<BottomSheetRef>(null);
  const navigation = useNavigation<AppNavigationProp>();
  const { showToast, RewardsToastOptions } = useRewardsToast();
  const { claim, isClaiming, hasSubmitted, error, isSubmittable, reset } =
    useClaimEarnings();

  // Locking the sheet is separate from `isClaiming` so the watchdog can release
  // it while the request is still outstanding.
  const [isLocked, setIsLocked] = useState(false);
  const watchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const claimability = useMemo(
    () => deriveClaimability(summary, originTypes),
    [summary, originTypes],
  );

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

  useEffect(() => {
    if (hasSubmitted) {
      clearWatchdog();
      setIsLocked(false);
      showToast(
        RewardsToastOptions.success(strings('rewards_money.claim.success')),
      );
      navigation.goBack();
    }
  }, [hasSubmitted, clearWatchdog, showToast, RewardsToastOptions, navigation]);

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

  const canConfirm = claimability.canClaim && isSubmittable && !isClaiming;

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
          {formatMusd(summary.claimable)}
        </Text>

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
