import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import type { Caip19AssetId } from '@metamask/assets-controller';
import type { InternalAccount } from '@metamask/keyring-internal-api';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';
import { selectSelectedAccountGroupEvmInternalAccount } from '../../../../selectors/multichainAccounts/accountTreeController';
import { MUSD_TOKEN_ASSET_ID_BY_CHAIN } from '../../Earn/constants/musd';

// Module scoped promise to avoid multiple concurrent refreshes
let refreshMusdFiatRatePromise: Promise<void> | undefined;

const LOG_PREFIX = '[useRefreshMusdFiatRate]';

const doRefreshMusdFiatRate = async (
  selectedEvmAccount: InternalAccount | null,
): Promise<void> => {
  Logger.log(`${LOG_PREFIX} refreshing mUSD fiat rate`);

  if (!selectedEvmAccount) return;

  await Engine.context.AssetsController.syncAssetsPrices([
    MUSD_TOKEN_ASSET_ID_BY_CHAIN[CHAIN_IDS.MONAD] as Caip19AssetId,
  ]).catch((error: unknown) =>
    Logger.error(error as Error, {
      message: `${LOG_PREFIX} mUSD price refresh failed`,
    }),
  );
};

/**
 * Returns a stable callback that refreshes the mUSD fiat conversion rate
 * via `AssetsController`.
 *
 * Multiple concurrent callers share a single in-flight promise so the
 * underlying controller is called only once per missing-rate episode.
 * After the promise settles, a subsequent missing-rate trigger may retry.
 */
const useRefreshMusdFiatRate = (): (() => Promise<void>) => {
  const selectedEvmAccount = useSelector(
    selectSelectedAccountGroupEvmInternalAccount,
  );

  return useCallback((): Promise<void> => {
    if (refreshMusdFiatRatePromise) {
      return refreshMusdFiatRatePromise;
    }

    try {
      refreshMusdFiatRatePromise = doRefreshMusdFiatRate(selectedEvmAccount)
        .catch((error: unknown) => {
          Logger.error(error as Error, {
            message: `${LOG_PREFIX} mUSD price refresh threw`,
          });
        })
        .finally(() => {
          refreshMusdFiatRatePromise = undefined;
        });

      return refreshMusdFiatRatePromise;
    } catch (error) {
      Logger.error(error as Error, {
        message: `${LOG_PREFIX} mUSD price refresh threw`,
      });
      return Promise.resolve();
    }
  }, [selectedEvmAccount]);
};

export default useRefreshMusdFiatRate;
