import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import type { ReferralLocalizedText } from '../../../../../core/Engine/controllers/rewards-money-controller/types';
import MoneyClaimableRewardsCard, {
  MoneyClaimableRewardsCardTestIds,
} from './MoneyClaimableRewardsCard';

const LOCALIZED_TEXT = {
  availableToClaim: 'Available to claim',
  mUSD: 'mUSD',
  claim: 'Claim',
} as ReferralLocalizedText;

const renderCard = (privacyMode = false) => {
  const onClaim = jest.fn();
  const view = render(
    <MoneyClaimableRewardsCard
      localizedText={LOCALIZED_TEXT}
      amount="$1.00"
      privacyMode={privacyMode}
      onClaim={onClaim}
    />,
  );
  return { ...view, onClaim };
};

describe('MoneyClaimableRewardsCard', () => {
  it('renders the referral copy and the rebate amount', () => {
    const { getByText, getByTestId } = renderCard();

    expect(getByText('Available to claim')).toBeOnTheScreen();
    expect(getByText(/\u2022 mUSD/)).toBeOnTheScreen();
    expect(getByText('Claim')).toBeOnTheScreen();
    expect(
      getByTestId(MoneyClaimableRewardsCardTestIds.AMOUNT),
    ).toHaveTextContent('$1.00');
  });

  it('calls onClaim when Claim is pressed', () => {
    const { getByTestId, onClaim } = renderCard();

    fireEvent.press(getByTestId(MoneyClaimableRewardsCardTestIds.CLAIM_BUTTON));

    expect(onClaim).toHaveBeenCalledTimes(1);
  });

  it('masks the amount in privacy mode', () => {
    const { getByTestId } = renderCard(true);

    expect(
      getByTestId(MoneyClaimableRewardsCardTestIds.AMOUNT),
    ).not.toHaveTextContent('$1.00');
  });
});
