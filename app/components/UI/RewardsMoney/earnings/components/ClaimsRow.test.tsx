import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import type {
  ClaimDto,
  ClaimLifecycleStatus,
} from '../../../../../core/Engine/controllers/rewards-money-controller/types';
import ClaimsRow from './ClaimsRow';

const createClaim = (status: ClaimLifecycleStatus): ClaimDto =>
  ({
    id: `claim-${status}`,
    money_account_address: '0xmoneyaccount',
    earning_origin_types: ['REFERRAL_REV_SHARE'],
    gross_amount: '200000',
    withheld_amount: '0',
    net_amount: '200000',
    withholding_rate_bps: 0,
    valid_before: null,
    status,
    created_at: '2026-09-07T10:00:00.000Z',
    settled_tx_hash: null,
    settled_at: null,
  }) as ClaimDto;

describe('ClaimsRow', () => {
  it('renders the net amount as currency', () => {
    render(<ClaimsRow claim={createClaim('SETTLED')} testID="row" />);

    expect(screen.getByText('$0.20')).toBeOnTheScreen();
  });

  it.each<[ClaimLifecycleStatus, string]>([
    ['SETTLED', 'Confirmed'],
    ['AUTHORIZED', 'Pending'],
    ['EXPIRED', 'Expired'],
    ['FAILED', 'Not completed'],
  ])('labels a %s claim as "%s"', (status, label) => {
    render(<ClaimsRow claim={createClaim(status)} testID="row" />);

    expect(screen.getByText(label)).toBeOnTheScreen();
  });

  /**
   * `PENDING_SIGNATURE` is an internal step the user cannot act on, swept to
   * FAILED within minutes, so it reads as pending rather than naming itself.
   */
  it('folds PENDING_SIGNATURE in with pending', () => {
    render(<ClaimsRow claim={createClaim('PENDING_SIGNATURE')} testID="row" />);

    expect(screen.getByText('Pending')).toBeOnTheScreen();
  });

  it('is pressable when a transaction can be opened', () => {
    const onPress = jest.fn();
    render(
      <ClaimsRow
        claim={createClaim('SETTLED')}
        onPress={onPress}
        testID="row"
      />,
    );

    fireEvent.press(screen.getByTestId('row-pressable'));

    expect(onPress).toHaveBeenCalled();
  });

  /**
   * An EXPIRED or FAILED claim never reached the chain, so there is nothing to
   * open and the row must not look tappable.
   */
  it('renders inert when no transaction can be opened', () => {
    render(<ClaimsRow claim={createClaim('EXPIRED')} testID="row" />);

    expect(screen.queryByTestId('row-pressable')).not.toBeOnTheScreen();
    expect(screen.getByTestId('row')).toBeOnTheScreen();
  });

  /** An inferred match must not be presented as fact. */
  it('marks an inferred match as likely', () => {
    render(
      <ClaimsRow
        claim={createClaim('AUTHORIZED')}
        onPress={jest.fn()}
        isInferredMatch
        testID="row"
      />,
    );

    expect(screen.getByText(/likely transaction/)).toBeOnTheScreen();
  });

  it('does not add the likely qualifier to an exact match', () => {
    render(
      <ClaimsRow
        claim={createClaim('SETTLED')}
        onPress={jest.fn()}
        testID="row"
      />,
    );

    expect(screen.queryByText(/likely transaction/)).not.toBeOnTheScreen();
  });
});
