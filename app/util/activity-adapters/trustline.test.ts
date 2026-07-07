import {
  TransactionStatus as KeyringTransactionStatus,
  Transaction,
  TransactionType,
} from '@metamask/keyring-api';
import {
  hasTrustlineTypeLabel,
  isTrustlineApproveTransaction,
  isTrustlineDisapproveTransaction,
  isTrustlineTransaction,
  resolveAssetActivationActivityTitle,
  resolveTrustlineActivityTitle,
} from './trustline';

jest.mock('../../../locales/i18n', () => ({
  strings: (key: string, params?: { symbol?: string }) =>
    params?.symbol ? `${key}:${params.symbol}` : key,
}));

const baseTransaction: Transaction = {
  id: 'tx-trustline',
  chain: 'stellar:pubnet',
  account: 'GABC123',
  type: TransactionType.Unknown,
  status: KeyringTransactionStatus.Confirmed,
  timestamp: 1_700_000_000,
  from: [],
  to: [],
  fees: [],
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

  it('does not treat generic token approve transactions as trustline approve', () => {
    expect(
      isTrustlineApproveTransaction({
        ...baseTransaction,
        type: TransactionType.TokenApprove,
      }),
    ).toBe(false);
  });

  it('detects trustline disapprove transactions by typeLabel', () => {
    expect(
      isTrustlineDisapproveTransaction({
        ...baseTransaction,
        details: { typeLabel: 'trustline-disapprove' },
      }),
    ).toBe(true);
  });

  it('detects trustline transactions by typeLabel', () => {
    expect(
      isTrustlineTransaction({
        ...baseTransaction,
        details: { typeLabel: 'trustline-disapprove' },
      }),
    ).toBe(true);
  });

  it('detects trustline transactions via hasTrustlineTypeLabel', () => {
    expect(
      hasTrustlineTypeLabel({ typeLabel: 'trustline-approve' }),
    ).toBe(true);
  });

  it('resolves activate title with token symbol', () => {
    expect(resolveAssetActivationActivityTitle('USDC', true)).toBe(
      'activity_assetActivation_success_title:USDC',
    );
  });

  it('resolves deactivate title without token symbol', () => {
    expect(resolveAssetActivationActivityTitle(undefined, false)).toBe(
      'activity_assetDeactivation_success_title',
    );
  });

  it('keeps resolveTrustlineActivityTitle as a compatibility alias', () => {
    expect(resolveTrustlineActivityTitle('USDC', true)).toBe(
      'activity_assetActivation_success_title:USDC',
    );
  });
});
