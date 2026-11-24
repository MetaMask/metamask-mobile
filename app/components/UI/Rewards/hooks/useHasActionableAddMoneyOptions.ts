import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { TransactionType } from '@metamask/transaction-controller';
import { useMMPayFiatConfig } from '../../../Views/confirmations/hooks/pay/useMMPayFiatConfig';
import { useRegionHasFiatProvider } from '../../Ramp/hooks/useRegionHasFiatProvider';
import { selectHasAnyNonZeroTokenBalance } from '../../../../selectors/tokenBalancesController';
import { useMoneyAccountDepositAssetId } from '../../Money/hooks/useMoneyAccountDepositAssetId';

/**
 * Whether `MoneyAddMoneySheet` would expose at least one pressable funding
 * option. Mirrors the sheet's own disable/hide gates:
 * - Convert crypto → non-zero token balance
 * - Deposit funds → fiat deposit enabled + region provider
 * - Stablecoin quick deposit is covered by the token-balance check
 */
export function useHasActionableAddMoneyOptions(): boolean {
  const { enabledTransactionTypes } = useMMPayFiatConfig();
  const hasAnyCryptoBalance = useSelector(selectHasAnyNonZeroTokenBalance);
  const depositAssetId = useMoneyAccountDepositAssetId();
  const regionHasFiatProvider = useRegionHasFiatProvider(depositAssetId);

  return useMemo(() => {
    const canDepositFiat =
      enabledTransactionTypes.includes(TransactionType.moneyAccountDeposit) &&
      regionHasFiatProvider;

    return hasAnyCryptoBalance || canDepositFiat;
  }, [enabledTransactionTypes, regionHasFiatProvider, hasAnyCryptoBalance]);
}
