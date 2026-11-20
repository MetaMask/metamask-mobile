import React from 'react';
import { useSelector } from 'react-redux';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Button,
  ButtonIcon,
  ButtonIconSize,
  ButtonSize,
  ButtonVariant,
  IconColor,
  IconName,
  IconSize,
  FontWeight,
  Skeleton,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import type { ReferralLocalizedText } from '../../../../../core/Engine/controllers/rewards-money-controller/types';
import { isPositiveBaseUnits } from '../../utils/formatUtils';
import { selectIsSocialV1Enabled } from '../../../../../selectors/featureFlagController/socialV1';
import { CLAIMABLE_REWARDS_CARD_TEST_IDS } from './ClaimableRewardsCard.testIds';

export type ClaimButtonState = 'claim' | 'paused' | 'claimed' | 'hidden';

export type ClaimHeadline = 'available' | 'held' | 'pending' | 'balance';

function amountHeading(label: string, currency: string): string {
  return `${label} \u2022 ${currency}`;
}

interface ClaimCardStateInput {
  claimable?: string;
  pending?: string;
  claimed?: string;
  held?: string;
  blocked?: string;
  canClaim?: boolean;
  /**
   * Income is held only until tax documentation is done. The button stays
   * Claim so the press opens the tax flow, even beside a blocked balance.
   */
  taxHeld?: boolean;
}

/**
 * First match wins: payable claimable, a tax hold, pending, then held or
 * blocked, then whatever balance is left.
 */
export function claimHeadline({
  claimable,
  pending,
  held,
  canClaim = false,
  taxHeld = false,
}: ClaimCardStateInput): ClaimHeadline {
  if (canClaim && isPositiveBaseUnits(claimable)) {
    return 'available';
  }
  if (taxHeld && isPositiveBaseUnits(held)) {
    return 'held';
  }
  if (isPositiveBaseUnits(pending)) {
    return 'pending';
  }
  return 'balance';
}

/**
 * Claim when an open route is payable, or when the balance is tax-held.
 * Pending then shows Claimed or nothing, ahead of Paused.
 */
export function claimButtonState(
  claimable: string | undefined,
  claimed: string | undefined,
  canClaim = false,
  held?: string,
  blocked?: string,
  taxHeld = false,
  pending?: string,
): ClaimButtonState {
  if (canClaim && isPositiveBaseUnits(claimable)) {
    return 'claim';
  }
  if (taxHeld && isPositiveBaseUnits(held)) {
    return 'claim';
  }
  if (isPositiveBaseUnits(pending)) {
    return isPositiveBaseUnits(claimed) ? 'claimed' : 'hidden';
  }
  if (isPositiveBaseUnits(held) || isPositiveBaseUnits(blocked)) {
    return 'paused';
  }
  if (isPositiveBaseUnits(claimed)) {
    return 'claimed';
  }
  return 'hidden';
}

export interface ClaimableRewardsCardProps {
  localizedText: ReferralLocalizedText;
  claimable?: string;
  claimed?: string;
  /** Formatted claimable balance. */
  claimableAmount: string;
  /** Adjusted pending base units, including an open route under the minimum. */
  pending?: string;
  /** Formatted adjusted pending balance. */
  pendingAmount?: string;
  /**
   * A referrer shows the claimable amount row while Social V1 is enabled.
   */
  isReferrer?: boolean;
  /**
   * Base units in `held`. Tax documentation shows this under Held and stays
   * Claim. Any other positive held or blocked balance shows Balance and
   * Paused, after Pending.
   */
  held?: string;
  /** Formatted `held` balance. Shown when tax documentation is the only hold. */
  heldAmount?: string;
  /**
   * Base units in `blocked`. A positive value, or a positive `held`, shows
   * Balance and Paused.
   */
  blocked?: string;
  /** Formatted lifetime total. */
  recordedAmount: string;
  /** Formatted last-7-days total, or null while that figure is unknown. */
  last7Amount: string | null;
  isSummaryLoading: boolean;
  isLast7Loading: boolean;
  /** The cashback family reaches the summary minimum, so the press can call a claim route. */
  canClaim?: boolean;
  /**
   * The only held balance is income waiting on tax documentation. Claim
   * stays Claim and still calls `onClaim`.
   */
  taxHeld?: boolean;
  isClaiming?: boolean;
  /** A Retry-After window. The button stays disabled without a spinner. */
  isClaimWaiting?: boolean;
  onClaim?: () => void;
  onPaused?: () => void;
  /** Opens the balance breakdown. Shown beside the amount when set. */
  onBalanceBreakdown?: () => void;
}

const ClaimableRewardsCardSkeleton: React.FC<{
  localizedText: ReferralLocalizedText;
  showClaimableAmount: boolean;
}> = ({ localizedText, showClaimableAmount }) => {
  const tw = useTailwind();

  return (
    <Box
      twClassName="overflow-hidden rounded-2xl bg-muted"
      testID={CLAIMABLE_REWARDS_CARD_TEST_IDS.SKELETON}
    >
      {showClaimableAmount ? (
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Between}
          twClassName="p-4"
        >
          <Box twClassName="flex-1 pr-4">
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
            >
              {amountHeading(
                localizedText.availableToClaim,
                localizedText.mUSD,
              )}
            </Text>
            <Skeleton style={tw.style('mt-1 h-8 w-28 rounded-md')} />
          </Box>
          <Skeleton style={tw.style('h-10 w-24 rounded-full')} />
        </Box>
      ) : null}
      <Box
        flexDirection={BoxFlexDirection.Row}
        twClassName={showClaimableAmount ? 'border-t border-muted' : undefined}
      >
        <Box twClassName="flex-1 p-4">
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            {localizedText.last7Days}
          </Text>
          <Skeleton style={tw.style('mt-1 h-5 w-16 rounded-md')} />
        </Box>
        <Box twClassName="my-3 w-px bg-border-muted" />
        <Box twClassName="flex-1 p-4">
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            {localizedText.totalEarningsLabel}
          </Text>
          <Skeleton style={tw.style('mt-1 h-5 w-16 rounded-md')} />
        </Box>
      </Box>
    </Box>
  );
};

/**
 * Earnings balance card. Claim when an open route is payable or the balance
 * is tax-held. Pending, including an open route under the minimum, comes
 * before Paused.
 */
const ClaimableRewardsCard: React.FC<ClaimableRewardsCardProps> = ({
  localizedText,
  claimable,
  claimed,
  claimableAmount,
  pending,
  pendingAmount,
  isReferrer = false,
  held,
  heldAmount,
  blocked,
  recordedAmount,
  last7Amount,
  isSummaryLoading,
  isLast7Loading,
  canClaim = false,
  taxHeld = false,
  isClaiming = false,
  isClaimWaiting = false,
  onClaim,
  onPaused,
  onBalanceBreakdown,
}) => {
  const tw = useTailwind();
  const showReferrerClaimableAmount = useSelector(selectIsSocialV1Enabled);
  const showClaimableAmount = !isReferrer || showReferrerClaimableAmount;

  if (isSummaryLoading) {
    return (
      <ClaimableRewardsCardSkeleton
        localizedText={localizedText}
        showClaimableAmount={showClaimableAmount}
      />
    );
  }

  const button = claimButtonState(
    claimable,
    claimed,
    canClaim,
    held,
    blocked,
    taxHeld,
    pending,
  );
  const headline = claimHeadline({
    claimable,
    pending,
    held,
    canClaim,
    taxHeld,
  });
  const showLast7Skeleton = isLast7Loading && last7Amount === null;
  const headingLabel = {
    available: localizedText.availableToClaim,
    held: localizedText.held,
    pending: localizedText.pending,
    balance: localizedText.balance,
  }[headline];
  const heading = amountHeading(headingLabel, localizedText.mUSD);
  const amount = {
    available: claimableAmount,
    held: heldAmount ?? claimableAmount,
    pending: pendingAmount ?? claimableAmount,
    balance: recordedAmount,
  }[headline];
  const claimInProgress = button === 'claim' && isClaiming;
  const claimCoolingDown =
    button === 'claim' && isClaimWaiting && !claimInProgress;
  const buttonLabel =
    button === 'claim'
      ? localizedText.claim
      : button === 'paused'
        ? localizedText.paused
        : localizedText.claimed;
  const buttonTestId =
    button === 'claim'
      ? CLAIMABLE_REWARDS_CARD_TEST_IDS.CLAIM_BUTTON
      : button === 'paused'
        ? CLAIMABLE_REWARDS_CARD_TEST_IDS.PAUSED_BUTTON
        : CLAIMABLE_REWARDS_CARD_TEST_IDS.CLAIMED_BUTTON;

  return (
    <Box
      twClassName="overflow-hidden rounded-2xl bg-muted"
      testID={CLAIMABLE_REWARDS_CARD_TEST_IDS.CONTAINER}
    >
      {showClaimableAmount ? (
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Between}
          twClassName="p-4"
        >
          <Box twClassName="flex-1 pr-4">
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
            >
              {heading}
            </Text>
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
            >
              <Text
                variant={TextVariant.HeadingLg}
                testID={CLAIMABLE_REWARDS_CARD_TEST_IDS.AMOUNT}
              >
                {amount}
              </Text>
              {onBalanceBreakdown ? (
                <ButtonIcon
                  iconName={IconName.Info}
                  size={ButtonIconSize.Md}
                  iconProps={{
                    color: IconColor.IconAlternative,
                    size: IconSize.Md,
                  }}
                  twClassName="-mr-1.5"
                  onPress={onBalanceBreakdown}
                  accessibilityLabel={localizedText.breakdown}
                  testID={CLAIMABLE_REWARDS_CARD_TEST_IDS.BALANCE_BREAKDOWN}
                />
              ) : null}
            </Box>
          </Box>
          {button === 'hidden' ? null : (
            <Box>
              <Button
                variant={ButtonVariant.Primary}
                size={ButtonSize.Md}
                isDisabled={button === 'claimed' || claimCoolingDown}
                isLoading={claimInProgress}
                onPress={
                  button === 'claim'
                    ? onClaim
                    : button === 'paused'
                      ? onPaused
                      : undefined
                }
                testID={buttonTestId}
              >
                {buttonLabel}
              </Button>
            </Box>
          )}
        </Box>
      ) : null}
      <Box
        flexDirection={BoxFlexDirection.Row}
        twClassName={showClaimableAmount ? 'border-t border-muted' : undefined}
      >
        <Box twClassName="flex-1 p-4">
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            {localizedText.last7Days}
          </Text>
          {showLast7Skeleton ? (
            <Skeleton style={tw.style('mt-1 h-5 w-16 rounded-md')} />
          ) : (
            <Text
              variant={TextVariant.BodyMd}
              fontWeight={FontWeight.Medium}
              testID={CLAIMABLE_REWARDS_CARD_TEST_IDS.LAST_7_DAYS}
            >
              {last7Amount ?? '—'}
            </Text>
          )}
        </Box>
        <Box twClassName="my-3 w-px bg-border-muted" />
        <Box twClassName="flex-1 p-4">
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            {localizedText.totalEarningsLabel}
          </Text>
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            testID={CLAIMABLE_REWARDS_CARD_TEST_IDS.RECORDED}
          >
            {recordedAmount}
          </Text>
        </Box>
      </Box>
    </Box>
  );
};

export default ClaimableRewardsCard;
