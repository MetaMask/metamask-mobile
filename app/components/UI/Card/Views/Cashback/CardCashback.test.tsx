import React from 'react';
import { AccessibilityInfo } from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import CardCashback from './CardCashback';
import { CardCashbackSelectors } from './CardCashbackView';

const mockClaim = jest.fn();

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

jest.mock('react-redux', () => ({
  useSelector: (selector: () => unknown) => selector(),
}));

jest.mock(
  '../../../../../selectors/featureFlagController/rewardsMoneyController',
  () => ({
    selectRewardsMoneyControllerEnabled: () => true,
  }),
);

jest.mock('./useCardCashbackClaim', () => ({
  useCardCashbackClaim: () => ({
    claim: mockClaim,
    isClaiming: false,
    canClaim: true,
    mpcAccount: false,
  }),
}));

jest.mock('../../../../../core/Engine', () => ({
  context: {
    RewardsMoneyController: {
      getCardSummary: jest.fn().mockResolvedValue({
        lifetime_total: '1000000',
        claimable: '30000',
        held: '0',
        blocked: '0',
        voided: '0',
        pending: '0',
        claimed: '0',
        minimum_musd_base_units: '10000',
        blocking_reason: null,
        pairing_pending: false,
      }),
      getCardLedger: jest.fn().mockResolvedValue({ results: [] }),
    },
  },
}));

describe('CardCashback', () => {
  beforeEach(() => {
    mockClaim.mockReset();
    jest
      .spyOn(AccessibilityInfo, 'announceForAccessibility')
      .mockImplementation(() => undefined);
  });

  it('announces a failed claim and keeps the summary on screen', async () => {
    mockClaim.mockResolvedValue('failed');
    const view = render(<CardCashback />);

    await waitFor(() => {
      expect(view.getByTestId(CardCashbackSelectors.CLAIM)).toBeOnTheScreen();
    });
    fireEvent.press(view.getByTestId(CardCashbackSelectors.CLAIM));

    await waitFor(() => {
      expect(
        view.getByTestId(CardCashbackSelectors.CLAIM_ERROR),
      ).toBeOnTheScreen();
    });
    expect(view.getByTestId(CardCashbackSelectors.CLAIMABLE)).toBeOnTheScreen();
    expect(view.getByTestId(CardCashbackSelectors.CLAIM)).toBeOnTheScreen();
    expect(view.queryByTestId(CardCashbackSelectors.UNAVAILABLE)).toBeNull();
    expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
      'card.card_home.cashback_screen.claim_failed',
    );
  });

  it('announces when a claim rejects', async () => {
    mockClaim.mockRejectedValue(new Error('claim failed'));
    const view = render(<CardCashback />);

    await waitFor(() => {
      expect(view.getByTestId(CardCashbackSelectors.CLAIM)).toBeOnTheScreen();
    });
    fireEvent.press(view.getByTestId(CardCashbackSelectors.CLAIM));

    await waitFor(() => {
      expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
        'card.card_home.cashback_screen.claim_failed',
      );
    });
    expect(view.queryByTestId(CardCashbackSelectors.UNAVAILABLE)).toBeNull();
  });
});
