import React from 'react';
import { AccessibilityInfo } from 'react-native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import Engine from '../../../../../core/Engine';
import CardCashback from './CardCashback';
import { CardCashbackSelectors } from './CardCashbackView';

const mockClaim = jest.fn();
let mockRewardsEnabled = true;
let mockOnSubmitted: (() => Promise<void>) | undefined;

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

jest.mock('react-redux', () => ({
  useSelector: (selector: () => unknown) => selector(),
}));

jest.mock(
  '../../../../../selectors/featureFlagController/rewardsMoneyController',
  () => ({
    selectRewardsMoneyControllerEnabled: () => mockRewardsEnabled,
  }),
);

jest.mock('./useCardCashbackClaim', () => ({
  useCardCashbackClaim: (onSubmitted?: () => Promise<void>) => {
    mockOnSubmitted = onSubmitted;
    return {
      claim: mockClaim,
      isClaiming: false,
      canClaim: true,
      mpcAccount: false,
    };
  },
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
    mockRewardsEnabled = true;
    mockOnSubmitted = undefined;
    mockClaim.mockReset();
    jest
      .mocked(Engine.context.RewardsMoneyController.getCardSummary)
      .mockClear();
    jest
      .mocked(Engine.context.RewardsMoneyController.getCardLedger)
      .mockClear();
    jest
      .spyOn(AccessibilityInfo, 'announceForAccessibility')
      .mockImplementation(() => undefined);
    jest.mocked(AccessibilityInfo.announceForAccessibility).mockClear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
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

  it('hides Claim when the claim was sent but the balance is stale', async () => {
    mockClaim.mockResolvedValue('submitted_stale');
    const view = render(<CardCashback />);

    await waitFor(() => {
      expect(view.getByTestId(CardCashbackSelectors.CLAIM)).toBeOnTheScreen();
    });
    fireEvent.press(view.getByTestId(CardCashbackSelectors.CLAIM));

    await waitFor(() => {
      expect(view.queryByTestId(CardCashbackSelectors.CLAIM)).toBeNull();
    });
    expect(view.getByTestId(CardCashbackSelectors.CLAIMABLE)).toBeOnTheScreen();
    expect(view.queryByTestId(CardCashbackSelectors.UNAVAILABLE)).toBeNull();
    expect(view.queryByTestId(CardCashbackSelectors.CLAIM_ERROR)).toBeNull();
    expect(AccessibilityInfo.announceForAccessibility).not.toHaveBeenCalled();
  });

  it('reloads the summary after a submitted claim', async () => {
    mockClaim.mockResolvedValue('submitted');
    const view = render(<CardCashback />);

    await waitFor(() => {
      expect(view.getByTestId(CardCashbackSelectors.CLAIM)).toBeOnTheScreen();
    });
    const loaded = jest.mocked(
      Engine.context.RewardsMoneyController.getCardSummary,
    ).mock.calls.length;

    await act(async () => {
      fireEvent.press(view.getByTestId(CardCashbackSelectors.CLAIM));
    });
    await mockOnSubmitted?.();

    expect(
      jest.mocked(Engine.context.RewardsMoneyController.getCardSummary).mock
        .calls.length,
    ).toBeGreaterThan(loaded);
  });

  it('shows unavailable when the summary cannot be loaded', async () => {
    jest
      .mocked(Engine.context.RewardsMoneyController.getCardSummary)
      .mockRejectedValueOnce(new Error('down'));
    const view = render(<CardCashback />);

    await waitFor(() => {
      expect(
        view.getByTestId(CardCashbackSelectors.UNAVAILABLE),
      ).toBeOnTheScreen();
    });
  });

  it('shows unavailable when rewards money is off', () => {
    mockRewardsEnabled = false;
    const view = render(<CardCashback />);

    expect(
      view.getByTestId(CardCashbackSelectors.UNAVAILABLE),
    ).toBeOnTheScreen();
  });
});
