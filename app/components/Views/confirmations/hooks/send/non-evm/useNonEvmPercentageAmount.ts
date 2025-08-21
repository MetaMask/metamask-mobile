import BN from 'bnjs4';
import { useCallback } from 'react';

import { AssetType } from '../../../types/token';
import { fromBNWithDecimals, toBNWithDecimals } from '../../../utils/send';
import { isNativeToken } from '../../../utils/generic';
import { useSendContext } from '../../../context/send-context';

export const getPercentageValueFn = (percentage: number, asset?: AssetType) => {
  if (!asset) {
    return '0';
  }
  if (isNativeToken(asset) && percentage === 100) {
    return undefined;
  }
  if (percentage === 100) {
    return asset.balance;
  }
  return fromBNWithDecimals(
    toBNWithDecimals(asset.balance, asset.decimals)
      .div(new BN(4))
      .mul(new BN(percentage / 25)),
    asset.decimals,
  );
};

export const useNonEvmPercentageAmount = () => {
  const { asset } = useSendContext();

  const getNonEvmPercentageAmount = useCallback(
    (percentage: number) => getPercentageValueFn(percentage, asset),
    [asset],
  );

  return {
    getNonEvmPercentageAmount,
  };
};
