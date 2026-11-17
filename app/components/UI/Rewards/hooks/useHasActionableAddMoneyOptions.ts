import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { TransactionType } from '@metamask/transaction-controller';
import { useMusdBalance } from '../../Earn/hooks/useMusdBalance';
import { useMMPayFiatConfig } from '../../../Views/confirmations/hooks/pay/useMMPayFiatConfig';
import { useRegionHasFiatProvider } from '../../Ramp/hooks/useRegionHasFiatProvider';
import { selectHasAnyNonZeroTokenBalance } from '../../../../selectors/tokenBalancesController';
import { useMoneyAccountDepositAssetId } from '../../Money/hooks/useMoneyAccountDepositAssetId';

/**
 * Whether `MoneyAddMoneySheet` would expose at least one pressable funding
 * option. Mirrors the sheet's own disable/hide gates:
 * - Convert crypto → non-zero token balance
 * - Deposit funds → fiat deposit enabled + region provider
 * - Move / add mUSD → mUSD balance, or fiat deposit fallback
 */
export function useHasActionableAddMoneyOptions(): boolean {
  const { fiatBalanceAggregated, hasMusdBalanceOnAnyChain } = useMusdBalance();
  const { enabledTransactionTypes } = useMMPayFiatConfig();
  const hasAnyCryptoBalance = useSelector(selectHasAnyNonZeroTokenBalance);
  const depositAssetId = useMoneyAccountDepositAssetId();
  const regionHasFiatProvider = useRegionHasFiatProvider(depositAssetId);

  return useMemo(() => {
    const canDepositFiat =
      enabledTransactionTypes.includes(TransactionType.moneyAccountDeposit) &&
      regionHasFiatProvider;

    const parsedMusdFiat = Number(fiatBalanceAggregated);
    const hasParsedFiatBalance =
      Number.isFinite(parsedMusdFiat) && parsedMusdFiat > 0;
    const hasMusdBalance = hasMusdBalanceOnAnyChain || hasParsedFiatBalance;

    return hasAnyCryptoBalance || canDepositFiat || hasMusdBalance;
  }, [
    enabledTransactionTypes,
    regionHasFiatProvider,
    fiatBalanceAggregated,
    hasMusdBalanceOnAnyChain,
    hasAnyCryptoBalance,
  ]);
}
