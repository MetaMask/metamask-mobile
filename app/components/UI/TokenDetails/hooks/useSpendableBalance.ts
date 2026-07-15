///: BEGIN:ONLY_INCLUDE_IF(stellar)
import {
  parseCaipAssetType,
  isCaipAssetType,
  type CaipAssetType,
} from '@metamask/utils';
import { useMemo } from 'react';
import { useSelector } from 'react-redux';

import {
  computeSpendableBalance,
  isSupportBaseReserve,
} from '../../../../util/multichain/spendable-balance';
import { getStellarBaseReserveForAccountAsset } from '../../../../selectors/stellar/stellar-assets';
import { selectSelectedInternalAccountByScope } from '../../../../selectors/multichainAccounts/accounts';
import { RootState } from '../../../../reducers';

/**
 * Resolves native spendable balance data for an account/asset pair.
 *
 * @param params - Hook parameters.
 * @param params.accountId - Optional account id override.
 * @param params.assetId - CAIP asset id for the native asset.
 * @param params.totalBalance - Total balance display string used to compute spendable balance.
 * @returns Base reserve and spendable balance when available.
 */
export const useSpendableBalance = ({
  accountId,
  assetId,
  totalBalance,
}: {
  accountId?: string;
  assetId?: CaipAssetType;
  totalBalance?: string;
}) => {
  const chainId =
    assetId && isCaipAssetType(assetId)
      ? parseCaipAssetType(assetId).chainId
      : undefined;
  const selectAccountByScope = useSelector(
    selectSelectedInternalAccountByScope,
  );

  const resolvedAccountId =
    accountId ?? (chainId ? selectAccountByScope(chainId)?.id : undefined);

  const baseReserve = useSelector((state: RootState) => {
    if (!assetId || !resolvedAccountId || !isSupportBaseReserve(assetId)) {
      return undefined;
    }

    return getStellarBaseReserveForAccountAsset(
      state,
      resolvedAccountId,
      assetId,
    );
  });

  const spendableBalance = useMemo(() => {
    if (baseReserve === undefined || totalBalance === undefined) {
      return undefined;
    }

    return computeSpendableBalance(totalBalance, baseReserve);
  }, [baseReserve, totalBalance]);

  return {
    baseReserve,
    spendableBalance,
  };
};
///: END:ONLY_INCLUDE_IF
