import {
  TransactionType,
  type TransactionMeta,
} from '@metamask/transaction-controller';
import { deriveFiatDepositAssetId } from './fiatDepositAsset';

const tx = (meta: Partial<TransactionMeta>) => meta as TransactionMeta;

describe('deriveFiatDepositAssetId', () => {
  it('uses the hardcoded default for a non-batch deposit type', () => {
    expect(
      deriveFiatDepositAssetId(tx({ type: TransactionType.perpsDeposit }), [
        TransactionType.perpsDeposit,
      ]),
    ).toBe('eip155:42161/slip44:60');
  });

  it('uses the first nested enabled type for batch transactions', () => {
    expect(
      deriveFiatDepositAssetId(
        tx({
          type: TransactionType.batch,
          nestedTransactions: [
            { type: TransactionType.tokenMethodApprove },
            { type: TransactionType.predictDeposit },
          ],
        }),
        [TransactionType.predictDeposit],
      ),
    ).toBe('eip155:137/slip44:966');
  });

  it('prefers the feature-flag override over the default', () => {
    expect(
      deriveFiatDepositAssetId(
        tx({ type: TransactionType.moneyAccountDeposit }),
        [TransactionType.moneyAccountDeposit],
        {
          [TransactionType.moneyAccountDeposit]: {
            address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
            chainId: '0x1',
          },
        },
      ),
    ).toBe('eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48');
  });

  it('resolves nothing when the transaction is not a fiat deposit', () => {
    // An empty asset id leaves the payment-methods query idle, so a plain send
    // or a signature never fetches a catalog nobody asked for.
    expect(deriveFiatDepositAssetId(undefined, [])).toBe('');
    expect(
      deriveFiatDepositAssetId(tx({ type: TransactionType.swap }), [
        TransactionType.moneyAccountDeposit,
      ]),
    ).toBe('');
    expect(
      deriveFiatDepositAssetId(
        tx({
          type: TransactionType.batch,
          nestedTransactions: [{ type: TransactionType.tokenMethodApprove }],
        }),
        [TransactionType.moneyAccountDeposit],
      ),
    ).toBe('');
  });

  it('falls back to native ETH mainnet for an enabled but unmapped type', () => {
    expect(
      deriveFiatDepositAssetId(tx({ type: TransactionType.swap }), [
        TransactionType.swap,
      ]),
    ).toBe('eip155:1/slip44:60');
  });

  it('maps the money deposit default to native ETH mainnet', () => {
    expect(
      deriveFiatDepositAssetId(
        tx({ type: TransactionType.moneyAccountDeposit }),
        [TransactionType.moneyAccountDeposit],
      ),
    ).toBe('eip155:1/slip44:60');
  });
});
