import React from 'react';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { strings } from '../../../../../locales/i18n';
import type { TokenAmount } from '../../../../util/activity-adapters';
import { ActivityDetailsApprovalTokenSection } from './ActivityDetailsApprovalTokenSection';

describe('ActivityDetailsApprovalTokenSection', () => {
  it('renders the resolved cap amount when provided', () => {
    const { getByText } = renderWithProvider(
      <ActivityDetailsApprovalTokenSection
        token={{ symbol: 'USDT', decimals: 6, direction: 'out' } as TokenAmount}
        capLabel="Unlimited USDT"
      />,
    );

    expect(getByText('Unlimited USDT')).toBeOnTheScreen();
  });

  it('falls back to the token symbol when no cap label is provided', () => {
    const { getByText } = renderWithProvider(
      <ActivityDetailsApprovalTokenSection
        token={{ symbol: 'USDC', decimals: 6, direction: 'out' } as TokenAmount}
      />,
    );

    expect(getByText('USDC')).toBeOnTheScreen();
  });

  it('shows "Unknown" with a "?" avatar when the token has no symbol (ignoring a cap label)', () => {
    const { getByText, queryByText } = renderWithProvider(
      <ActivityDetailsApprovalTokenSection
        token={{ direction: 'out' } as TokenAmount}
        chainId="eip155:1"
        capLabel="Unlimited"
      />,
    );

    expect(
      getByText(strings('activity_details.unknown_token')),
    ).toBeOnTheScreen();
    expect(getByText('?')).toBeOnTheScreen();
    expect(queryByText('Unlimited')).toBeNull();
  });

  it('shows "Unknown" with a "?" avatar when there is no token at all', () => {
    const { getByText } = renderWithProvider(
      <ActivityDetailsApprovalTokenSection
        token={undefined}
        chainId="eip155:1"
      />,
    );

    expect(
      getByText(strings('activity_details.unknown_token')),
    ).toBeOnTheScreen();
    expect(getByText('?')).toBeOnTheScreen();
  });
});
