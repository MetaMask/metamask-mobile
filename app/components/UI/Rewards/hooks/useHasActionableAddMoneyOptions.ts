import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { TransactionType } from '@metamask/transaction-controller';
import { useMMPayFiatConfig } from '../../../Views/confirmations/hooks/pay/useMMPayFiatConfig';
import { useRegionHasFiatProvider } from '../../Ramp/hooks/useRegionHasFiatProvider';
import { selectHasMoneyDepositAssetsMeetingMinimumBalance } from '../../Money/selectors/depositTokens';
import { useMoneyAccountDepositAssetId } from '../../Money/hooks/useMoneyAccountDepositAssetId';

/**
 * Whether `MoneyAddMoneySheet` would expose at least one pressable funding
 * option. Mirrors the sheet's own disable/hide gates:
 * - Convert crypto → eligible Money deposit assets
 * - Deposit funds → fiat deposit enabled + region provider
 * - Stablecoin quick deposit is covered by the eligible-assets check
 */
export function useHasActionableAddMoneyOptions(): boolean {
  const { enabledTransactionTypes } = useMMPayFiatConfig();
  const hasEligibleCryptoBalance = useSelector(
    selectHasMoneyDepositAssetsMeetingMinimumBalance,
  );
  const depositAssetId = useMoneyAccountDepositAssetId();
  const regionHasFiatProvider = useRegionHasFiatProvider(depositAssetId);

  return useMemo(() => {
    const canDepositFiat =
      enabledTransactionTypes.includes(TransactionType.moneyAccountDeposit) &&
      regionHasFiatProvider;

    return hasEligibleCryptoBalance || canDepositFiat;
  }, [
    enabledTransactionTypes,
    regionHasFiatProvider,
    hasEligibleCryptoBalance,
  ]);
}
