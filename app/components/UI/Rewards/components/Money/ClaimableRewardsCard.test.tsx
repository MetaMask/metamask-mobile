import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import type { ReferralLocalizedText } from '../../../../../core/Engine/controllers/rewards-money-controller/types';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import ClaimableRewardsCard, { claimButtonState } from './ClaimableRewardsCard';
import { CLAIMABLE_REWARDS_CARD_TEST_IDS } from './ClaimableRewardsCard.testIds';

const LOCALIZED_TEXT = {
  availableToClaim: 'Available to claim',
  balance: 'Balance',
  mUSD: 'mUSD',
  claim: 'Claim',
  paused: 'Paused',
  claimed: 'Claimed',
  last7Days: 'Last 7 days',
  totalEarningsLabel: 'Total earnings',
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

  it('keeps Claim ahead of a positive hold or block', () => {
    expect(claimButtonState('1000000', '0', true, '100000000')).toBe('claim');
    expect(claimButtonState('1000000', '50', true, '0', '12000000')).toBe(
      'claim',
    );
    expect(
      claimButtonState('1000000', '50', true, '100000000', '12000000'),
    ).toBe('claim');
    expect(claimButtonState('0', '0', false, '100000000')).toBe('paused');
    expect(claimButtonState('0', '50', false, '0', '12000000')).toBe('paused');
    expect(claimButtonState('0', '50', false, '0', '0')).toBe('claimed');
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

  it('shows Claim as loading while a claim is in progress', () => {
    const { getByTestId } = renderWithProvider(
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
        isClaiming
      />,
    );

    expect(
      getByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.CLAIM_BUTTON),
    ).toHaveProp('accessibilityState', { busy: true, disabled: true });
  });

  it('keeps Claim disabled without a spinner during the retry wait', () => {
    const { getByTestId } = renderWithProvider(
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
        isClaimWaiting
      />,
    );

    const button = getByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.CLAIM_BUTTON);
    expect(button).toBeDisabled();
    expect(button).not.toHaveProp(
      'accessibilityState',
      expect.objectContaining({ busy: true }),
    );
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

  it('shows the lifetime balance and a Paused button when claims are held', () => {
    const onPaused = jest.fn();
    const { getByTestId, getByText, queryByTestId } = renderWithProvider(
      <ClaimableRewardsCard
        localizedText={LOCALIZED_TEXT}
        claimable="0"
        claimed="0"
        held="100000000"
        claimableAmount="$0.00"
        recordedAmount="$132.00"
        last7Amount="$0.25"
        isSummaryLoading={false}
        isLast7Loading={false}
        onPaused={onPaused}
      />,
    );

    expect(getByText('Balance • mUSD')).toBeOnTheScreen();
    expect(
      getByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.AMOUNT),
    ).toHaveTextContent('$132.00');
    expect(
      getByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.PAUSED_BUTTON),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.CLAIM_BUTTON),
    ).toBeNull();

    fireEvent.press(getByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.PAUSED_BUTTON));
    expect(onPaused).toHaveBeenCalledTimes(1);
  });

  it('keeps Claim when cashback is claimable and some money is held or blocked', () => {
    const { getByTestId, getByText, queryByTestId } = renderWithProvider(
      <ClaimableRewardsCard
        localizedText={LOCALIZED_TEXT}
        claimable="1000000"
        claimed="50"
        held="100000000"
        blocked="12000000"
        canClaim
        claimableAmount="$1.00"
        recordedAmount="$132.00"
        last7Amount="$0.25"
        isSummaryLoading={false}
        isLast7Loading={false}
      />,
    );

    expect(getByText('Available to claim • mUSD')).toBeOnTheScreen();
    expect(
      getByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.AMOUNT),
    ).toHaveTextContent('$1.00');
    expect(
      getByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.CLAIM_BUTTON),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.PAUSED_BUTTON),
    ).toBeNull();
    expect(
      queryByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.CLAIMED_BUTTON),
    ).toBeNull();
  });

  it('opens the balance breakdown from the info button beside the amount', () => {
    const onBalanceBreakdown = jest.fn();
    const { getByTestId } = renderWithProvider(
      <ClaimableRewardsCard
        localizedText={{
          ...LOCALIZED_TEXT,
          breakdown: 'Breakdown',
        }}
        claimable="1000000"
        claimed="0"
        canClaim
        claimableAmount="$1.00"
        recordedAmount="$132.00"
        last7Amount="$0.25"
        isSummaryLoading={false}
        isLast7Loading={false}
        onBalanceBreakdown={onBalanceBreakdown}
      />,
    );

    fireEvent.press(
      getByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.BALANCE_BREAKDOWN),
    );
    expect(onBalanceBreakdown).toHaveBeenCalledTimes(1);
  });

  it('hides the claimable amount row for a referrer', () => {
    const { getByTestId, getByText, queryByTestId, queryByText } =
      renderWithProvider(
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
          isReferrer
        />,
      );

    expect(queryByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.AMOUNT)).toBeNull();
    expect(queryByText('Available to claim • mUSD')).toBeNull();
    expect(
      queryByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.CLAIM_BUTTON),
    ).toBeNull();
    expect(
      getByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.LAST_7_DAYS),
    ).toHaveTextContent('$0.25');
    expect(
      getByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.RECORDED),
    ).toHaveTextContent('$4.00');
    expect(getByText('Last 7 days')).toBeOnTheScreen();
    expect(getByText('Total earnings')).toBeOnTheScreen();
  });

  it('hides the claimable amount row in the referrer skeleton', () => {
    const { getByTestId, getByText, queryByText } = renderWithProvider(
      <ClaimableRewardsCard
        localizedText={LOCALIZED_TEXT}
        claimableAmount="$1.00"
        recordedAmount="$4.00"
        last7Amount={null}
        isSummaryLoading
        isLast7Loading
        isReferrer
      />,
    );

    expect(
      getByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.SKELETON),
    ).toBeOnTheScreen();
    expect(queryByText('Available to claim • mUSD')).toBeNull();
    expect(getByText('Last 7 days')).toBeOnTheScreen();
    expect(getByText('Total earnings')).toBeOnTheScreen();
  });
});
