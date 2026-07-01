import { Transaction, TransactionType } from '@metamask/keyring-api';
import {
  isTrustlineApproveTransaction,
  isTrustlineDisapproveTransaction,
  isTrustlineTransaction,
  resolveTrustlineActivityTitle,
} from './trustline';

jest.mock('../../../locales/i18n', () => ({
  strings: (key: string, params?: { unit?: string }) =>
    params?.unit ? `${key}:${params.unit}` : key,
}));

const baseTransaction: Transaction = {
  id: 'tx-trustline',
  chain: 'stellar:pubnet',
  account: 'GABC123',
  type: TransactionType.Unknown,
  status: 'confirmed',
  timestamp: 1_700_000_000,
  from: [],
  to: [],
  fees: [],
  events: [],
};

describe('trustline activity helpers', () => {
  it('detects trustline approve transactions by typeLabel', () => {
    expect(
      isTrustlineApproveTransaction({
        ...baseTransaction,
        details: { typeLabel: 'trustline-approve' },
      }),
    ).toBe(true);
  });

  it('detects trustline approve transactions by token approve type', () => {
    expect(
      isTrustlineApproveTransaction({
        ...baseTransaction,
        type: TransactionType.TokenApprove,
      }),
    ).toBe(true);
  });

  it('detects trustline disapprove transactions by typeLabel', () => {
    expect(
      isTrustlineDisapproveTransaction({
        ...baseTransaction,
        details: { typeLabel: 'trustline-disapprove' },
      }),
    ).toBe(true);
  });

  it('detects trustline transactions', () => {
    expect(
      isTrustlineTransaction({
        ...baseTransaction,
        type: TransactionType.TokenDisapprove,
      }),
    ).toBe(true);
  });

  it('resolves activate title with token symbol', () => {
    expect(resolveTrustlineActivityTitle('USDC', true)).toBe(
      'transactions.trustline_activated_unit:USDC',
    );
  });

  it('resolves deactivate title without token symbol', () => {
    expect(resolveTrustlineActivityTitle(undefined, false)).toBe(
      'transactions.trustline_deactivated',
    );
  });
});
