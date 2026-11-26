import React from 'react';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Button,
  ButtonIcon,
  ButtonIconSize,
  ButtonSize,
  ButtonVariant,
  FontFamily,
  IconColor,
  IconName,
  IconSize,
  Skeleton,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import type { ReferralLocalizedText } from '../../../../../core/Engine/controllers/rewards-money-controller/types';
import { isPositiveBaseUnits } from '../../utils/formatUtils';
import { CLAIMABLE_REWARDS_CARD_TEST_IDS } from './ClaimableRewardsCard.testIds';

export type ClaimButtonState = 'claim' | 'paused' | 'claimed' | 'hidden';

export type ClaimHeadline = 'available' | 'held' | 'pending' | 'balance';

/**
 * The line under the amount. `{minimum}` takes the formatted claim minimum.
 * With no minimum to show, the word "minimum" fills it instead, so the raw
 * token never reaches the screen. A payload cached before the server added
 * this headline's key has no copy, so the line is left empty rather than
 * failing the render.
 */
function subtextFor(
  headline: ClaimHeadline,
  localizedText: ReferralLocalizedText,
  minimumAmount: string | undefined,
): string {
  const template = {
    available: localizedText.availableToClaimSubtext,
    held: localizedText.heldSubtext,
    pending: localizedText.pendingSubtext,
    balance: localizedText.balanceSubtext,
  }[headline];
  if (!template) {
    return '';
  }
  return template.replaceAll('{minimum}', minimumAmount ?? 'minimum');
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
  /** Formatted claim minimum. Fills `{minimum}` in the subtext under the amount. */
  minimumAmount?: string;
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
  /** Formatted lifetime total. Shown as the balance when nothing is claimable or pending. */
  recordedAmount: string;
  isSummaryLoading: boolean;
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
  /**
   * The filled wait sentence, shown under the disabled Claim button while
   * `isClaimWaiting` is set.
   */
  claimWaitCaption?: string;
  /**
   * Shown under Claim when at least one claimable address is not signable
   * on this phone. It does not disable the button. A wait window keeps its
   * own caption.
   */
  earnedElsewhereCaption?: string;
  /**
   * Disables Claim when every open route's claimable addresses are
   * unsignable on this phone. A tax hold stays pressable: that press opens
   * the tax sheet. The button stays the one `claimButtonState` picks.
   */
  claimBlockedOnDevice?: boolean;
  onClaim?: () => void;
  onPaused?: () => void;
  /** Opens the balance breakdown. Shown beside the amount when set. */
  onBalanceBreakdown?: () => void;
}

const ClaimableRewardsCardSkeleton: React.FC<{
  localizedText: ReferralLocalizedText;
}> = ({ localizedText }) => {
  const tw = useTailwind();

  return (
    <Box
      className="overflow-hidden rounded-2xl bg-muted p-4"
      testID={CLAIMABLE_REWARDS_CARD_TEST_IDS.SKELETON}
    >
      <Box>
        <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
          {localizedText.availableToClaim}
        </Text>
        <Skeleton style={tw.style('mt-1 h-8 w-28 rounded-md')} />
      </Box>
      <Skeleton style={tw.style('mt-3 h-12 w-full rounded-full')} />
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
  minimumAmount,
  held,
  heldAmount,
  blocked,
  recordedAmount,
  isSummaryLoading,
  canClaim = false,
  taxHeld = false,
  isClaiming = false,
  isClaimWaiting = false,
  claimWaitCaption,
  earnedElsewhereCaption,
  claimBlockedOnDevice = false,
  onClaim,
  onPaused,
  onBalanceBreakdown,
}) => {
  if (isSummaryLoading) {
    return <ClaimableRewardsCardSkeleton localizedText={localizedText} />;
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
  const headingLabel = {
    available: localizedText.availableToClaim,
    held: localizedText.held,
    pending: localizedText.pending,
    balance: localizedText.balance,
  }[headline];
  const subtext = subtextFor(headline, localizedText, minimumAmount);
  const amount = {
    available: claimableAmount,
    held: heldAmount ?? claimableAmount,
    pending: pendingAmount ?? claimableAmount,
    balance: recordedAmount,
  }[headline];
  // A tax hold keeps Claim pressable. That press opens the tax sheet, and
  // cashback this phone cannot sign is not submitted.
  const claimBlocked = button === 'claim' && claimBlockedOnDevice && !taxHeld;
  const claimInProgress = button === 'claim' && isClaiming && !claimBlocked;
  const claimCoolingDown =
    button === 'claim' && isClaimWaiting && !claimInProgress;
  // A wait window keeps its own caption. The earned-elsewhere sentence does
  // not change the button. Claim is disabled only when every address is
  // unsignable and nothing is held for tax documentation.
  const caption =
    claimCoolingDown && claimWaitCaption
      ? {
          text: claimWaitCaption,
          testID: CLAIMABLE_REWARDS_CARD_TEST_IDS.CLAIM_WAIT,
        }
      : button === 'claim' && earnedElsewhereCaption
        ? {
            text: earnedElsewhereCaption,
            testID: CLAIMABLE_REWARDS_CARD_TEST_IDS.EARNED_ELSEWHERE_CAPTION,
          }
        : null;
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
      className="overflow-hidden rounded-2xl bg-muted"
      testID={CLAIMABLE_REWARDS_CARD_TEST_IDS.CONTAINER}
    >
      <Box className="p-4">
        <Box>
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            {headingLabel}
          </Text>
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
          >
            <Text
              variant={TextVariant.AmountDisplayLg}
              fontFamily={FontFamily.Hero}
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
                className="-mr-1.5"
                onPress={onBalanceBreakdown}
                accessibilityLabel={localizedText.breakdown}
                testID={CLAIMABLE_REWARDS_CARD_TEST_IDS.BALANCE_BREAKDOWN}
              />
            ) : null}
          </Box>
          <Text
            variant={TextVariant.BodySm}
            color={TextColor.TextAlternative}
            testID={CLAIMABLE_REWARDS_CARD_TEST_IDS.SUBTEXT}
          >
            {subtext}
          </Text>
        </Box>
        {button === 'hidden' ? null : (
          <Box className="mt-3">
            <Button
              variant={ButtonVariant.Primary}
              size={ButtonSize.Lg}
              className="w-full"
              isDisabled={
                button === 'claimed' || claimCoolingDown || claimBlocked
              }
              isLoading={claimInProgress}
              onPress={
                button === 'claim' && !claimBlocked
                  ? onClaim
                  : button === 'paused'
                    ? onPaused
                    : undefined
              }
              testID={buttonTestId}
            >
              {buttonLabel}
            </Button>
            {caption ? (
              <Text
                variant={TextVariant.BodyXs}
                color={TextColor.TextAlternative}
                className="mt-2 text-center"
                testID={caption.testID}
              >
                {caption.text}
              </Text>
            ) : null}
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default ClaimableRewardsCard;
