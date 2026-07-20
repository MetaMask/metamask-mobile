import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { toEvmCaipChainId } from '@metamask/multichain-network-controller';
import type { Caip19AssetId } from '@metamask/assets-controller';
import type { InternalAccount } from '@metamask/keyring-internal-api';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';
import { selectIsAssetsUnifyStateEnabled } from '../../../../selectors/featureFlagController/assetsUnifyState';
import { selectSelectedAccountGroupEvmInternalAccount } from '../../../../selectors/multichainAccounts/accountTreeController';
import { selectNetworkConfigurations } from '../../../../selectors/networkController';
import { MUSD_TOKEN_ASSET_ID_BY_CHAIN } from '../../Earn/constants/musd';
import { CHAIN_IDS } from '@metamask/transaction-controller';

// Module scoped promise to avoid multiple concurrent refreshes
let refreshMusdFiatRatePromise: Promise<void> | undefined;

const LOG_PREFIX = '[useRefreshMusdFiatRate]';

const doRefreshMusdFiatRate = async (
  isAssetsUnifyStateEnabled: boolean,
  selectedEvmAccount: InternalAccount | null,
  legacyRateNativeCurrency: string | undefined,
): Promise<void> => {
  Logger.log(`${LOG_PREFIX} refreshing mUSD fiat rate`);

  if (isAssetsUnifyStateEnabled) {
    if (!selectedEvmAccount) return;
    await Engine.context.AssetsController.getAssets([selectedEvmAccount], {
      chainIds: [toEvmCaipChainId(CHAIN_IDS.MONAD)],
      dataTypes: ['price'],
      forceUpdate: true,
      assetsForPriceUpdate: [
        MUSD_TOKEN_ASSET_ID_BY_CHAIN[CHAIN_IDS.MONAD] as Caip19AssetId,
      ],
    }).catch((error: unknown) =>
      Logger.error(error as Error, {
        message: `${LOG_PREFIX} mUSD price refresh (unified) failed`,
      }),
    );
    return;
  }

  if (!legacyRateNativeCurrency) {
    Logger.error(
      new Error(`${LOG_PREFIX} Legacy rate native currency is missing`),
      {
        message: `${LOG_PREFIX} mUSD price refresh (legacy) failed`,
      },
    );
    return;
  }

  await Engine.context.TokenRatesController.updateExchangeRates([
    {
      chainId: CHAIN_IDS.MONAD,
      nativeCurrency: legacyRateNativeCurrency,
    },
  ]).catch((error: unknown) =>
    Logger.error(error as Error, {
      message: `${LOG_PREFIX} mUSD price refresh (legacy) failed`,
    }),
  );
};

/**
 * Returns a stable callback that refreshes the mUSD fiat conversion rate
 * for the active pricing architecture (unified or legacy).
 *
 * Multiple concurrent callers share a single in-flight promise so the
 * underlying controller is called only once per missing-rate episode.
 * After the promise settles, a subsequent missing-rate trigger may retry.
 */
const useRefreshMusdFiatRate = (): (() => Promise<void>) => {
  const isAssetsUnifyStateEnabled = useSelector(
    selectIsAssetsUnifyStateEnabled,
  );

  const selectedEvmAccount = useSelector(
    selectSelectedAccountGroupEvmInternalAccount,
  );
  const networkConfigurations = useSelector(selectNetworkConfigurations);
  const legacyRateNativeCurrency =
    networkConfigurations?.[CHAIN_IDS.MONAD]?.nativeCurrency;

  return useCallback((): Promise<void> => {
    if (refreshMusdFiatRatePromise) {
      return refreshMusdFiatRatePromise;
    }

    try {
      refreshMusdFiatRatePromise = doRefreshMusdFiatRate(
        isAssetsUnifyStateEnabled,
        selectedEvmAccount,
        legacyRateNativeCurrency,
      )
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
  }, [isAssetsUnifyStateEnabled, selectedEvmAccount, legacyRateNativeCurrency]);
};

export default useRefreshMusdFiatRate;
