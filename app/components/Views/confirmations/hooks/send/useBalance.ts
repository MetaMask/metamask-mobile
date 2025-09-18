import BN from 'bnjs4';
import { Hex } from '@metamask/utils';
import { useMemo } from 'react';
import { useSelector } from 'react-redux';

import { hexToBN } from '../../../../../util/number';
import { selectAccountsByChainId } from '../../../../../selectors/accountTrackerController';
import { selectContractBalances } from '../../../../../selectors/tokenBalancesController';
import { AssetType, TokenStandard } from '../../types/token';
import {
  formatToFixedDecimals,
  fromHexWithDecimals,
  toBNWithDecimals,
} from '../../utils/send';
import { useSendContext } from '../../context/send-context';
import { useSendType } from './useSendType';

type AccountsByChainIdType = Record<Hex, Record<string, { balance: Hex }>>;
export interface GetBalanceArgs {
  accountsByChainId?: Record<Hex, Record<string, { balance: Hex }>>;
  asset?: AssetType;
  chainId?: string;
  contractBalances: Record<Hex, Hex>;
  from?: string;
  isEvmSendType?: boolean;
}

export const getBalance = ({
  accountsByChainId,
  asset,
  chainId,
  contractBalances,
  from,
  isEvmSendType,
}: GetBalanceArgs) => {
  if (!asset) {
    return { balance: '0', decimals: 0, rawBalanceBN: new BN('0') };
  }
  let rawBalanceHex = asset?.rawBalance;
  if (!rawBalanceHex && isEvmSendType) {
    if (asset.isNative) {
      const accountsWithBalances = accountsByChainId?.[chainId as Hex];
      const accountAddress = Object.keys(accountsWithBalances ?? {}).find(
        (address) => address.toLowerCase() === from?.toLowerCase(),
      ) as Hex;
      const account = accountsWithBalances?.[accountAddress];
      rawBalanceHex = account?.balance;
    } else if (contractBalances[asset.address as Hex]) {
      rawBalanceHex = contractBalances[asset.address as Hex];
    }
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
    let assetBal = asset?.balance;
    if (asset?.balance.startsWith('<')) {
      assetBal = assetBal.slice(1);
    }
    assetBal = assetBal.trim();
    return {
      balance: assetBal,
      decimals: asset?.decimals,
      rawBalanceBN: toBNWithDecimals(assetBal, asset?.decimals),
    };
  }
  return { balance: '0', decimals: 0, rawBalanceBN: new BN('0') };
};

export const useBalance = () => {
  const { isEvmSendType } = useSendType();
  const accountsByChainId = useSelector(
    selectAccountsByChainId,
  ) as AccountsByChainIdType;
  const contractBalances = useSelector(selectContractBalances);
  const { asset, chainId, from } = useSendContext();

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
      accountsByChainId,
      asset: asset as AssetType,
      chainId,
      contractBalances,
      from,
      isEvmSendType,
    });
  }, [
    asset,
    accountsByChainId,
    chainId,
    contractBalances,
    from,
    isEvmSendType,
  ]);

  return {
    balance,
    decimals,
    rawBalanceBN,
  };
};
