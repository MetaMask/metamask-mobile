import { Interface, defaultAbiCoder } from '@ethersproject/abi';
import { TransactionType } from '@metamask/transaction-controller';
import type { Hex } from '@metamask/utils';
import {
  MUSD_DECIMALS,
  MUSD_TOKEN_ADDRESS_BY_CHAIN,
  TELLER_ABI,
  applySlippage,
  buildMoneyAccountDepositBatch,
  buildMoneyAccountDepositPlaceholderBatch,
  buildMoneyAccountWithdrawBatch,
  getMoneyAccountDepositAssetAddress,
  getSharesForWithdrawal,
} from '@metamask/money-account-utils';

/**
 * Contract tests for `@metamask/money-account-utils`.
 *
 * Every other Money suite mocks this package, so nothing in mobile CI executes
 * the real encoding path — a library regression (floor instead of ceiling
 * division, a wrong `minimumAssets`, a changed argument order) would ship with
 * a green suite. These tests deliberately do NOT mock the package: they drive
 * the real builders through a stub provider and decode the resulting calldata,
 * so mobile CI fails if the vault call shapes or the rounding ever change.
 *
 * They are the mobile-side half of the coverage that moved into the library
 * when the builders were extracted.
 */

const CHAIN_ID = '0x8f' as Hex;
const MUSD_ADDRESS = MUSD_TOKEN_ADDRESS_BY_CHAIN[CHAIN_ID];
const BORING_VAULT = '0xb4563bcd3b7764ccbf497f515585f70b6c3ea5ae' as Hex;
const TELLER = '0x2d49ea58a4c70b62c8b56de971310d9e999c8117' as Hex;
const ACCOUNTANT = '0x7382c5b8b51b8c4f127b3123c1039581baa5a06b' as Hex;
const LENS = '0xa816ecd922de94c6879ad23b9a884db257f20947' as Hex;
const MONEY_ACCOUNT = '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef' as Hex;
const RECIPIENT = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd' as Hex;
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

const ONE_SHARE = 1_000_000n;

const tellerInterface = new Interface(TELLER_ABI);
const erc20Interface = new Interface([
  'function approve(address spender, uint256 amount)',
  'function transfer(address to, uint256 amount)',
]);

/**
 * A minimal ethers v5 provider that answers every `eth_call` with a single
 * ABI-encoded uint256. Both vault reads the builders make (`previewDeposit` on
 * the lens, `getRate` on the accountant) return one uint256, so this is enough
 * to exercise the real contract wrappers without a network.
 * @param value - The uint256 the stubbed call returns.
 * @returns The stub provider and the underlying `call` mock.
 */
function stubProvider(value: bigint) {
  const call = jest
    .fn()
    .mockResolvedValue(defaultAbiCoder.encode(['uint256'], [value]));
  // `_isProvider` is how ethers v5 recognises a Provider.
  return { provider: { _isProvider: true, call } as never, call };
}

/**
 * Mirrors the teller's `mulDivDown(shares * rate / ONE_SHARE)` so the tests can
 * assert the invariant the ceiling division exists to protect.
 * @param shares - Vault shares being redeemed.
 * @param rate - The vault rate.
 * @returns The assets the teller would return.
 */
function assetsOutFor(shares: bigint, rate: bigint): bigint {
  return (shares * rate) / ONE_SHARE;
}

describe('money-account-utils contract', () => {
  it('agrees with the client on mUSD decimals', () => {
    // The wrappers convert human amounts with this constant before handing them
    // to the builders; a drift here misprices every deposit and withdrawal.
    expect(MUSD_DECIMALS).toBe(6);
  });

  it('resolves the deposit asset for the Money Account chain', () => {
    expect(getMoneyAccountDepositAssetAddress(CHAIN_ID)).toBe(MUSD_ADDRESS);
  });

  it('throws for a chain mUSD is not deployed on', () => {
    // Arbitrum — reachable if the remote vault config ever names a chain
    // without an mUSD deployment.
    expect(() => getMoneyAccountDepositAssetAddress('0xa4b1')).toThrow(
      'mUSD not deployed on chain 0xa4b1',
    );
  });

  describe('deposit batch', () => {
    const AMOUNT = 10_500_000n;
    const SHARES = 10_400_000n;

    it('encodes approve on mUSD and deposit on the teller', async () => {
      const { provider } = stubProvider(SHARES);

      const { approveTx, depositTx } = await buildMoneyAccountDepositBatch({
        amount: AMOUNT,
        chainId: CHAIN_ID,
        boringVault: BORING_VAULT,
        tellerAddress: TELLER,
        accountantAddress: ACCOUNTANT,
        lensAddress: LENS,
        provider,
      });

      expect(approveTx.type).toBe(TransactionType.tokenMethodApprove);
      expect(approveTx.params.to).toBe(MUSD_ADDRESS);
      expect(approveTx.params.value).toBe('0x0');
      const approveArgs = erc20Interface.decodeFunctionData(
        'approve',
        approveTx.params.data,
      );
      expect(approveArgs[0].toLowerCase()).toBe(BORING_VAULT);
      expect(approveArgs[1].toString()).toBe(AMOUNT.toString());

      expect(depositTx.type).toBe(TransactionType.moneyAccountDeposit);
      expect(depositTx.params.to).toBe(TELLER);
      expect(depositTx.params.value).toBe('0x0');
      const depositArgs = tellerInterface.decodeFunctionData(
        'deposit',
        depositTx.params.data,
      );
      expect(depositArgs[0].toLowerCase()).toBe(MUSD_ADDRESS);
      expect(depositArgs[1].toString()).toBe(AMOUNT.toString());
      // minimumMint is the previewed shares less the 0.2% slippage tolerance.
      expect(depositArgs[2].toString()).toBe(applySlippage(SHARES).toString());
      expect(depositArgs[3]).toBe(ZERO_ADDRESS);
    });

    it('previews the deposit against the lens before encoding', async () => {
      const { provider, call } = stubProvider(SHARES);

      await buildMoneyAccountDepositBatch({
        amount: AMOUNT,
        chainId: CHAIN_ID,
        boringVault: BORING_VAULT,
        tellerAddress: TELLER,
        accountantAddress: ACCOUNTANT,
        lensAddress: LENS,
        provider,
      });

      expect(call).toHaveBeenCalledTimes(1);
      const [{ to, data }] = call.mock.calls[0];
      expect(to.toLowerCase()).toBe(LENS);
      const previewArgs = new Interface([
        'function previewDeposit(address depositAsset, uint256 depositAmount, address boringVault, address accountant) view returns (uint256 shares)',
      ]).decodeFunctionData('previewDeposit', data);
      expect(previewArgs[0].toLowerCase()).toBe(MUSD_ADDRESS);
      expect(previewArgs[1].toString()).toBe(AMOUNT.toString());
      expect(previewArgs[2].toLowerCase()).toBe(BORING_VAULT);
      expect(previewArgs[3].toLowerCase()).toBe(ACCOUNTANT);
    });

    it('applies a 0.2% slippage tolerance to the previewed shares', () => {
      expect(applySlippage(1_000_000n)).toBe(998_000n);
      expect(applySlippage(0n)).toBe(0n);
      // Truncates rather than rounding, so minimumMint is never optimistic.
      expect(applySlippage(1_001n)).toBe(998n);
    });

    it('skips the vault read for a zero-amount batch', async () => {
      const { provider, call } = stubProvider(SHARES);

      const { depositTx } = await buildMoneyAccountDepositBatch({
        amount: 0n,
        chainId: CHAIN_ID,
        boringVault: BORING_VAULT,
        tellerAddress: TELLER,
        accountantAddress: ACCOUNTANT,
        lensAddress: LENS,
        provider,
      });

      expect(call).not.toHaveBeenCalled();
      const depositArgs = tellerInterface.decodeFunctionData(
        'deposit',
        depositTx.params.data,
      );
      expect(depositArgs[2].toString()).toBe('0');
    });
  });

  describe('deposit placeholder batch', () => {
    it('resolves targets and types without calldata or a provider', () => {
      const { approveTx, depositTx } = buildMoneyAccountDepositPlaceholderBatch(
        {
          chainId: CHAIN_ID,
          tellerAddress: TELLER,
        },
      );

      expect(approveTx).toStrictEqual({
        params: { to: MUSD_ADDRESS, value: '0x0' },
        type: TransactionType.tokenMethodApprove,
      });
      expect(depositTx).toStrictEqual({
        params: { to: TELLER, value: '0x0' },
        type: TransactionType.moneyAccountDeposit,
      });
    });
  });

  describe('withdraw batch', () => {
    const AMOUNT = 1_000_000n;
    const RATE = 1_000_000n;

    it('encodes withdraw on the teller and transfer on mUSD', async () => {
      const { provider } = stubProvider(RATE);

      const { withdrawTx, transferTx } = await buildMoneyAccountWithdrawBatch({
        amount: AMOUNT,
        chainId: CHAIN_ID,
        tellerAddress: TELLER,
        accountantAddress: ACCOUNTANT,
        moneyAccountAddress: MONEY_ACCOUNT,
        recipient: RECIPIENT,
        provider,
      });

      expect(withdrawTx.type).toBe(TransactionType.moneyAccountWithdraw);
      expect(withdrawTx.params.to).toBe(TELLER);
      expect(withdrawTx.params.value).toBe('0x0');
      const withdrawArgs = tellerInterface.decodeFunctionData(
        'withdraw',
        withdrawTx.params.data,
      );
      expect(withdrawArgs[0].toLowerCase()).toBe(MUSD_ADDRESS);
      expect(withdrawArgs[1].toString()).toBe(AMOUNT.toString());
      // 1-unit tolerance against the teller's mulDivDown truncation.
      expect(withdrawArgs[2].toString()).toBe((AMOUNT - 1n).toString());
      // The vault redeems to the money account, not straight to the user.
      expect(withdrawArgs[3].toLowerCase()).toBe(MONEY_ACCOUNT);

      // The second leg targets the token contract and pays the user the exact
      // amount they asked for — not the share amount, not the tolerance.
      expect(transferTx.type).toBe(TransactionType.tokenMethodTransfer);
      expect(transferTx.params.to).toBe(MUSD_ADDRESS);
      expect(transferTx.params.value).toBe('0x0');
      const transferArgs = erc20Interface.decodeFunctionData(
        'transfer',
        transferTx.params.data,
      );
      expect(transferArgs[0].toLowerCase()).toBe(RECIPIENT);
      expect(transferArgs[1].toString()).toBe(AMOUNT.toString());
    });

    it('reads the rate from the accountant', async () => {
      const { provider, call } = stubProvider(RATE);

      await buildMoneyAccountWithdrawBatch({
        amount: AMOUNT,
        chainId: CHAIN_ID,
        tellerAddress: TELLER,
        accountantAddress: ACCOUNTANT,
        moneyAccountAddress: MONEY_ACCOUNT,
        recipient: RECIPIENT,
        provider,
      });

      expect(call).toHaveBeenCalledTimes(1);
      const [{ to }] = call.mock.calls[0];
      expect(to.toLowerCase()).toBe(ACCOUNTANT);
    });

    it('skips the rate read and zeroes the bounds for a placeholder batch', async () => {
      const { provider, call } = stubProvider(RATE);

      const { withdrawTx, transferTx } = await buildMoneyAccountWithdrawBatch({
        amount: 0n,
        chainId: CHAIN_ID,
        tellerAddress: TELLER,
        accountantAddress: ACCOUNTANT,
        moneyAccountAddress: MONEY_ACCOUNT,
        recipient: RECIPIENT,
        provider,
      });

      expect(call).not.toHaveBeenCalled();
      const withdrawArgs = tellerInterface.decodeFunctionData(
        'withdraw',
        withdrawTx.params.data,
      );
      expect(withdrawArgs[1].toString()).toBe('0');
      expect(withdrawArgs[2].toString()).toBe('0');
      const transferArgs = erc20Interface.decodeFunctionData(
        'transfer',
        transferTx.params.data,
      );
      expect(transferArgs[1].toString()).toBe('0');
    });

    it('converts the amount to shares by ceiling division', async () => {
      // rate > 1:1, so shares < amount and the division has a remainder.
      const rate = 1_000_094n;
      const { provider } = stubProvider(rate);

      const { withdrawTx } = await buildMoneyAccountWithdrawBatch({
        amount: 1_960_000n,
        chainId: CHAIN_ID,
        tellerAddress: TELLER,
        accountantAddress: ACCOUNTANT,
        moneyAccountAddress: MONEY_ACCOUNT,
        recipient: RECIPIENT,
        provider,
      });

      const withdrawArgs = tellerInterface.decodeFunctionData(
        'withdraw',
        withdrawTx.params.data,
      );
      const shares = getSharesForWithdrawal(1_960_000n, rate);
      expect(withdrawArgs[0].toString()).toBeDefined();
      expect(withdrawArgs[1].toString()).toBe(shares.toString());
      // Floor division would give one share less, which is the regression the
      // ceiling exists to prevent.
      expect(shares).toBe((1_960_000n * ONE_SHARE) / rate + 1n);
    });
  });

  describe('getSharesForWithdrawal', () => {
    it('reproduces the reported $1.96 at rate ~1,000,094 scenario', () => {
      const amount = 1_960_000n;
      const rate = 1_000_094n;

      const shares = getSharesForWithdrawal(amount, rate);

      // Asserted against `amount`, not `minimumAssets` (amount - 1): floor
      // division lands exactly on amount - 1 for this case, so the weaker
      // bound passes by luck and misses the regression entirely.
      expect(assetsOutFor(shares, rate)).toBeGreaterThanOrEqual(amount);
    });

    it('is exact when the division has no remainder', () => {
      expect(getSharesForWithdrawal(1_000_000n, 1_000_000n)).toBe(1_000_000n);
      expect(getSharesForWithdrawal(2_000_000n, 2_000_000n)).toBe(1_000_000n);
    });

    it('returns 0 for a zero amount', () => {
      expect(getSharesForWithdrawal(0n, 1_000_094n)).toBe(0n);
    });

    it('keeps assetsOut >= amount across a sweep of rates', () => {
      const amounts = [1n, 999n, 1_000_000n, 1_960_000n, 123_456_789n];

      // Ceiling division makes `assetsOut >= amount` a hard guarantee, which is
      // what the teller's 1-unit `minimumAssets` tolerance sits on top of.
      // Floor division breaks this for any rate that leaves a remainder.
      for (let rate = 999_000n; rate <= 1_001_000n; rate += 7n) {
        for (const amount of amounts) {
          const shares = getSharesForWithdrawal(amount, rate);
          expect(assetsOutFor(shares, rate)).toBeGreaterThanOrEqual(amount);
        }
      }
    });
  });
});
