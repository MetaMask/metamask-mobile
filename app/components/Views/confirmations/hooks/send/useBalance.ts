import BN from 'bnjs4';
import { useMemo } from 'react';

import { hexToBN } from '../../../../../util/number';
import { AssetType, TokenStandard } from '../../types/token';
import { formatToFixedDecimals, fromHexWithDecimals } from '../../utils/send';
import { useSendContext } from '../../context/send-context';

export const useBalance = () => {
  const { asset } = useSendContext();

  const { balance, decimals, rawBalanceBN } = useMemo(() => {
    if (!asset) {
      return { balance: '0', decimals: 0, rawBalanceBN: new BN('0') };
    }
    if (asset?.standard === TokenStandard.ERC1155) {
      const assetBalance = asset?.balance ?? '0';
      return {
        balance: assetBalance,
        rawBalanceBN: new BN(assetBalance),
        decimals: 0,
      };
    }
    const rawBalanceHex = (asset as AssetType)?.rawBalance ?? '0x0';
    return {
      balance: formatToFixedDecimals(
        fromHexWithDecimals(rawBalanceHex, (asset as AssetType)?.decimals),
        (asset as AssetType)?.decimals,
      ),
      decimals: (asset as AssetType)?.decimals,
      rawBalanceBN: hexToBN(rawBalanceHex),
    };
  }, [asset]);

  return {
    balance,
    decimals,
    rawBalanceBN,
  };
};
