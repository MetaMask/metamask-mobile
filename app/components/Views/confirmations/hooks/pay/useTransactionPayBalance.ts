import {
  TransactionMeta,
  TransactionType,
  hasTransactionType,
} from '@metamask/transaction-controller';
import { PaymentOverride } from '@metamask/transaction-pay-controller';
import { BigNumber } from 'bignumber.js';
import { useSelector } from 'react-redux';
import { MUSD_DECIMALS } from '../../../../UI/Earn/constants/musd';
import { usePredictBalance as usePredictControllerBalance } from '../../../../UI/Predict/hooks/usePredictBalance';
import { selectPerpsAccountState } from '../../../../UI/Perps/selectors/perpsController';
import {
  getUsableMoneyAccountRedeemableRaw,
  selectMoneyAccountRedeemable,
} from '../../../../../core/redux/slices/moneyBalance';
import { RootState } from '../../../../../reducers';
import { selectPrimaryMoneyAccount } from '../../../../../selectors/moneyAccountController';
import { selectPaymentOverrideByTransactionId } from '../../../../../selectors/transactionPayController';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { usePayTokenAccountBalance } from './usePayTokenAccountBalance';

/** USDC decimals — the denomination of perps (HyperLiquid) and predict balances. */
const USDC_DECIMALS = 6;

const ZERO: TransactionPayBalance = {
  balanceRaw: '0',
  balanceUsd: 0,
};

/** Balance a MetaMask Pay transaction can draw from. */
export interface TransactionPayBalance {
  /** Balance in the smallest units of the source token (on-chain units). */
  balanceRaw: string;
  /** Balance in the selected currency (USD by default). */
  balanceUsd: number;
}

/**
 * Single UI source of truth for the balance a MetaMask Pay transaction can draw
 * from.
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
  currency: _currency,
}: { currency?: string } = {}): TransactionPayBalance {
  const transactionMeta = useTransactionMetadataRequest() as TransactionMeta;
  const { id: transactionId } = transactionMeta ?? { id: '' };

  const paymentOverride = useSelector((state: RootState) =>
    selectPaymentOverrideByTransactionId(state, transactionId),
  );

  const moneyAccountBalance = useMoneyAccountBalance();
  const perpsBalance = usePerpsBalance();
  const predictBalance = usePredictBalance();
  const tokenBalance = useTokenBalance();

  if (hasTransactionType(transactionMeta, [TransactionType.perpsWithdraw])) {
    return perpsBalance;
  }

  if (hasTransactionType(transactionMeta, [TransactionType.predictWithdraw])) {
    return predictBalance;
  }

  if (
    hasTransactionType(transactionMeta, [
      TransactionType.moneyAccountWithdraw,
    ]) ||
    paymentOverride === PaymentOverride.MoneyAccount
  ) {
    return moneyAccountBalance;
  }

  return tokenBalance;
}

function useMoneyAccountBalance(): TransactionPayBalance {
  const redeemable = useSelector(selectMoneyAccountRedeemable);
  const activeAddress = useSelector(selectPrimaryMoneyAccount)?.address;
  const withdrawableMusdRaw = getUsableMoneyAccountRedeemableRaw(
    redeemable,
    activeAddress,
  );

  if (!withdrawableMusdRaw) {
    return ZERO;
  }

  const balanceUsd = fromRaw(withdrawableMusdRaw, MUSD_DECIMALS);

  return {
    balanceRaw: withdrawableMusdRaw,
    balanceUsd: balanceUsd.toNumber(),
  };
}

function usePerpsBalance(): TransactionPayBalance {
  const perpsAccountState = useSelector(selectPerpsAccountState);
  const withdrawableBalance = perpsAccountState?.withdrawableBalance;

  if (!withdrawableBalance) {
    return ZERO;
  }

  // HyperLiquid balance is USDC, so USD equals the human balance 1:1.
  return {
    balanceRaw: toRaw(withdrawableBalance, USDC_DECIMALS),
    balanceUsd: new BigNumber(withdrawableBalance).toNumber(),
  };
}

function usePredictBalance(): TransactionPayBalance {
  const { data: predictBalanceHuman = 0 } = usePredictControllerBalance();
  const human = new BigNumber(predictBalanceHuman ?? '0');

  return {
    balanceRaw: toRaw(human, USDC_DECIMALS),
    balanceUsd: human.toNumber(),
  };
}

function useTokenBalance(): TransactionPayBalance {
  const { balanceRaw: walletBalanceRaw, balanceUsd: walletBalanceUsd } =
    usePayTokenAccountBalance();

  return {
    balanceRaw: walletBalanceRaw ?? '0',
    balanceUsd: new BigNumber(walletBalanceUsd ?? 0).toNumber(),
  };
}

function fromRaw(balanceRaw: string, decimals: number): BigNumber {
  return new BigNumber(balanceRaw).shiftedBy(-decimals);
}

/** Raw on-chain units for a human balance, shifted by the source decimals. */
function toRaw(balanceHuman: BigNumber.Value, decimals: number): string {
  return new BigNumber(balanceHuman)
    .shiftedBy(decimals)
    .integerValue(BigNumber.ROUND_DOWN)
    .toString(10);
}
