import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import CardCashbackView, {
  CardCashbackSelectors,
  formatMusdBaseUnits,
} from './CardCashbackView';
import type { CardSummaryResponse } from '../../../../../core/Engine/controllers/rewards-money-controller/types';

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string, vars?: Record<string, string>) =>
    vars ? `${key}:${vars.rate ?? vars.amount}` : key,
}));

const summary = {
  lifetime_total: '1000000',
  claimable: '30000',
  held: '0',
  blocked: '0',
  voided: '0',
  pending: '10000',
  claimed: '0',
  minimum_musd_base_units: '10000',
  blocking_reason: null,
  pairing_pending: false,
} satisfies CardSummaryResponse;

describe('CardCashbackView', () => {
  it('formats mUSD base units with six decimals', () => {
    expect(formatMusdBaseUnits('30000')).toBe('0.03');
    expect(formatMusdBaseUnits('1000000')).toBe('1');
    expect(formatMusdBaseUnits('10000')).toBe('0.01');
    expect(formatMusdBaseUnits('nope')).toBe('nope');
  });

  it('shows the summary and claims when the account can sign', () => {
    const onClaim = jest.fn();
    const view = render(
      <CardCashbackView
        status="ready"
        summary={summary}
        ledger={[
          {
            type: 'earning',
            id: 'fact-1',
            musd_amount: '30000',
            card_source: {
              spend_usd: '1.00',
              rate_bps: 300,
              occurred_at: '2026-11-23T00:00:00.000Z',
            },
          },
        ]}
        canClaim
        onClaim={onClaim}
      />,
    );

    expect(view.getByTestId(CardCashbackSelectors.CLAIMABLE)).toHaveTextContent(
      'card.card_home.cashback_screen.claimable 0.03',
    );
    expect(view.getByTestId(CardCashbackSelectors.RATE)).toHaveTextContent(
      'card.card_home.cashback_screen.rate:3',
    );
    expect(view.getByRole('header')).toHaveTextContent(
      'card.card_home.cashback_screen.title',
    );
    fireEvent.press(view.getByTestId(CardCashbackSelectors.CLAIM));
    expect(onClaim).toHaveBeenCalledTimes(1);
  });

  it('does not offer a claim for an MPC Money account', () => {
    const view = render(
      <CardCashbackView
        status="ready"
        summary={summary}
        canClaim={false}
        mpcAccount
      />,
    );

    expect(view.queryByTestId(CardCashbackSelectors.CLAIM)).toBeNull();
    expect(view.getByTestId(CardCashbackSelectors.MPC)).toBeOnTheScreen();
  });

  it('keeps the claim button when a claim fails', () => {
    const view = render(
      <CardCashbackView
        status="ready"
        summary={summary}
        canClaim
        claimFailed
      />,
    );

    expect(
      view.getByTestId(CardCashbackSelectors.CLAIM_ERROR),
    ).toBeOnTheScreen();
    expect(view.getByTestId(CardCashbackSelectors.CLAIM)).toBeOnTheScreen();
  });

  it('shows the unavailable message when the summary is missing', () => {
    const view = render(<CardCashbackView status="unavailable" />);

    expect(
      view.getByTestId(CardCashbackSelectors.UNAVAILABLE),
    ).toBeOnTheScreen();
  });

  it('shows the minimum when the balance is below it', () => {
    const view = render(
      <CardCashbackView
        status="ready"
        summary={{
          ...summary,
          claimable: '1000',
          minimum_musd_base_units: '10000',
        }}
        canClaim
      />,
    );

    expect(view.getByText(/below_minimum:0\.01/)).toBeOnTheScreen();
    expect(view.queryByTestId(CardCashbackSelectors.CLAIM)).toBeNull();
  });

  it('shows the ledger entry id when the amount is missing', () => {
    const view = render(
      <CardCashbackView
        status="ready"
        summary={summary}
        ledger={[
          {
            type: 'earning',
            id: 'fact-2',
            musd_amount: '',
          },
        ]}
      />,
    );

    expect(view.getByText('fact-2')).toBeOnTheScreen();
  });

  it('shows a blocking reason', () => {
    const view = render(
      <CardCashbackView
        status="ready"
        summary={{
          ...summary,
          blocking_reason: 'held',
        }}
        canClaim
      />,
    );

    expect(view.getByText('held')).toBeOnTheScreen();
    expect(view.queryByTestId(CardCashbackSelectors.CLAIM)).toBeNull();
  });

  it('shows the pairing message', () => {
    const view = render(
      <CardCashbackView
        status="ready"
        summary={{
          ...summary,
          pairing_pending: true,
          claimable: '',
          minimum_musd_base_units: '',
        }}
        canClaim
      />,
    );

    expect(view.getByTestId(CardCashbackSelectors.PAIRING)).toBeOnTheScreen();
  });
});
