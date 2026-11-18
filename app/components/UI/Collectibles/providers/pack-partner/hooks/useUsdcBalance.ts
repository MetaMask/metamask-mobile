import { useQuery } from '@tanstack/react-query';
import { useNetworkTier } from '../../../../../../hooks/useNetworkTier';
import { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../../../../../core/Engine';
import Logger from '../../../../../../util/Logger';
import { FUNGIBLE_ASSET_TYPES } from '../../../../../../core/Assets/accountGroupAssetLoader';
import { PACK_PARTNER_SCOPE } from '../constants/packPartner';
import { PACK_PARTNER_ENVIRONMENT } from '../constants/environment';
import {
  getPackPartnerUsdcAmount,
  selectPackPartnerInternalAccount,
  selectPackPartnerUsdcAmount,
} from '../selectors/account';
import { formatUsdcAmount, parseUsdcAmount } from '../utils/format';
import { readDevnetUsdcBalance } from '../services/devnetBalance';

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
  const account = useSelector(selectPackPartnerInternalAccount);
  const amount = useSelector(selectPackPartnerUsdcAmount);
  const networkTier = useNetworkTier();
  const isDevnet = PACK_PARTNER_ENVIRONMENT === 'devnet';
  const devnetBalance = useQuery({
    queryKey: [
      'packPartner',
      PACK_PARTNER_ENVIRONMENT,
      'usdc',
      account?.id,
      account?.address,
    ],
    queryFn: () =>
      account ? readDevnetUsdcBalance(account.address) : Promise.resolve('0'),
    enabled: isDevnet && Boolean(account) && networkTier !== 'NONE',
    staleTime: 15_000,
    retry: 1,
  });
  const baseUnits = useMemo(
    () =>
      isDevnet ? BigInt(devnetBalance.data ?? '0') : parseUsdcAmount(amount),
    [amount, isDevnet, devnetBalance.data],
  );

  const { refetch: refreshDevnetBalance } = devnetBalance;
  const refresh = useCallback(async (): Promise<bigint | undefined> => {
    if (!account || networkTier === 'NONE') {
      return;
    }
    try {
      if (isDevnet) {
        const result = await refreshDevnetBalance();
        return result.isError || result.data === undefined
          ? undefined
          : BigInt(result.data);
      }
      const { AssetsController } = Engine.context;
      await AssetsController.getAssets([account], {
        forceUpdate: true,
        bypassServerCache: true,
        chainIds: [PACK_PARTNER_SCOPE],
        assetTypes: FUNGIBLE_ASSET_TYPES,
      });
      // getAssets() omits hidden or metadata-less USDC. Read the raw balance
      // the header displays instead, from the controller (Redux lags behind).
      return parseUsdcAmount(
        getPackPartnerUsdcAmount(
          AssetsController.state.assetsBalance,
          account.id,
        ),
      );
    } catch (error) {
      Logger.log('PackPartner: USDC balance refresh failed', error);
    }
  }, [account, networkTier, isDevnet, refreshDevnetBalance]);

  return useMemo(
    () => ({ baseUnits, formatted: formatUsdcAmount(baseUnits), refresh }),
    [baseUnits, refresh],
  );
};
