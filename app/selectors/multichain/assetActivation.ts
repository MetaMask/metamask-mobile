///: BEGIN:ONLY_INCLUDE_IF(stellar)
import {
  type CaipAssetId,
  type CaipAssetType,
  isCaipAssetType,
} from '@metamask/utils';
import { createSelector } from 'reselect';
import type { TokenI } from '../../components/UI/Tokens/types';
import type { RootState } from '../../reducers';
import { computeBaseReserve } from '../../util/multichain/spendable-balance';
import {
  isAssetRequireActivate,
  isTrustlineAsset,
} from '../../util/multichain/trustline';
import type { StellarBalanceExtra } from '../../util/stellar/types';
import { selectMultichainBalances } from './multichain';
import { selectSelectedInternalAccountByScope } from '../multichainAccounts/accounts';

export function selectAccountAssetInfoForToken(
  state: RootState,
  accountId: string | undefined,
  assetId: CaipAssetType | string | undefined,
): StellarBalanceExtra | undefined {
  if (!accountId || !assetId || !isCaipAssetType(assetId)) {
    return undefined;
  }

  const balances = selectMultichainBalances(state);
  return balances?.[accountId]?.[assetId as CaipAssetId]
    ?.accountAssetInfo as StellarBalanceExtra | undefined;
}

export const selectIsAssetRequireActivateForToken = createSelector(
  [
    selectMultichainBalances,
    selectSelectedInternalAccountByScope,
    (_state: RootState, token: TokenI | undefined) => token,
  ],
  (balances, getAccountByScope, token) => {
    if (!token?.chainId || token.isNative) {
      return false;
    }

    const assetId = token.address;
    if (!isTrustlineAsset(assetId)) {
      return false;
    }

    const account = getAccountByScope(token.chainId);
    const assetMetadata = account
      ? (balances?.[account.id]?.[assetId as CaipAssetId]
          ?.accountAssetInfo as StellarBalanceExtra | undefined)
      : undefined;

    return isAssetRequireActivate({ assetId, assetMetadata });
  },
);

export const selectBaseReserveForNativeToken = createSelector(
  [
    selectMultichainBalances,
    selectSelectedInternalAccountByScope,
    (_state: RootState, token: TokenI | undefined) => token,
  ],
  (balances, getAccountByScope, token) => {
    if (!token?.isNative || !token.chainId || !isCaipAssetType(token.address)) {
      return undefined;
    }

    const account = getAccountByScope(token.chainId);
    const assetMetadata = account
      ? (balances?.[account.id]?.[token.address as CaipAssetId]
          ?.accountAssetInfo as StellarBalanceExtra | undefined)
      : undefined;

    return computeBaseReserve({
      assetId: token.address,
      assetMetadata,
    });
  },
);
///: END:ONLY_INCLUDE_IF
