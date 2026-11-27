import BN from 'bnjs4';
import { useCallback } from 'react';

import { AssetType } from '../../types/token';
import { fromBNWithDecimals } from '../../utils/send';
import { useSendContext } from '../../context/send-context';
import { useBalance } from './useBalance';
import { useSendType } from './useSendType';
import { useNonEvmMaxAmount } from './useNonEvmMaxAmount';

/**
 * Returns a percentage of the balance.
 *
 * Max returns the full balance, except for non-EVM networks that can quote it
 * through `useNonEvmMaxAmount` (Tron today, where the Snap leaves room for the
 * fees and the account activation reserve). For native EVM sends, the gas fee
 * is subtracted on the confirmation by `useMaxValueRefresher`, using the gas
 * estimated by `TransactionController`.
 *
 * @param args - The calculation arguments.
 * @param args.asset - The asset being sent.
 * @param args.percentage - The percentage of the balance, from 0 to 100.
 * @param args.rawBalanceBN - The balance, in minimal units.
 * @returns The amount, in decimal units of the asset.
 */
export const getPercentageValueFn = ({
  asset,
  percentage,
  rawBalanceBN,
}: {
  asset?: AssetType;
  percentage: number;
  rawBalanceBN: BN;
}) => {
  if (!asset) {
    return '0';
  }

  const percentageValue = rawBalanceBN.mul(new BN(percentage)).div(new BN(100));

  return fromBNWithDecimals(percentageValue, asset.decimals);
};

export const usePercentageAmount = () => {
  const { asset } = useSendContext();
  const { isNonEvmNativeSendType } = useSendType();
  const { rawBalanceBN } = useBalance();
  const { getNonEvmMaxAmount, isNonEvmMaxSupported } = useNonEvmMaxAmount();

  const getPercentageAmount = useCallback(
    (percentage: number) => {
      if (isNonEvmNativeSendType && percentage === 100) return undefined;
      return getPercentageValueFn({
        asset: asset as AssetType,
        percentage,
        rawBalanceBN,
      });
    },
    [asset, isNonEvmNativeSendType, rawBalanceBN],
  );

  const getMaxAmount = useCallback(async () => {
    if (isNonEvmMaxSupported) {
      const nonEvmMaxAmount = await getNonEvmMaxAmount();
      if (nonEvmMaxAmount) return nonEvmMaxAmount;
    }

    return getPercentageValueFn({
      asset: asset as AssetType,
      percentage: 100,
      rawBalanceBN,
    });
  }, [asset, getNonEvmMaxAmount, isNonEvmMaxSupported, rawBalanceBN]);

  return {
    getPercentageAmount,
    getMaxAmount,
    isMaxAmountSupported: !isNonEvmNativeSendType || isNonEvmMaxSupported,
  };
};
