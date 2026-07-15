///: BEGIN:ONLY_INCLUDE_IF(stellar)
import { errorCodes } from '@metamask/rpc-errors';
import { useCallback, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  isCaipAssetType,
  parseCaipAssetType,
  type CaipAssetType,
} from '@metamask/utils';
import { strings } from '../../../../../locales/i18n';
import { RootState } from '../../../../reducers';
import { selectSelectedInternalAccountByScope } from '../../../../selectors/multichainAccounts/accounts';
import { selectMultichainBalances } from '../../../../selectors/multichain';
import { getStellarTrustlineAssetInfoForAccount } from '../../../../selectors/stellar/stellar-assets';
import {
  isAssetRequireActivate,
  isTrustlineAsset,
} from '../../../../util/multichain/trustline';
import {
  requestStellarChangeTrustOptAdd,
  requestStellarChangeTrustOptDelete,
} from '../../../../util/stellar/stellar-snap-client-requests';

export interface AssetActivationActionResult {
  /**
   * Whether the trustline change was submitted successfully.
   */
  success: boolean;
  /**
   * User-facing error message when the action failed.
   * `null` when successful, cancelled, or skipped.
   */
  errorMessage: string | null;
}

const CANCELLED_RESULT: AssetActivationActionResult = {
  success: false,
  errorMessage: null,
};

/**
 * Manages trustline activation and deactivation for supported assets (currently Stellar classic tokens).
 *
 * @param params - Hook parameters.
 * @param params.accountId - Optional account id override.
 * @param params.assetId - CAIP asset id for the trustline asset.
 * @param params.assetSymbol - Symbol of the asset.
 * @returns Trustline actions, loading flags, activation requirement, and whether deactivation is allowed.
 */
export const useAssetActivation = ({
  accountId,
  assetId,
  assetSymbol,
}: {
  accountId?: string;
  assetId?: CaipAssetType;
  assetSymbol?: string;
}) => {
  const selectAccountByScope = useSelector(
    selectSelectedInternalAccountByScope,
  );

  const isAssetIsTrustlineAsset = assetId ? isTrustlineAsset(assetId) : false;
  const chainId =
    assetId && isCaipAssetType(assetId)
      ? parseCaipAssetType(assetId).chainId
      : undefined;

  const selectedAccountId =
    !accountId && chainId ? selectAccountByScope(chainId)?.id : undefined;
  const resolvedAccountId = accountId ?? selectedAccountId;

  const multichainBalances = useSelector(selectMultichainBalances);

  const balanceAmount =
    resolvedAccountId && assetId
      ? multichainBalances[resolvedAccountId]?.[assetId]?.amount
      : undefined;

  const requiresActivate = useSelector((state: RootState) => {
    if (!assetId || !isAssetIsTrustlineAsset || !resolvedAccountId) {
      return false;
    }

    const assetMetadata = getStellarTrustlineAssetInfoForAccount(
      state,
      resolvedAccountId,
      assetId,
    );

    return isAssetRequireActivate({
      assetId,
      assetMetadata,
    });
  });

  const canDeactivate = Boolean(
    assetId &&
      isAssetIsTrustlineAsset &&
      !requiresActivate &&
      resolvedAccountId &&
      chainId,
  );

  const [isDeactivating, setIsDeactivating] = useState(false);
  const [isActivating, setIsActivating] = useState(false);

  const deactivateAsset =
    useCallback(async (): Promise<AssetActivationActionResult> => {
      if (
        !canDeactivate ||
        !resolvedAccountId ||
        !chainId ||
        !assetId ||
        !isCaipAssetType(assetId)
      ) {
        return CANCELLED_RESULT;
      }

      const hasNonZeroBalance = Boolean(balanceAmount && balanceAmount !== '0');
      const balanceDisplay = balanceAmount ?? '0';

      setIsDeactivating(true);
      try {
        if (hasNonZeroBalance) {
          return {
            success: false,
            errorMessage: strings(
              'asset_activation.deactivate_error_non_zero_balance_stellar',
              {
                balance: balanceDisplay,
                symbol: assetSymbol,
              },
            ),
          };
        }
        await requestStellarChangeTrustOptDelete({
          accountId: resolvedAccountId,
          assetId,
          scope: chainId,
        });
        return { success: true, errorMessage: null };
      } catch (error: unknown) {
        const errorCode = (error as { code?: number })?.code;
        const isUserRejection =
          errorCode === errorCodes.provider.userRejectedRequest;
        if (isUserRejection) {
          return CANCELLED_RESULT;
        }
        return {
          success: false,
          errorMessage: strings('asset_activation.deactivate_error'),
        };
      } finally {
        setIsDeactivating(false);
      }
    }, [
      assetId,
      assetSymbol,
      balanceAmount,
      canDeactivate,
      chainId,
      resolvedAccountId,
    ]);

  const activateAsset =
    useCallback(async (): Promise<AssetActivationActionResult> => {
      if (
        !resolvedAccountId ||
        !chainId ||
        !assetId ||
        !isCaipAssetType(assetId) ||
        !isAssetIsTrustlineAsset
      ) {
        return CANCELLED_RESULT;
      }

      setIsActivating(true);
      try {
        const result = await requestStellarChangeTrustOptAdd({
          accountId: resolvedAccountId,
          assetId,
          scope: chainId,
        });

        if (result.status === false) {
          // Snap showed the account funding prompt; no trustline tx was submitted.
          return CANCELLED_RESULT;
        }
        return { success: true, errorMessage: null };
      } catch (error: unknown) {
        const errorCode = (error as { code?: number })?.code;
        const isUserRejection =
          errorCode === errorCodes.provider.userRejectedRequest;
        if (isUserRejection) {
          return CANCELLED_RESULT;
        }
        return {
          success: false,
          errorMessage: strings('asset_activation.activate_error'),
        };
      } finally {
        setIsActivating(false);
      }
    }, [assetId, chainId, isAssetIsTrustlineAsset, resolvedAccountId]);

  return {
    activateAsset,
    deactivateAsset,
    canDeactivate,
    requiresActivate,
    isActivating,
    isDeactivating,
  };
};
///: END:ONLY_INCLUDE_IF
