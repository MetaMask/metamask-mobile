///: BEGIN:ONLY_INCLUDE_IF(stellar)
import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import type { InternalAccount } from '@metamask/keyring-internal-api';
import {
  type CaipAssetId,
  type CaipAssetType,
  type CaipChainId,
  isCaipAssetType,
} from '@metamask/utils';
import type { TokenI } from '../../Tokens/types';
import { RootState } from '../../../../reducers';
import { selectMultichainBalances } from '../../../../selectors/multichain/multichain';
import { selectSelectedInternalAccountByScope } from '../../../../selectors/multichainAccounts/accounts';
import { getBaseReserveFromExtra } from '../../../../util/stellar/base-reserve-from-extra';
import {
  isStellarClassicTrustlineInactiveForDisplay,
  isStellarSep41Asset,
} from '../../../../util/stellar/trustline-from-extra';
import type { StellarBalanceExtra } from '../../../../util/stellar/types';

export interface StellarTrustlineDisplayState {
  account: InternalAccount | undefined;
  balanceExtra: StellarBalanceExtra | undefined;
  isStellarClassicTrustlineTrackedToken: boolean;
  isStellarTrustlineInactive: boolean;
  showStellarClassicTrustlineActivate: boolean;
  showStellarInactiveAssetHeader: boolean;
  hasStellarClassicTrustlineToRemove: boolean;
  stellarNativeBaseReserve: string | undefined;
  showStellarNativeBalanceSection: boolean;
}

const EMPTY_STATE: StellarTrustlineDisplayState = {
  account: undefined,
  balanceExtra: undefined,
  isStellarClassicTrustlineTrackedToken: false,
  isStellarTrustlineInactive: false,
  showStellarClassicTrustlineActivate: false,
  showStellarInactiveAssetHeader: false,
  hasStellarClassicTrustlineToRemove: false,
  stellarNativeBaseReserve: undefined,
  showStellarNativeBalanceSection: false,
};

export function useStellarTrustlineDisplay(
  token: TokenI | undefined,
): StellarTrustlineDisplayState {
  const chainId = token?.chainId as CaipChainId | undefined;
  const assetId = token?.address as CaipAssetType | undefined;

  const selectAccountByScope = useSelector(
    selectSelectedInternalAccountByScope,
  );
  const account = chainId ? selectAccountByScope(chainId) : undefined;

  const balanceExtra = useSelector((state: RootState) => {
    if (!account || !assetId || !isCaipAssetType(assetId)) {
      return undefined;
    }

    const balances = selectMultichainBalances(state);
    const balance = balances?.[account.id]?.[assetId as CaipAssetId];
    return balance?.extra as StellarBalanceExtra | undefined;
  });

  return useMemo(() => {
    if (!token || !chainId || !assetId) {
      return EMPTY_STATE;
    }

    const isSep41StellarAsset = isStellarSep41Asset(assetId);
    const isStellarClassicTrustlineTrackedToken =
      !token.isNative && isCaipAssetType(assetId) && !isSep41StellarAsset;

    const isStellarTrustlineInactive =
      isStellarClassicTrustlineInactiveForDisplay({
        chainId,
        assetId,
        isNative: token.isNative,
        extra: balanceExtra,
        balance: token.balance,
      });

    const hasStellarClassicTrustlineToRemove =
      isStellarClassicTrustlineTrackedToken &&
      !isStellarClassicTrustlineInactiveForDisplay({
        chainId,
        assetId,
        isNative: token.isNative,
        extra: balanceExtra,
      });

    const stellarNativeBaseReserve = token.isNative
      ? getBaseReserveFromExtra(balanceExtra)
      : undefined;

    return {
      account,
      balanceExtra,
      isStellarClassicTrustlineTrackedToken,
      isStellarTrustlineInactive,
      showStellarClassicTrustlineActivate:
        isStellarClassicTrustlineTrackedToken && isStellarTrustlineInactive,
      showStellarInactiveAssetHeader:
        isStellarClassicTrustlineTrackedToken && isStellarTrustlineInactive,
      hasStellarClassicTrustlineToRemove,
      stellarNativeBaseReserve,
      showStellarNativeBalanceSection:
        Boolean(token.isNative) && stellarNativeBaseReserve !== undefined,
    };
  }, [account, assetId, balanceExtra, chainId, token]);
}
///: END:ONLY_INCLUDE_IF
