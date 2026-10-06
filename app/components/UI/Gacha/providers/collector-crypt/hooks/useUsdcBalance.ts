import { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../../../../../core/Engine';
import Logger from '../../../../../../util/Logger';
import { FUNGIBLE_ASSET_TYPES } from '../../../../../../core/Assets/accountGroupAssetLoader';
import { COLLECTOR_CRYPT_SCOPE } from '../constants';
import {
  getCollectorCryptUsdcAmount,
  selectCollectorCryptInternalAccount,
  selectCollectorCryptUsdcAmount,
} from '../selectors/account';
import { formatUsdcAmount, parseUsdcAmount } from '../utils/format';

export interface UsdcBalance {
  /** Balance in USDC base units (6 decimals). */
  baseUnits: bigint;
  /** Display amount without unit, e.g. "12.50". */
  formatted: string;
  /** Refreshes and returns the selected account's USDC balance; undefined on failure. */
  refresh: () => Promise<bigint | undefined>;
}

/** USDC balance of the selected Solana account. */
export const useUsdcBalance = (): UsdcBalance => {
  const account = useSelector(selectCollectorCryptInternalAccount);
  const amount = useSelector(selectCollectorCryptUsdcAmount);
  const baseUnits = useMemo(() => parseUsdcAmount(amount), [amount]);

  const refresh = useCallback(async (): Promise<bigint | undefined> => {
    if (!account) {
      return;
    }
    try {
      const { AssetsController } = Engine.context;
      await AssetsController.getAssets([account], {
        forceUpdate: true,
        bypassServerCache: true,
        chainIds: [COLLECTOR_CRYPT_SCOPE],
        assetTypes: FUNGIBLE_ASSET_TYPES,
      });
      // getAssets() omits hidden or metadata-less USDC. Read the raw balance
      // the header displays instead, from the controller (Redux lags behind).
      return parseUsdcAmount(
        getCollectorCryptUsdcAmount(
          AssetsController.state.assetsBalance,
          account.id,
        ),
      );
    } catch (error) {
      Logger.log('CollectorCrypt: USDC balance refresh failed', error);
    }
  }, [account]);

  return useMemo(
    () => ({ baseUnits, formatted: formatUsdcAmount(baseUnits), refresh }),
    [baseUnits, refresh],
  );
};
