import BN from 'bnjs4';
import { Hex } from '@metamask/utils';
import { useMemo } from 'react';
import { useSelector } from 'react-redux';

import { hexToBN } from '../../../../../util/number';
import { selectContractBalances } from '../../../../../selectors/tokenBalancesController';
import { AssetType, TokenStandard } from '../../types/token';
import {
  formatToFixedDecimals,
  fromHexWithDecimals,
  toBNWithDecimals,
} from '../../utils/send';
import { useSendContext } from '../../context/send-context';
import { useSendType } from './useSendType';

export interface GetBalanceArgs {
  asset?: AssetType;
  contractBalances: Record<Hex, Hex>;
  isEvmSendType?: boolean;
}

export const getBalance = ({
  asset,
  contractBalances,
  isEvmSendType,
}: GetBalanceArgs) => {
  if (!asset) {
    return { balance: '0', decimals: 0, rawBalanceBN: new BN('0') };
  }
  let rawBalanceHex = asset?.rawBalance;
  if (
    !rawBalanceHex &&
    isEvmSendType &&
    contractBalances[asset.address as Hex]
  ) {
    rawBalanceHex = contractBalances[asset.address as Hex];
  }
  if (rawBalanceHex) {
    const rawBalanceBN = hexToBN(rawBalanceHex);
    return {
      balance: formatToFixedDecimals(
        fromHexWithDecimals(rawBalanceHex, asset?.decimals),
        asset?.decimals,
      ),
      decimals: asset?.decimals,
      rawBalanceBN,
    };
  }
  if (asset?.balance) {
    return {
      balance: asset?.balance,
      decimals: asset?.decimals,
      rawBalanceBN: toBNWithDecimals(asset?.balance, asset?.decimals),
    };
  }
  return { balance: '0', decimals: 0, rawBalanceBN: new BN('0') };
};

export const useBalance = () => {
  const { isEvmSendType } = useSendType();
  const contractBalances = useSelector(selectContractBalances);
  const { asset } = useSendContext();

  const { balance, decimals, rawBalanceBN } = useMemo(() => {
    if (asset?.standard === TokenStandard.ERC1155) {
      const assetBalance = asset?.balance ?? '0';
      return {
        balance: assetBalance,
        rawBalanceBN: new BN(assetBalance),
        decimals: 0,
      };
    }
    return getBalance({
      asset: asset as AssetType,
      contractBalances,
      isEvmSendType,
    });
  }, [asset, contractBalances, isEvmSendType]);

  return {
    balance,
    decimals,
    rawBalanceBN,
  };
};
