import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { isCrossChain } from '@metamask/bridge-controller';
import { isCaipChainId } from '@metamask/utils';
import {
  selectDestAddress,
  selectDestToken,
  selectSourceToken,
} from '../../../../../core/redux/slices/bridge';
import { getMemoizedInternalAccountByAddress } from '../../../../../selectors/accountsController';
import { selectSelectedInternalAccountByScope } from '../../../../../selectors/multichainAccounts/accounts';
import { getIsAssetRequireActivate } from '../../../../../selectors/stellar/stellar-assets';
import type { RootState } from '../../../../../reducers';

/**
 * Whether a cross-chain swap destination is a Stellar classic asset that still
 * needs trustline activation on the **destination** account (`destAddress`),
 * and whether that account matches the active account for the dest chain.
 *
 * External / unknown recipients return `isDestAssetRequireActivate: false`
 * (no in-app activate CTA). When `destAddress` is missing, activation is false.
 */
export const useDestAssetRequireActivate = () => {
  const sourceToken = useSelector(selectSourceToken);
  const destToken = useSelector(selectDestToken);
  const destAddress = useSelector(selectDestAddress);
  const selectedInternalAccountByScope = useSelector(
    selectSelectedInternalAccountByScope,
  );

  const destAccount = useSelector((state: RootState) =>
    destAddress
      ? getMemoizedInternalAccountByAddress(state, destAddress)
      : undefined,
  );

  const isCrossChainToDest = Boolean(
    sourceToken &&
      destToken &&
      isCrossChain(sourceToken.chainId, destToken.chainId),
  );

  const isDestAssetRequireActivate = useSelector((state: RootState) => {
    if (!isCrossChainToDest || !destToken?.address || !destAccount?.id) {
      return false;
    }
    return getIsAssetRequireActivate(state, {
      assetId: destToken.address,
      accountId: destAccount.id,
    });
  });

  const isDestSameAsActiveAccount = useMemo(() => {
    if (!destAccount?.id || !destToken?.chainId) {
      // Default to same-as-active so CTA path remains available while dest settles.
      return true;
    }
    if (!isCaipChainId(destToken.chainId)) {
      return true;
    }
    const activeAccount = selectedInternalAccountByScope(destToken.chainId);
    return destAccount.id === activeAccount?.id;
  }, [destAccount?.id, destToken?.chainId, selectedInternalAccountByScope]);

  return {
    isDestAssetRequireActivate,
    isDestSameAsActiveAccount,
  };
};
