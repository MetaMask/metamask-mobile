import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import type { CaipAssetType, Hex } from '@metamask/utils';
import { selectMoneyAccountVaultConfig } from '../../../../selectors/featureFlagController/moneyAccount';
import { getMoneyAccountDepositAssetId } from '../utils/moneyAccountTransactions';

/**
 * Resolves the CAIP-19 asset id of the Money Account deposit asset (mUSD) from
 * the same vault config the deposit flow uses, so entry-point gating checks the
 * exact asset the deposit targets.
 *
 * Money Account is Monad-only today, so this falls back to the Monad mUSD asset
 * id when no vault config is available (see `getMoneyAccountDepositAssetId`).
 * The result is memoized on the vault chain id.
 * @returns The CAIP-19 asset id of the deposit asset for the active vault chain.
 */
export function useMoneyAccountDepositAssetId(): CaipAssetType {
  const vaultConfig = useSelector(selectMoneyAccountVaultConfig);

  return useMemo(
    () => getMoneyAccountDepositAssetId(vaultConfig?.chainId as Hex),
    [vaultConfig?.chainId],
  );
}

export default useMoneyAccountDepositAssetId;
