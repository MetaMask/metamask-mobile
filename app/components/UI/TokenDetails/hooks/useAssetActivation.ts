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
import { RootState } from '../../../../reducers';
import { selectAsset } from '../../../../selectors/assets/assets-list';
import { selectSelectedInternalAccountByScope } from '../../../../selectors/multichainAccounts/accounts';
import type { TokenI } from '../../Tokens/types';
import {
  isAssetRequireActivate,
  isTrustlineAsset,
} from '../../../../util/multichain/trustline';
import {
  requestStellarChangeTrustOptAdd,
  requestStellarChangeTrustOptDelete,
} from '../../../../util/stellar/stellar-snap-client-requests';

/**
 * Manages asset activation and deactivation for supported trustline assets.
 */
export function useAssetActivation({ asset }: { asset: TokenI | undefined }) {
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

  const assetMetadata = useSelector((state: RootState) => {
    if (!asset?.address || !asset?.chainId) {
      return undefined;
    }

    return selectAsset(state, {
      address: asset.address,
      chainId: asset.chainId,
    })?.accountAssetInfo;
  });

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

    const balanceValue = Number.parseFloat(asset.balance || '0');
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
      return true;
    } catch (error: unknown) {
      const errorCode = (error as { code?: number })?.code;
      const isUserRejection =
        errorCode === errorCodes.provider.userRejectedRequest;
      if (!isUserRejection) {
        setErrorMessage(
          hasNonZeroBalance
            ? strings(
                'asset_activation.deactivate_error_non_zero_balance_stellar',
                {
                  balance: asset.balance,
                  symbol: asset.symbol,
                },
              )
            : strings('asset_activation.deactivate_error'),
        );
      }
      return false;
    } finally {
      setIsDeactivating(false);
    }
  }, [account, assetId, canDeactivate, chainId, asset]);

  const activateAsset = useCallback(async () => {
    if (!account || !chainId || !assetId || !isCaipAssetType(assetId)) {
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
  }, [account, assetId, chainId]);

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
