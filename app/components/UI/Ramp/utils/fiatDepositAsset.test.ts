import {
  TransactionType,
  type TransactionMeta,
} from '@metamask/transaction-controller';
import { deriveFiatDepositAssetId } from './fiatDepositAsset';

const tx = (meta: Partial<TransactionMeta>) => meta as TransactionMeta;

/**
 * mUSD on Monad, the asset TPC's direct-mUSD Money Account path quotes. EIP-55
 * checksummed, because that is the form `MUSD_TOKEN_ASSET_ID_BY_CHAIN` carries.
 */
const MUSD_MONAD_ASSET_ID =
  'eip155:143/erc20:0xacA92E438df0B2401fF60dA7E4337B687a2435DA';

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

  it('prefers the nested order over the enabled-types order', () => {
    // TPC's `resolveTransactionType` lets nested-transaction order decide, so
    // reordering the remote `enabledTransactionTypes` flag must not change the
    // resolved asset.
    expect(
      deriveFiatDepositAssetId(
        tx({
          type: TransactionType.batch,
          nestedTransactions: [
            { type: TransactionType.predictDeposit },
            { type: TransactionType.perpsDeposit },
          ],
        }),
        [TransactionType.perpsDeposit, TransactionType.predictDeposit],
      ),
    ).toBe('eip155:137/slip44:966');
  });

  it('prefers the feature-flag override over the default', () => {
    expect(
      deriveFiatDepositAssetId(
        tx({ type: TransactionType.perpsDeposit }),
        [TransactionType.perpsDeposit],
        {
          [TransactionType.perpsDeposit]: {
            address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
            chainId: '0x1',
          },
        },
      ),
    ).toBe('eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48');
  });

  it('ignores a money deposit override, which only binds TPC on the relay path', () => {
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
    ).toBe(MUSD_MONAD_ASSET_ID);
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

  it('maps the money deposit to mUSD on Monad', () => {
    expect(
      deriveFiatDepositAssetId(
        tx({ type: TransactionType.moneyAccountDeposit }),
        [TransactionType.moneyAccountDeposit],
      ),
    ).toBe(MUSD_MONAD_ASSET_ID);
  });

  it('resolves nothing for a money deposit that is not an enabled type', () => {
    // The money branch sits below the enabled-types guard, so a disabled money
    // deposit stays idle rather than fetching the mUSD catalog anyway.
    expect(
      deriveFiatDepositAssetId(
        tx({ type: TransactionType.moneyAccountDeposit }),
        [],
      ),
    ).toBe('');
  });
});
