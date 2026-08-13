import { BigNumber } from 'bignumber.js';
import { useSelector } from 'react-redux';
import {
  TransactionMeta,
  TransactionType,
  hasTransactionType,
} from '@metamask/transaction-controller';
import { PaymentOverride } from '@metamask/transaction-pay-controller';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { useTransactionPayToken } from './useTransactionPayToken';
import { useTokenFiatRate } from '../tokens/useTokenFiatRates';
import { getTokenAddress } from '../../utils/transaction-pay';
import { usePredictBalance } from '../../../../UI/Predict/hooks/usePredictBalance';
import useMoneyAccountBalance from '../../../../UI/Money/hooks/useMoneyAccountBalance';
import { usePayTokenAccountBalance } from './usePayTokenAccountBalance';
import {
  MUSD_CONVERSION_DEFAULT_CHAIN_ID,
  MUSD_DECIMALS,
  MUSD_TOKEN_ADDRESS,
} from '../../../../UI/Earn/constants/musd';
import { selectPerpsAccountState } from '../../../../UI/Perps/selectors/perpsController';
import { RootState } from '../../../../../reducers';
import { selectPaymentOverrideByTransactionId } from '../../../../../selectors/transactionPayController';

/** Balance a MetaMask Pay transaction can draw from, in display units. */
export interface TransactionPayBalance {
  /** Balance in a human-readable format factoring token decimals. */
  balanceHuman: string;
  /** Balance in the selected currency (USD by default). */
  balanceUsd: number;
  /** Balance in the smallest units of the source token (on-chain units). */
  balanceRaw: string;
}

const ZERO: TransactionPayBalance = {
  balanceHuman: '0',
  balanceUsd: 0,
  balanceRaw: '0',
};

/** USDC decimals — the denomination of perps (HyperLiquid) and predict balances. */
const USDC_DECIMALS = 6;

/** Raw on-chain units for a human balance, shifted by the source decimals. */
function toRaw(balanceHuman: BigNumber.Value, decimals: number): string {
  return new BigNumber(balanceHuman)
    .shiftedBy(decimals)
    .integerValue(BigNumber.ROUND_DOWN)
    .toString(10);
}

/**
 * Single UI source of truth for the balance a MetaMask Pay transaction can draw
 * from, returned in display units (`balanceHuman` + `balanceUsd`).
 *
 * Resolves the correct source for every Pay flow whose balance is not the plain
 * pay-token wallet balance:
 * - Perps withdraw — HyperLiquid withdrawable balance (USDC, 1:1 USD).
 * - Money-account withdraw — mUSD + vmUSD redeemable.
 * - Predict withdraw — Polymarket balance (USDC).
 * - MoneyAccount payment override — mUSD + vmUSD redeemable.
 * - Everything else — the selected pay-token wallet balance.
 *
 * This is the read-path counterpart to the atomic `getBalance` callback that
 * feeds `updateSourceAmounts`; both apply the same per-flow predicate but stay
 * decoupled. Unlike the callback, this hook is reactive: it re-renders when any
 * underlying balance source changes.
 *
 * @param options - Hook options.
 * @param options.currency - Currency for the fiat balance. Defaults to USD.
 * @returns The resolved balance in display units.
 */
export function useTransactionPayBalance({
  currency,
}: { currency?: string } = {}): TransactionPayBalance {
  const transactionMeta = useTransactionMetadataRequest() as TransactionMeta;
  const { chainId, id: transactionId } = transactionMeta ?? {
    chainId: undefined,
    id: '',
  };

  const { payToken } = useTransactionPayToken();

  const tokenAddress = getTokenAddress(transactionMeta);
  const payTokenFiatRate = useTokenFiatRate(tokenAddress, chainId, currency);
  const musdFiatRate =
    useTokenFiatRate(
      MUSD_TOKEN_ADDRESS,
      MUSD_CONVERSION_DEFAULT_CHAIN_ID,
      currency,
    ) ?? 1;

  const isMoneyAccountWithdraw = hasTransactionType(transactionMeta, [
    TransactionType.moneyAccountWithdraw,
  ]);
  const tokenFiatRate = isMoneyAccountWithdraw
    ? musdFiatRate
    : payTokenFiatRate;

  const perpsAccountState = useSelector(selectPerpsAccountState);
  const { data: predictBalanceHuman = 0 } = usePredictBalance();
  const { withdrawableMusd, withdrawableFiatRaw } = useMoneyAccountBalance();
  const paymentOverride = useSelector((state: RootState) =>
    selectPaymentOverrideByTransactionId(state, transactionId),
  );
  // Reactive on-chain wallet balance for the default (deposit) flow.
  const { balanceUsd: walletBalanceUsd, balanceRaw: walletBalanceRaw } =
    usePayTokenAccountBalance();

  if (hasTransactionType(transactionMeta, [TransactionType.perpsWithdraw])) {
    const withdrawableBalance = perpsAccountState?.withdrawableBalance;
    if (!withdrawableBalance) {
      return ZERO;
    }
    // HyperLiquid balance is USDC, so USD equals the human balance 1:1.
    return {
      balanceHuman: withdrawableBalance,
      balanceUsd: new BigNumber(withdrawableBalance).toNumber(),
      balanceRaw: toRaw(withdrawableBalance, USDC_DECIMALS),
    };
  }

  if (isMoneyAccountWithdraw) {
    // Only vmUSD shares (converted via vault rate) are withdrawable through the
    // teller — bare mUSD in the account is not part of this flow.
    if (withdrawableMusd === undefined) {
      return ZERO;
    }
    return {
      balanceHuman: withdrawableMusd.toString(10),
      balanceUsd: tokenFiatRate
        ? withdrawableMusd.multipliedBy(tokenFiatRate).toNumber()
        : 0,
      balanceRaw: toRaw(withdrawableMusd, MUSD_DECIMALS),
    };
  }

  if (hasTransactionType(transactionMeta, [TransactionType.predictWithdraw])) {
    const human = new BigNumber(predictBalanceHuman ?? '0');
    return {
      balanceHuman: human.toString(10),
      balanceUsd: tokenFiatRate
        ? human.multipliedBy(tokenFiatRate).toNumber()
        : 0,
      balanceRaw: toRaw(human, USDC_DECIMALS),
    };
  }

  if (paymentOverride === PaymentOverride.MoneyAccount) {
    if (!withdrawableFiatRaw) {
      return ZERO;
    }
    // withdrawableFiatRaw is already a fiat (USD) value; mUSD is a USD
    // stablecoin, so the human balance equals it 1:1. ROUND_DOWN to cents so
    // Max/percentage math never sets an amount above the spendable balance
    // after display rounding.
    const usd = new BigNumber(withdrawableFiatRaw).decimalPlaces(
      2,
      BigNumber.ROUND_DOWN,
    );
    return {
      balanceHuman: usd.toString(10),
      balanceUsd: usd.toNumber(),
      balanceRaw: toRaw(usd, MUSD_DECIMALS),
    };
  }

  return {
    balanceHuman: payToken?.balanceHuman ?? '0',
    balanceUsd: new BigNumber(walletBalanceUsd ?? 0).toNumber(),
    balanceRaw: walletBalanceRaw ?? '0',
  };
}
