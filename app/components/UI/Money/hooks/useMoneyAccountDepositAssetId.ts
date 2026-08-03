import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import type { CaipAssetType } from '@metamask/utils';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import {
  getMoneyAccountDepositAssetId,
  MUSD_TOKEN_ASSET_ID_BY_CHAIN,
} from '@metamask/money-account-utils';
import { selectMoneyAccountVaultConfig } from '../../../../selectors/featureFlagController/moneyAccount';

/**
 * Resolves the CAIP-19 asset id of the Money Account deposit asset (mUSD) from
 * the same vault config the deposit flow uses, so entry-point gating checks the
 * exact asset the deposit targets.
 *
 * Money Account is Monad-only today, so this falls back to the Monad mUSD asset
 * id when no vault config is available or the configured chain has no mUSD
 * deployment. The shared resolver returns `undefined` in those cases; the
 * Monad default is a client policy, applied here.
 * The result is memoized on the vault chain id.
 * @returns The CAIP-19 asset id of the deposit asset for the active vault chain.
 */
export function useMoneyAccountDepositAssetId(): CaipAssetType {
  const vaultConfig = useSelector(selectMoneyAccountVaultConfig);

  return useMemo(
    () =>
      getMoneyAccountDepositAssetId(vaultConfig?.chainId) ??
      MUSD_TOKEN_ASSET_ID_BY_CHAIN[CHAIN_IDS.MONAD],
    [vaultConfig?.chainId],
  );
}

export default useMoneyAccountDepositAssetId;
