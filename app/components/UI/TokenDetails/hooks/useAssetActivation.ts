///: BEGIN:ONLY_INCLUDE_IF(stellar)
import { errorCodes } from '@metamask/rpc-errors';
import type { InternalAccount } from '@metamask/keyring-internal-api';
import { useCallback, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  CaipAssetId,
  type CaipChainId,
  isCaipAssetType,
} from '@metamask/utils';
import { strings } from '../../../../../locales/i18n';
import type { RootState } from '../../../../reducers';
import { selectSelectedInternalAccountByScope } from '../../../../selectors/multichainAccounts/accounts';
import type { TokenI } from '../../Tokens/types';
import {
  isAssetRequireActivate,
  isTrustlineAsset,
} from '../../../../util/multichain/trustline';
import { refreshStellarAccountAssets } from '../../../../util/stellar/refresh-stellar-account-assets';
import {
  requestStellarChangeTrustOptAdd,
  requestStellarChangeTrustOptDelete,
} from '../../../../util/stellar/stellar-snap-client-requests';
import { selectMultichainBalances } from '../../../../selectors/multichain/multichain';

/**
 * Manages asset activation and deactivation for supported trustline assets.
 */
export function useAssetActivation({
  asset,
  onTrustlineChanged,
}: {
  asset: TokenI | undefined;
  onTrustlineChanged?: () => void;
}) {
  const selectAccountByScope = useSelector(
    selectSelectedInternalAccountByScope,
  );

  // For non trusline asset, assetId and chainId are undefined.
  let assetId: CaipAssetId | undefined;
  let chainId: CaipChainId | undefined;
  let isAssetIsTrustlineAsset: boolean = false;
  if (asset) {
    assetId = asset.address as CaipAssetId;
    isAssetIsTrustlineAsset = isTrustlineAsset(assetId);
    if (isAssetIsTrustlineAsset) {
      chainId = asset.chainId as CaipChainId;
    }
  }

  const account = chainId ? selectAccountByScope(chainId) : undefined;

  const balances = useSelector((state: RootState) =>
    selectMultichainBalances(state)
  );
  const assetMetadata =  balances?.[account?.id ?? '']?.[assetId as CaipAssetId]
    ?.accountAssetInfo

  const [isDeactivating, setIsDeactivating] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const dismissErrorMessage = useCallback(() => {
    setErrorMessage(null);
  }, []);

  const canDeactivate =
    Boolean(assetId) &&
    isAssetIsTrustlineAsset &&
    !isAssetRequireActivate({
      assetId,
      assetMetadata,
    });

  const deactivateAsset = useCallback(async (): Promise<boolean> => {
    if (
      !canDeactivate ||
      !account ||
      !chainId ||
      !assetId ||
      !isCaipAssetType(assetId) ||
      !asset
    ) {
      return false;
    }

    const balanceValue = Number.parseFloat(token.balance || '0');
    const hasNonZeroBalance = Number.isFinite(balanceValue)
      ? balanceValue > 0
      : false;

    setErrorMessage(null);
    setIsDeactivating(true);
    try {
      await requestStellarChangeTrustOptDelete({
        accountId: account.id,
        assetId,
        scope: chainId,
      });
      await refreshStellarAccountAssets({
        account,
        chainId,
        assetId,
        trustlineAction: 'remove',
      });
      onTrustlineChanged?.();
      return true;
    } catch (error: unknown) {
      const errorCode = (error as { code?: number })?.code;
      const isUserRejection =
        errorCode === errorCodes.provider.userRejectedRequest;
      if (!isUserRejection) {
        setErrorMessage(
          hasNonZeroBalance
            ? strings('asset_activation.deactivate_error_non_zero_balance_stellar', {
                balance: asset.balance,
                symbol: asset.symbol,
              })
            : strings('asset_activation.deactivate_error'),
        );
      }
      return false;
    } finally {
      setIsDeactivating(false);
    }
  }, [
    account,
    assetId,
    canDeactivate,
    chainId,
    onTrustlineChanged,
    asset,
  ]);

  const activateAsset = useCallback(async () => {
    if (
      !account ||
      !chainId ||
      !assetId ||
      !isCaipAssetType(assetId)
    ) {
      return;
    }

    setErrorMessage(null);
    setIsActivating(true);
    try {
      const result = await requestStellarChangeTrustOptAdd({
        accountId: account.id,
        assetId,
        scope: chainId,
      });

      if (result.status === false) {
        return;
      }

      await refreshStellarAccountAssets({
        account: account as InternalAccount,
        chainId,
        assetId,
        trustlineAction: 'add',
      });
      onTrustlineChanged?.();
    } catch (error: unknown) {
      const errorCode = (error as { code?: number })?.code;
      const isUserRejection =
        errorCode === errorCodes.provider.userRejectedRequest;
      if (!isUserRejection) {
        setErrorMessage(strings('asset_activation.activate_error'));
      }
    } finally {
      setIsActivating(false);
    }
  }, [account, assetId, chainId, onTrustlineChanged]);

  return {
    account,
    activateAsset,
    deactivateAsset,
    canDeactivate,
    isActivating,
    isDeactivating,
    errorMessage,
    dismissErrorMessage,
  };
}
///: END:ONLY_INCLUDE_IF
