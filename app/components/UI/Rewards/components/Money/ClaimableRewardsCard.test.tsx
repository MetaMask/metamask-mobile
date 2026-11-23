import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import type { ReferralLocalizedText } from '../../../../../core/Engine/controllers/rewards-money-controller/types';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { selectIsSocialV1Enabled } from '../../../../../selectors/featureFlagController/socialV1';
import ClaimableRewardsCard, { claimButtonState } from './ClaimableRewardsCard';
import { CLAIMABLE_REWARDS_CARD_TEST_IDS } from './ClaimableRewardsCard.testIds';

jest.mock('../../../../../selectors/featureFlagController/socialV1', () => ({
  selectIsSocialV1Enabled: jest.fn(() => false),
}));

const LOCALIZED_TEXT = {
  availableToClaim: 'Available to claim',
  availableToClaimSubtext: 'mUSD paid into your Money account',
  balance: 'Balance',
  balanceSubtext: 'mUSD in total earnings',
  held: 'Held',
  heldSubtext:
    'mUSD available to claim once tax determination is clear and hold is removed',
  pending: 'Pending',
  pendingSubtext:
    'mUSD available to claim once pending is clear and {minimum} is met',
  mUSD: 'mUSD',
  claim: 'Claim',
  paused: 'Paused',
  claimed: 'Claimed',
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
      isSummaryLoading={false}
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
    expect(claimButtonState('0', '0', false, '100000000', '0', true)).toBe(
      'claim',
    );
    expect(claimButtonState('0', '50', false, '0', '12000000')).toBe('paused');
    expect(claimButtonState('0', '50', false, '0', '0')).toBe('claimed');
    expect(
      claimButtonState(
        '0',
        '0',
        false,
        '100000000',
        '12000000',
        false,
        '400000',
      ),
    ).toBe('hidden');
    expect(
      claimButtonState('0', '50', false, '100000000', '0', false, '400000'),
    ).toBe('claimed');
    expect(
      claimButtonState('0', '0', false, '2000000', '0', true, '400000'),
    ).toBe('claim');
  });

  it('keeps Claim for a tax hold even when another balance is blocked', () => {
    expect(claimButtonState('0', '0', false, '120000', '130000', true)).toBe(
      'claim',
    );
    expect(claimButtonState('0', '0', false, '120000', '130000')).toBe(
      'paused',
    );
  });
});

describe('ClaimableRewardsCard', () => {
  beforeEach(() => {
    jest.mocked(selectIsSocialV1Enabled).mockReturnValue(false);
  });

  it('renders Claim when a route clears $1', () => {
    const { getByTestId, queryByTestId } = renderWithProvider(
      <ClaimableRewardsCard
        localizedText={LOCALIZED_TEXT}
        claimable="1000000"
        claimed="0"
        claimableAmount="$1.00"
        recordedAmount="$4.00"
        isSummaryLoading={false}
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
        isSummaryLoading={false}
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
        isSummaryLoading={false}
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

  it('shows the remaining wait under the disabled Claim button', () => {
    const { getByTestId, getByText } = renderWithProvider(
      <ClaimableRewardsCard
        localizedText={LOCALIZED_TEXT}
        claimable="1000000"
        claimed="0"
        claimableAmount="$1.00"
        recordedAmount="$4.00"
        isSummaryLoading={false}
        canClaim
        isClaimWaiting
        claimWaitCaption="You can't claim just yet. Try again in 12 minutes."
      />,
    );

    expect(
      getByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.CLAIM_BUTTON),
    ).toBeDisabled();
    expect(
      getByText("You can't claim just yet. Try again in 12 minutes."),
    ).toBeOnTheScreen();
  });

  it('shows the remaining wait, not the earned-elsewhere caption, when both apply', () => {
    const onClaim = jest.fn();
    const { getByTestId, queryByTestId } = renderWithProvider(
      <ClaimableRewardsCard
        localizedText={LOCALIZED_TEXT}
        claimable="1000000"
        claimed="0"
        claimableAmount="$1.00"
        recordedAmount="$4.00"
        isSummaryLoading={false}
        canClaim
        isClaimWaiting
        claimWaitCaption="You can't claim just yet. Try again in 12 minutes."
        earnedElsewhereCaption="Some earnings belong to accounts not on this device. Import the wallet to claim."
        onClaim={onClaim}
      />,
    );

    expect(
      getByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.CLAIM_WAIT),
    ).toHaveTextContent("You can't claim just yet. Try again in 12 minutes.");
    expect(
      queryByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.EARNED_ELSEWHERE_CAPTION),
    ).toBeNull();
    expect(
      getByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.CLAIM_BUTTON),
    ).toBeDisabled();
    fireEvent.press(getByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.CLAIM_BUTTON));
    expect(onClaim).not.toHaveBeenCalled();
  });

  it('keeps Claim enabled when some earnings are on accounts this phone can sign', () => {
    const onClaim = jest.fn();
    const { getByTestId, getByText, queryByTestId } = renderWithProvider(
      <ClaimableRewardsCard
        localizedText={LOCALIZED_TEXT}
        claimable="1000000"
        claimed="0"
        claimableAmount="$1.00"
        recordedAmount="$4.00"
        isSummaryLoading={false}
        canClaim
        earnedElsewhereCaption="Some earnings belong to accounts not on this device. Import the wallet to claim."
        onClaim={onClaim}
      />,
    );

    expect(getByText('Available to claim')).toBeOnTheScreen();
    expect(getByText('Claim')).toBeOnTheScreen();
    expect(
      getByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.CLAIM_BUTTON),
    ).not.toBeDisabled();
    expect(
      queryByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.CLAIMED_BUTTON),
    ).toBeNull();
    expect(
      getByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.EARNED_ELSEWHERE_CAPTION),
    ).toHaveTextContent(
      'Some earnings belong to accounts not on this device. Import the wallet to claim.',
    );
    fireEvent.press(getByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.CLAIM_BUTTON));
    expect(onClaim).toHaveBeenCalledTimes(1);
  });

  it('disables Claim when every earning address is unsignable on this phone', () => {
    const onClaim = jest.fn();
    const { getByTestId, getByText } = renderWithProvider(
      <ClaimableRewardsCard
        localizedText={LOCALIZED_TEXT}
        claimable="1000000"
        claimed="0"
        claimableAmount="$1.00"
        recordedAmount="$4.00"
        isSummaryLoading={false}
        canClaim
        claimBlockedOnDevice
        earnedElsewhereCaption="Some earnings belong to accounts not on this device. Import the wallet to claim."
        onClaim={onClaim}
      />,
    );

    expect(getByText('Available to claim')).toBeOnTheScreen();
    expect(getByText('Claim')).toBeOnTheScreen();
    expect(
      getByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.CLAIM_BUTTON),
    ).toBeDisabled();
    expect(
      getByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.EARNED_ELSEWHERE_CAPTION),
    ).toBeOnTheScreen();
    fireEvent.press(getByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.CLAIM_BUTTON));
    expect(onClaim).not.toHaveBeenCalled();
  });

  it('keeps Claim pressable when earnings are unsignable and income is held for tax', () => {
    const onClaim = jest.fn();
    const { getByTestId, getByText } = renderWithProvider(
      <ClaimableRewardsCard
        localizedText={LOCALIZED_TEXT}
        claimable="1000000"
        claimed="0"
        held="1000000"
        heldAmount="$1.00"
        claimableAmount="$1.00"
        recordedAmount="$4.00"
        isSummaryLoading={false}
        canClaim
        taxHeld
        claimBlockedOnDevice
        earnedElsewhereCaption="Some earnings belong to accounts not on this device. Import the wallet to claim."
        onClaim={onClaim}
      />,
    );

    expect(getByText('Available to claim')).toBeOnTheScreen();
    expect(
      getByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.CLAIM_BUTTON),
    ).not.toBeDisabled();
    expect(
      getByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.EARNED_ELSEWHERE_CAPTION),
    ).toBeOnTheScreen();
    fireEvent.press(getByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.CLAIM_BUTTON));
    expect(onClaim).toHaveBeenCalledTimes(1);
  });

  it('renders a disabled Claimed button when only claimed is positive', () => {
    const { getByTestId, getByText, queryByTestId } = renderCard('0', '50');

    expect(getByText('Balance')).toBeOnTheScreen();
    expect(
      getByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.AMOUNT),
    ).toHaveTextContent('$4.00');
    expect(
      queryByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.CLAIM_BUTTON),
    ).toBeNull();
    expect(
      getByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.CLAIMED_BUTTON),
    ).toBeDisabled();
  });

  it('shows Pending and hides Claim when the open route is under the minimum', () => {
    const { getByTestId, getByText, queryByTestId } = renderWithProvider(
      <ClaimableRewardsCard
        localizedText={LOCALIZED_TEXT}
        claimable="0"
        pending="400000"
        claimed="0"
        claimableAmount="$0.00"
        pendingAmount="$0.40"
        recordedAmount="$4.00"
        isSummaryLoading={false}
      />,
    );

    expect(getByText('Pending')).toBeOnTheScreen();
    expect(
      getByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.AMOUNT),
    ).toHaveTextContent('$0.40');
    expect(
      queryByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.CLAIM_BUTTON),
    ).toBeNull();
    expect(
      queryByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.CLAIMED_BUTTON),
    ).toBeNull();
  });

  it('shows Pending ahead of Paused when both are positive', () => {
    const { getByTestId, getByText, queryByTestId } = renderWithProvider(
      <ClaimableRewardsCard
        localizedText={LOCALIZED_TEXT}
        claimable="0"
        pending="400000"
        claimed="50"
        held="100000000"
        blocked="12000000"
        claimableAmount="$0.00"
        pendingAmount="$0.40"
        recordedAmount="$132.00"
        isSummaryLoading={false}
      />,
    );

    expect(getByText('Pending')).toBeOnTheScreen();
    expect(
      queryByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.PAUSED_BUTTON),
    ).toBeNull();
    expect(
      getByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.CLAIMED_BUTTON),
    ).toBeDisabled();
  });

  it('shows Held and Claim ahead of Pending when the balance is tax-held', () => {
    const onClaim = jest.fn();
    const { getByTestId, getByText, queryByTestId } = renderWithProvider(
      <ClaimableRewardsCard
        localizedText={LOCALIZED_TEXT}
        claimable="0"
        pending="400000"
        claimed="0"
        held="2000000"
        heldAmount="$2.00"
        taxHeld
        claimableAmount="$0.00"
        pendingAmount="$0.40"
        recordedAmount="$2.40"
        isSummaryLoading={false}
        onClaim={onClaim}
      />,
    );

    expect(getByText('Held')).toBeOnTheScreen();
    expect(
      getByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.AMOUNT),
    ).toHaveTextContent('$2.00');
    expect(
      getByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.CLAIM_BUTTON),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.PAUSED_BUTTON),
    ).toBeNull();

    fireEvent.press(getByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.CLAIM_BUTTON));
    expect(onClaim).toHaveBeenCalledTimes(1);
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
        isSummaryLoading={false}
        onPaused={onPaused}
      />,
    );

    expect(getByText('Balance')).toBeOnTheScreen();
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

  it('shows the held balance and Claim when tax documentation is the only hold', () => {
    const onClaim = jest.fn();
    const { getByTestId, getByText, queryByTestId } = renderWithProvider(
      <ClaimableRewardsCard
        localizedText={{
          ...LOCALIZED_TEXT,
          held: 'Held',
        }}
        claimable="0"
        claimed="0"
        held="2000000"
        heldAmount="$2.00"
        taxHeld
        claimableAmount="$0.00"
        recordedAmount="$2.00"
        isSummaryLoading={false}
        onClaim={onClaim}
      />,
    );

    expect(getByText('Held')).toBeOnTheScreen();
    expect(
      getByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.AMOUNT),
    ).toHaveTextContent('$2.00');
    expect(
      getByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.CLAIM_BUTTON),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.PAUSED_BUTTON),
    ).toBeNull();

    fireEvent.press(getByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.CLAIM_BUTTON));
    expect(onClaim).toHaveBeenCalledTimes(1);
  });

  it('shows the held balance and Claim when tax is held beside a blocked balance', () => {
    const onClaim = jest.fn();
    const { getByTestId, getByText, queryByTestId } = renderWithProvider(
      <ClaimableRewardsCard
        localizedText={{
          ...LOCALIZED_TEXT,
          held: 'Held',
        }}
        claimable="0"
        claimed="0"
        held="120000"
        blocked="130000"
        heldAmount="$0.12"
        taxHeld
        claimableAmount="$0.00"
        recordedAmount="$0.25"
        isSummaryLoading={false}
        onClaim={onClaim}
      />,
    );

    expect(getByText('Held')).toBeOnTheScreen();
    expect(
      getByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.AMOUNT),
    ).toHaveTextContent('$0.12');
    expect(
      queryByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.PAUSED_BUTTON),
    ).toBeNull();

    fireEvent.press(getByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.CLAIM_BUTTON));
    expect(onClaim).toHaveBeenCalledTimes(1);
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
        isSummaryLoading={false}
      />,
    );

    expect(getByText('Available to claim')).toBeOnTheScreen();
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
        isSummaryLoading={false}
        onBalanceBreakdown={onBalanceBreakdown}
      />,
    );

    fireEvent.press(
      getByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.BALANCE_BREAKDOWN),
    );
    expect(onBalanceBreakdown).toHaveBeenCalledTimes(1);
  });

  it('renders nothing for a referrer while Social V1 is off', () => {
    jest.mocked(selectIsSocialV1Enabled).mockReturnValue(false);
    const { queryByTestId, queryByText } = renderWithProvider(
      <ClaimableRewardsCard
        localizedText={LOCALIZED_TEXT}
        claimable="1000000"
        claimed="0"
        claimableAmount="$1.00"
        recordedAmount="$4.00"
        isSummaryLoading={false}
        canClaim
        isReferrer
      />,
    );

    expect(queryByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.CONTAINER)).toBeNull();
    expect(queryByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.AMOUNT)).toBeNull();
    expect(
      queryByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.CLAIM_BUTTON),
    ).toBeNull();
    expect(queryByText('Available to claim')).toBeNull();
  });

  it('shows the claimable amount row for a referrer while Social V1 is on', () => {
    jest.mocked(selectIsSocialV1Enabled).mockReturnValue(true);
    const { getByTestId, getByText } = renderWithProvider(
      <ClaimableRewardsCard
        localizedText={LOCALIZED_TEXT}
        claimable="1000000"
        claimed="0"
        claimableAmount="$1.00"
        recordedAmount="$4.00"
        isSummaryLoading={false}
        canClaim
        isReferrer
      />,
    );

    expect(
      getByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.AMOUNT),
    ).toHaveTextContent('$1.00');
    expect(getByText('Available to claim')).toBeOnTheScreen();
    expect(
      getByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.CLAIM_BUTTON),
    ).toBeOnTheScreen();
  });

  it('renders only the claimable skeleton while the summary loads', () => {
    const { getByTestId, getByText, queryByText } = renderWithProvider(
      <ClaimableRewardsCard
        localizedText={LOCALIZED_TEXT}
        claimableAmount="$1.00"
        recordedAmount="$4.00"
        isSummaryLoading
      />,
    );

    expect(
      getByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.SKELETON),
    ).toBeOnTheScreen();
    expect(getByText('Available to claim')).toBeOnTheScreen();
    expect(queryByText('Last 7 days')).toBeNull();
    expect(queryByText('Total earnings')).toBeNull();
  });

  it('does not show the last 7 days or total earnings row', () => {
    const { queryByText } = renderCard('1000000', '0');

    expect(queryByText('Last 7 days')).toBeNull();
    expect(queryByText('Total earnings')).toBeNull();
  });
});

describe('ClaimableRewardsCard subtext', () => {
  const baseProps = {
    localizedText: LOCALIZED_TEXT,
    claimableAmount: '$0.00',
    recordedAmount: '$4.00',
    isSummaryLoading: false,
  };

  it('renders the label as the heading with no currency suffix', () => {
    const { getByText, queryByText } = renderWithProvider(
      <ClaimableRewardsCard
        {...baseProps}
        claimable="1000000"
        canClaim
        claimableAmount="$1.00"
      />,
    );

    expect(getByText('Available to claim')).toBeOnTheScreen();
    expect(queryByText('Available to claim \u2022 mUSD')).toBeNull();
  });

  it('shows the available subtext under the amount', () => {
    const { getByTestId } = renderWithProvider(
      <ClaimableRewardsCard
        {...baseProps}
        claimable="1000000"
        canClaim
        claimableAmount="$1.00"
      />,
    );

    expect(
      getByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.SUBTEXT),
    ).toHaveTextContent('mUSD paid into your Money account');
  });

  it('shows the held subtext when the headline is held', () => {
    const { getByText, getByTestId } = renderWithProvider(
      <ClaimableRewardsCard
        {...baseProps}
        held="100000000"
        heldAmount="$100.00"
        taxHeld
      />,
    );

    expect(getByText('Held')).toBeOnTheScreen();
    expect(
      getByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.SUBTEXT),
    ).toHaveTextContent(
      'mUSD available to claim once tax determination is clear and hold is removed',
    );
  });

  it('fills the pending minimum with the formatted claim minimum', () => {
    const { getByText, getByTestId } = renderWithProvider(
      <ClaimableRewardsCard
        {...baseProps}
        pending="400000"
        pendingAmount="$0.40"
        minimumAmount="$1.00"
      />,
    );

    expect(getByText('Pending')).toBeOnTheScreen();
    expect(
      getByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.SUBTEXT),
    ).toHaveTextContent(
      'mUSD available to claim once pending is clear and $1.00 is met',
    );
  });

  it('fills the pending minimum with the word minimum when it is unknown', () => {
    const { getByTestId, queryByText } = renderWithProvider(
      <ClaimableRewardsCard
        {...baseProps}
        pending="400000"
        pendingAmount="$0.40"
      />,
    );

    expect(
      getByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.SUBTEXT),
    ).toHaveTextContent(
      'mUSD available to claim once pending is clear and minimum is met',
    );
    expect(queryByText(/\{minimum\}/)).toBeNull();
  });

  it('shows the balance subtext when the headline is balance', () => {
    const { getByText, getByTestId } = renderWithProvider(
      <ClaimableRewardsCard {...baseProps} />,
    );

    expect(getByText('Balance')).toBeOnTheScreen();
    expect(
      getByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.SUBTEXT),
    ).toHaveTextContent('mUSD in total earnings');
  });
});
