import { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  isCaipChainId,
  type CaipAssetType,
  type CaipChainId,
  type Hex,
} from '@metamask/utils';
import { toEvmCaipChainId } from '@metamask/multichain-network-controller';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';
import { selectSelectedInternalAccountId } from '../../../../selectors/accountsController';
import { selectSelectedInternalAccountByScope } from '../../../../selectors/multichainAccounts/accounts';
import {
  getCustomAssets,
  getAssetsBalance,
  getAssetPreferences,
} from '../../../../selectors/assets/assets-controller';
import { selectMultichainAssetsAllIgnoredAssets } from '../../../../selectors/multichain/multichain';
import { toAssetId } from '../../Bridge/hooks/useAssetMetadata/utils';
import type { TokenI } from '../../Tokens/types';

export interface UseAssetVisibilityReturn {
  /** CAIP-19 asset ID derived from the token's address and chainId */
  assetId: CaipAssetType | undefined;
  /** Token was explicitly added by the user to their custom assets list */
  isCustomAsset: boolean;
  /** Token has a balance entry in AssetsController (auto-detected) */
  isInAssetsBalance: boolean;
  /** Token is currently hidden via assetPreferences */
  isHidden: boolean;
  /**
   * Calls the correct AssetsController method based on the token's current state:
   * - already hidden → unhideAsset   (checked first: hideAsset keeps the balance entry)
   * - custom asset   → removeCustomAsset
   * - has balance    → hideAsset
   */
  handleHideToken: () => void;
  /**
   * Adds any CAIP-19 asset to the selected account's custom assets list.
   * Can be called with an explicit assetId, independent of the asset the hook
   * was initialised with.
   * Pass `accountIdOverride` to use a specific account instead of the one
   * resolved from the hook's asset (needed when calling without an asset).
   */
  handleAddCustomAsset: (
    assetId: CaipAssetType,
    accountIdOverride?: string,
  ) => Promise<void>;
}

/**
 * Derives the CAIP-19 asset ID from a TokenI.
 * Accepts chainId in either hex (0x1) or CAIP-2 (eip155:1) format.
 */
const resolveAssetId = (
  address: string,
  chainId: string,
): CaipAssetType | undefined => {
  const caipChainId = isCaipChainId(chainId)
    ? chainId
    : toEvmCaipChainId(chainId as Hex);

  return toAssetId(address, caipChainId);
};

const useAssetVisibility = (asset?: TokenI): UseAssetVisibilityReturn => {
  // Globally selected account — always EVM, used as fallback when no asset
  // chainId is available.
  const globalAccountId = useSelector(selectSelectedInternalAccountId);
  // Factory selector: given a CAIP chain scope it returns the matching account
  // from the currently selected account group (works for EVM, Solana, BTC…).
  const internalAccountByScope = useSelector(
    selectSelectedInternalAccountByScope,
  );
  const customAssets = useSelector(getCustomAssets);
  const assetsBalance = useSelector(getAssetsBalance);
  const assetPreferences = useSelector(getAssetPreferences);
  const allIgnoredNonEvmAssets = useSelector(
    selectMultichainAssetsAllIgnoredAssets,
  );

  // Resolve the account ID scoped to the asset's chain.
  // Non-EVM assets (Solana, BTC, …) are stored under their own account ID —
  // using the global EVM account would miss all non-EVM balance/custom entries.
  const accountId = useMemo(() => {
    if (!asset?.chainId) return globalAccountId;
    const caipChainId: CaipChainId | undefined = isCaipChainId(asset.chainId)
      ? (asset.chainId as CaipChainId)
      : toEvmCaipChainId(asset.chainId as Hex);
    if (!caipChainId) return globalAccountId;
    return internalAccountByScope(caipChainId)?.id ?? globalAccountId;
  }, [asset?.chainId, internalAccountByScope, globalAccountId]);

  const assetId = useMemo(
    () =>
      asset?.address && asset?.chainId
        ? resolveAssetId(asset.address, asset.chainId)
        : undefined,
    [asset?.address, asset?.chainId],
  );

  const isCustomAsset = useMemo(() => {
    if (!assetId || !accountId) return false;
    return customAssets[accountId]?.includes(assetId) ?? false;
  }, [assetId, accountId, customAssets]);

  const isInAssetsBalance = useMemo(() => {
    if (!assetId || !accountId) return false;
    return Boolean(assetsBalance[accountId]?.[assetId]);
  }, [assetId, accountId, assetsBalance]);

  const isHidden = useMemo(() => {
    if (!assetId) return false;
    // EVM: state lives in AssetsController.assetPreferences
    if (assetPreferences[assetId]?.hidden === true) return true;
    // Non-EVM: state lives in MultichainAssetsController.allIgnoredAssets
    if (accountId && allIgnoredNonEvmAssets[accountId]?.includes(assetId))
      return true;
    return false;
  }, [assetId, assetPreferences, accountId, allIgnoredNonEvmAssets]);

  const handleAddCustomAsset = useCallback(
    async (
      assetIdToAdd: CaipAssetType,
      accountIdOverride?: string,
    ): Promise<void> => {
      const effectiveAccountId = accountIdOverride ?? accountId;
      if (!effectiveAccountId) return;
      const { AssetsController } = Engine.context;
      await AssetsController.addCustomAsset(effectiveAccountId, assetIdToAdd);
    },
    [accountId],
  );

  const handleHideToken = useCallback(() => {
    if (!assetId || !accountId) return;

    const { AssetsController, MultichainAssetsController } = Engine.context;

    try {
      if (isHidden) {
        // isHidden must be checked before isInAssetsBalance because hideAsset
        // sets assetPreferences.hidden without removing the assetsBalance entry.
        // Without this order a hidden token with a balance would be re-hidden
        // instead of unhidden.
        AssetsController.unhideAsset(assetId);
        // For non-EVM tokens the hidden state also lives in
        // MultichainAssetsController.allIgnoredAssets; addAssets restores it.
        if (allIgnoredNonEvmAssets[accountId]?.includes(assetId)) {
          MultichainAssetsController.addAssets([assetId], accountId);
        }
      } else if (isCustomAsset) {
        AssetsController.removeCustomAsset(accountId, assetId);
      } else if (isInAssetsBalance) {
        AssetsController.hideAsset(assetId);
      }
    } catch (err) {
      Logger.log(err, 'useAssetVisibility: Failed to update token visibility');
    }
  }, [
    assetId,
    accountId,
    isCustomAsset,
    isInAssetsBalance,
    isHidden,
    allIgnoredNonEvmAssets,
  ]);

  return {
    assetId,
    isCustomAsset,
    isInAssetsBalance,
    isHidden,
    handleHideToken,
    handleAddCustomAsset,
  };
};

export default useAssetVisibility;
