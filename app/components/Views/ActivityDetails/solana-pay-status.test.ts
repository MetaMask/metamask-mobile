import type { MetamaskPayIntent } from '@metamask/transaction-controller';
import { strings } from '../../../../locales/i18n';
import { getSolanaPayStatusLabel } from './solana-pay-status';

function buildIntent(outcome: MetamaskPayIntent['outcome']): MetamaskPayIntent {
  return {
    outcome,
    sourceAccountId: 'solana:mainnet:account',
    sourceAmountRaw: '1',
    sourceAssetId: 'solana:mainnet/slip44:501',
    sourceChainId: 'solana:mainnet',
    sourceWalletAccountId: 'wallet-account-id',
    version: 2,
  } as MetamaskPayIntent;
}

describe('getSolanaPayStatusLabel', () => {
  it('labels ambiguous source observation as status unavailable', () => {
    const result = getSolanaPayStatusLabel(
      buildIntent({ type: 'unknown', phase: 'source' }),
    );

    expect(result).toBe(strings('confirm.solana_pay.status_unavailable'));
  });

  it('labels a Relay refund distinctly from failure', () => {
    const result = getSolanaPayStatusLabel(
      buildIntent({ type: 'refunded', reason: 'provider_refund' }),
    );

    expect(result).toBe(strings('confirm.solana_pay.refunded'));
  });

  it('uses the parent lifecycle label for successful settlement', () => {
    const result = getSolanaPayStatusLabel(buildIntent({ type: 'succeeded' }));

    expect(result).toBeUndefined();
  });
});
