import { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../../../../reducers';
import Engine from '../../../../../../core/Engine';
import Logger from '../../../../../../util/Logger';
import { FUNGIBLE_ASSET_TYPES } from '../../../../../../core/Assets/accountGroupAssetLoader';
import { COLLECTOR_CRYPT_SCOPE, SOLANA_USDC_ASSET_ID } from '../constants';
import { formatUsdcAmount, parseUsdcAmount } from '../utils/format';
import { selectCollectorCryptInternalAccount } from './useCollectorCryptAccount';

/** Raw USDC amount of an account from the unified AssetsController state. */
const selectUsdcAmount = (
  state: RootState,
  accountId: string | undefined,
): string | undefined =>
  accountId
    ? state.engine.backgroundState.AssetsController?.assetsBalance?.[
        accountId
      ]?.[SOLANA_USDC_ASSET_ID]?.amount
    : undefined;

export interface UsdcBalance {
  /** Balance in USDC base units (6 decimals). */
  baseUnits: bigint;
  /** Display amount without unit, e.g. "12.50". */
  formatted: string;
  /** Force-refreshes the Solana balances (after a purchase or a sale). */
  refresh: () => Promise<void>;
}

/** USDC balance of the selected Solana account. */
export const useUsdcBalance = (): UsdcBalance => {
  const account = useSelector(selectCollectorCryptInternalAccount);
  const amount = useSelector((state: RootState) =>
    selectUsdcAmount(state, account?.id),
  );
  const baseUnits = useMemo(() => parseUsdcAmount(amount), [amount]);

  const refresh = useCallback(async (): Promise<void> => {
    if (!account) {
      return;
    }
    try {
      await Engine.context.AssetsController.getAssets([account], {
        forceUpdate: true,
        bypassServerCache: true,
        chainIds: [COLLECTOR_CRYPT_SCOPE],
        assetTypes: FUNGIBLE_ASSET_TYPES,
      });
    } catch (error) {
      Logger.log('CollectorCrypt: USDC balance refresh failed', error);
    }
  }, [account]);

  return useMemo(
    () => ({ baseUnits, formatted: formatUsdcAmount(baseUnits), refresh }),
    [baseUnits, refresh],
  );
};
