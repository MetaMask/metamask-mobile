import React from 'react';
import type { ReferralLocalizedText } from '../../../../../core/Engine/controllers/rewards-money-controller/types';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import ClaimableRewardsCard, {
  CLAIMABLE_REWARDS_CARD_TEST_IDS,
  claimButtonState,
} from './ClaimableRewardsCard';

const LOCALIZED_TEXT = {
  availableToClaim: 'Available to claim',
  claim: 'Claim',
  claimed: 'Claimed',
  last7Days: 'Last 7 days',
  recordedEarningsLabel: 'Recorded earnings',
} as unknown as ReferralLocalizedText;

const renderCard = (
  claimable: string | undefined,
  claimed: string | undefined,
) =>
  renderWithProvider(
    <ClaimableRewardsCard
      localizedText={LOCALIZED_TEXT}
      claimable={claimable}
      claimed={claimed}
      claimableAmount="$1.00"
      recordedAmount="$4.00"
      last7Amount="$0.25"
      isSummaryLoading={false}
      isLast7Loading={false}
    />,
  );

describe('claimButtonState', () => {
  it('enables Claim only at $1 or more', () => {
    expect(claimButtonState('1000000', '50', true)).toBe('claim');
    expect(claimButtonState('50', '50')).toBe('claimed');
    expect(claimButtonState('999999', '0')).toBe('hidden');
    expect(claimButtonState(undefined, '50')).toBe('claimed');
    expect(claimButtonState('0', '0')).toBe('hidden');
    expect(claimButtonState(undefined, undefined)).toBe('hidden');
  });
});

describe('ClaimableRewardsCard', () => {
  it('renders Claim when a route clears $1', () => {
    const { getByTestId, queryByTestId } = renderWithProvider(
      <ClaimableRewardsCard
        localizedText={LOCALIZED_TEXT}
        claimable="1000000"
        claimed="0"
        claimableAmount="$1.00"
        recordedAmount="$4.00"
        last7Amount="$0.25"
        isSummaryLoading={false}
        isLast7Loading={false}
        canClaim
      />,
    );

    expect(
      getByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.CLAIM_BUTTON),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.CLAIMED_BUTTON),
    ).toBeNull();
  });

  it('renders a disabled Claimed button when only claimed is positive', () => {
    const { getByTestId, queryByTestId } = renderCard('0', '50');

    expect(
      queryByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.CLAIM_BUTTON),
    ).toBeNull();
    expect(
      getByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.CLAIMED_BUTTON),
    ).toBeDisabled();
  });

  it('hides the button when both balances are zero or missing', () => {
    const { queryByTestId } = renderCard(undefined, '0');

    expect(
      queryByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.CLAIM_BUTTON),
    ).toBeNull();
    expect(
      queryByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.CLAIMED_BUTTON),
    ).toBeNull();
  });
});
