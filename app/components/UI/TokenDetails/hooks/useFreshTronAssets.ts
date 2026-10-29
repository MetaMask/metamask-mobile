import { useCallback, useEffect } from 'react';
import { useSelector } from 'react-redux';
import type { Transaction } from '@metamask/keyring-api';
import {
  KnownCaipNamespace,
  type CaipChainId,
  isCaipChainId,
  parseCaipChainId,
} from '@metamask/utils';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';
import { selectSelectedInternalAccount } from '../../../../selectors/accountsController';
import { selectIsAssetsUnifyStateEnabled } from '../../../../selectors/featureFlagController/assetsUnifyState';

const MULTICHAIN_TRANSACTION_CONFIRMED_EVENT =
  'MultichainTransactionsController:transactionConfirmed';

/**
 * Hook to force-refresh Tron assets (native TRX balance, energy, bandwidth
 * and staking informative assets) for the selected account on the given
 * Tron chain, using the unified AssetsController and bypassing both
 * client-side and server-side caches.
 *
 * The refresh can be triggered by the consumer (e.g. when the token details
 * page is focused). While the consumer is mounted, a confirmed Tron
 * transaction also triggers the same uncached refresh, keeping already-open
 * surfaces up to date.
 *
 * No-ops when the unified AssetsController feature flag is disabled or when
 * the chain is not Tron.
 *
 * @param chainId - The CAIP chain ID of the Tron network to refresh.
 * @returns A stable callback that triggers the uncached refresh.
 */
export const useFreshTronAssets = (
  chainId: string | undefined,
): (() => Promise<void>) => {
  const selectedAccount = useSelector(selectSelectedInternalAccount);
  const isAssetsUnifyStateEnabled = useSelector(
    selectIsAssetsUnifyStateEnabled,
  );

  const isTronChain =
    Boolean(chainId) &&
    isCaipChainId(chainId) &&
    parseCaipChainId(chainId).namespace === KnownCaipNamespace.Tron;

  const refresh = useCallback(async () => {
    if (!isAssetsUnifyStateEnabled || !selectedAccount?.id || !isTronChain) {
      return;
    }

    await Engine.context.AssetsController.getAssets([selectedAccount], {
      chainIds: [chainId as CaipChainId],
      forceUpdate: true,
      bypassServerCache: true,
    }).catch((error: unknown) =>
      Logger.error(
        error as Error,
        'useFreshTronAssets: AssetsController.getAssets failed',
      ),
    );
  }, [chainId, isAssetsUnifyStateEnabled, isTronChain, selectedAccount]);

  useEffect(() => {
    if (!isTronChain || !isAssetsUnifyStateEnabled || !selectedAccount?.id) {
      return undefined;
    }

    // Fresh data when a Tron transaction confirms while the page is open.
    const handleTransactionConfirmed = (transaction: Transaction) => {
      const isRelevantTransaction =
        transaction?.chain === chainId &&
        (transaction.account === selectedAccount.id ||
          transaction.from?.some(
            (from) => from.address === selectedAccount.address,
          ));

      if (isRelevantTransaction) {
        refresh().catch(() => undefined);
      }
    };

    Engine.controllerMessenger.subscribe(
      MULTICHAIN_TRANSACTION_CONFIRMED_EVENT,
      handleTransactionConfirmed,
    );

    return () => {
      Engine.controllerMessenger.unsubscribe(
        MULTICHAIN_TRANSACTION_CONFIRMED_EVENT,
        handleTransactionConfirmed,
      );
    };
  }, [
    chainId,
    isTronChain,
    isAssetsUnifyStateEnabled,
    selectedAccount,
    refresh,
  ]);

  return refresh;
};

export default useFreshTronAssets;
