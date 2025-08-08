import { useCallback } from 'react';

import { AssetType } from '../../../types/token';
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
  // todo: confirm if asset.balance is source of truth
  return ((parseFloat(asset.balance) * percentage) / 100).toFixed(
    asset.decimals ?? 0,
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
