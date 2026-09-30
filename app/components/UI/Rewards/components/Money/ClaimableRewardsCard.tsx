import React from 'react';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Button,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  Skeleton,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import type { ReferralLocalizedText } from '../../../../../core/Engine/controllers/rewards-money-controller/types';
import { meetsClaimMinimum } from '../../utils/claimEarnings';

export const CLAIMABLE_REWARDS_CARD_TEST_IDS = {
  CONTAINER: 'claimable-rewards-card',
  AMOUNT: 'claimable-rewards-card-amount',
  CLAIM_BUTTON: 'claimable-rewards-card-claim-button',
  CLAIMED_BUTTON: 'claimable-rewards-card-claimed-button',
  LAST_7_DAYS: 'claimable-rewards-card-last-7-days',
  RECORDED: 'claimable-rewards-card-recorded',
  SKELETON: 'claimable-rewards-card-skeleton',
} as const;

export type ClaimButtonState = 'claim' | 'claimed' | 'hidden';

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
 * Claim when at least $1 is payable on a route. Otherwise a disabled Claimed
 * button only after a payout has already landed. Both missing or zero hides it.
 */
export function claimButtonState(
  claimable: string | undefined,
  claimed: string | undefined,
  canClaim: boolean = meetsClaimMinimum(claimable),
): ClaimButtonState {
  if (canClaim && meetsClaimMinimum(claimable)) {
    return 'claim';
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
  /** Formatted lifetime total. */
  recordedAmount: string;
  /** Formatted last-7-days total, or null while that figure is unknown. */
  last7Amount: string | null;
  isSummaryLoading: boolean;
  isLast7Loading: boolean;
  /** A family clears $1, so the press can call a claim route. */
  canClaim?: boolean;
  isClaiming?: boolean;
  onClaim?: () => void;
}

const ClaimableRewardsCardSkeleton: React.FC<{
  localizedText: ReferralLocalizedText;
}> = ({ localizedText }) => {
  const tw = useTailwind();

  return (
    <Box
      twClassName="overflow-hidden rounded-2xl bg-muted"
      testID={CLAIMABLE_REWARDS_CARD_TEST_IDS.SKELETON}
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Between}
        twClassName="p-4"
      >
        <Box twClassName="flex-1 pr-4">
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            {localizedText.availableToClaim}
          </Text>
          <Skeleton style={tw.style('mt-1 h-8 w-28 rounded-md')} />
        </Box>
        <Skeleton style={tw.style('h-10 w-24 rounded-full')} />
      </Box>
      <Box
        flexDirection={BoxFlexDirection.Row}
        twClassName="border-t border-muted"
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
            {localizedText.recordedEarningsLabel}
          </Text>
          <Skeleton style={tw.style('mt-1 h-5 w-16 rounded-md')} />
        </Box>
      </Box>
    </Box>
  );
};

/**
 * Available-to-claim card. Claim is enabled only when `canClaim` is set,
 * which means a route's balance is at least $1.
 */
const ClaimableRewardsCard: React.FC<ClaimableRewardsCardProps> = ({
  localizedText,
  claimable,
  claimed,
  claimableAmount,
  recordedAmount,
  last7Amount,
  isSummaryLoading,
  isLast7Loading,
  canClaim = false,
  isClaiming = false,
  onClaim,
}) => {
  const tw = useTailwind();

  if (isSummaryLoading) {
    return <ClaimableRewardsCardSkeleton localizedText={localizedText} />;
  }

  const button = claimButtonState(claimable, claimed, canClaim);
  const showLast7Skeleton = isLast7Loading && last7Amount === null;

  return (
    <Box
      twClassName="overflow-hidden rounded-2xl bg-muted"
      testID={CLAIMABLE_REWARDS_CARD_TEST_IDS.CONTAINER}
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Between}
        twClassName="p-4"
      >
        <Box twClassName="flex-1 pr-4">
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            {localizedText.availableToClaim}
          </Text>
          <Text
            variant={TextVariant.HeadingLg}
            testID={CLAIMABLE_REWARDS_CARD_TEST_IDS.AMOUNT}
          >
            {claimableAmount}
          </Text>
        </Box>
        {button === 'hidden' ? null : (
          <Box>
            <Button
              variant={ButtonVariant.Primary}
              size={ButtonSize.Md}
              isDisabled={button === 'claimed' || isClaiming}
              onPress={button === 'claim' ? onClaim : undefined}
              testID={
                button === 'claim'
                  ? CLAIMABLE_REWARDS_CARD_TEST_IDS.CLAIM_BUTTON
                  : CLAIMABLE_REWARDS_CARD_TEST_IDS.CLAIMED_BUTTON
              }
            >
              {button === 'claim' ? localizedText.claim : localizedText.claimed}
            </Button>
          </Box>
        )}
      </Box>
      <Box
        flexDirection={BoxFlexDirection.Row}
        twClassName="border-t border-muted"
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
            {localizedText.recordedEarningsLabel}
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
