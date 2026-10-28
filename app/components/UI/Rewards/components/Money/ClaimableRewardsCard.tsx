import React from 'react';
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
import { SHOW_REFERRER_CLAIMABLE_AMOUNT } from './constants';
import { CLAIMABLE_REWARDS_CARD_TEST_IDS } from './ClaimableRewardsCard.testIds';

export type ClaimButtonState = 'claim' | 'paused' | 'claimed' | 'hidden';

function amountHeading(label: string, currency: string): string {
  return `${label} \u2022 ${currency}`;
}

function isPositiveBaseUnits(value: string | undefined): boolean {
  if (!value) {
    return false;
  }
  try {
    return BigInt(value) > 0n;
  } catch {
    return false;
  }
}

/**
 * Claim when `canClaim` is set, even if some money is held or blocked.
 * Otherwise a positive held or blocked balance shows Paused, ahead of a
 * disabled Claimed button. Both missing or zero hides it.
 */
export function claimButtonState(
  claimable: string | undefined,
  claimed: string | undefined,
  canClaim = false,
  held?: string,
  blocked?: string,
): ClaimButtonState {
  if (canClaim && isPositiveBaseUnits(claimable)) {
    return 'claim';
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
  /**
   * A referrer hides the claimable amount row while
   * `SHOW_REFERRER_CLAIMABLE_AMOUNT` is false.
   */
  isReferrer?: boolean;
  /**
   * Base units in `held`. A positive value, or a positive `blocked`, shows
   * Balance and Paused. Omitted for anyone who is not a referee.
   */
  held?: string;
  /**
   * Base units in `blocked`. A positive value, or a positive `held`, shows
   * Balance and Paused. Omitted for anyone who is not a referee.
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
 * Available-to-claim card. Claim is enabled only when `canClaim` is set,
 * which means the cashback family reaches the summary minimum.
 */
const ClaimableRewardsCard: React.FC<ClaimableRewardsCardProps> = ({
  localizedText,
  claimable,
  claimed,
  claimableAmount,
  isReferrer = false,
  held,
  blocked,
  recordedAmount,
  last7Amount,
  isSummaryLoading,
  isLast7Loading,
  canClaim = false,
  isClaiming = false,
  isClaimWaiting = false,
  onClaim,
  onPaused,
  onBalanceBreakdown,
}) => {
  const tw = useTailwind();
  const showClaimableAmount = !isReferrer || SHOW_REFERRER_CLAIMABLE_AMOUNT;

  if (isSummaryLoading) {
    return (
      <ClaimableRewardsCardSkeleton
        localizedText={localizedText}
        showClaimableAmount={showClaimableAmount}
      />
    );
  }

  const button = claimButtonState(claimable, claimed, canClaim, held, blocked);
  const paused = button === 'paused';
  const showLast7Skeleton = isLast7Loading && last7Amount === null;
  const heading = amountHeading(
    paused ? localizedText.balance : localizedText.availableToClaim,
    localizedText.mUSD,
  );
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
                {paused ? recordedAmount : claimableAmount}
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
