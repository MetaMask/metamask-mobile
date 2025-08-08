import { AccountInformation } from '@metamask/assets-controllers';
import { Hex } from '@metamask/utils';
import { useMemo } from 'react';
import { useSelector } from 'react-redux';

import {
  fromTokenMinimalUnitString,
  fromWei,
  hexToBN,
} from '../../../../../util/number';
import { selectAccounts } from '../../../../../selectors/accountTrackerController';
import { selectContractBalances } from '../../../../../selectors/tokenBalancesController';
import { AssetType } from '../../types/token';
import { isNativeToken } from '../../utils/generic';
import { useSendContext } from '../../context/send-context';
import { useSendType } from './useSendType';

export interface GetEvmBalanceArgs {
  accounts: Record<Hex, AccountInformation>;
  asset?: AssetType;
  contractBalances: Record<Hex, Hex>;
  from: string;
}

export const getEvmBalance = ({
  accounts,
  asset,
  contractBalances,
  from,
}: GetEvmBalanceArgs) => {
  if (!asset) {
    return '0';
  }
  if (isNativeToken(asset)) {
    const accountAddress = Object.keys(accounts).find(
      (address) => address.toLowerCase() === from.toLowerCase(),
    ) as Hex;
    const account = accounts[accountAddress];
    const balance = hexToBN(account.balance);
    return fromWei(balance);
  }
  return fromTokenMinimalUnitString(
    contractBalances[asset.address as Hex],
    asset.decimals,
  );
};

export const getNonEvmBalance = (asset?: AssetType) => {
  if (!asset) {
    return '0';
  }
  return asset.balance;
};

export const useBalance = () => {
  const { isEvmSendType } = useSendType();
  const accounts = useSelector(selectAccounts);
  const contractBalances = useSelector(selectContractBalances);
  const { asset, from } = useSendContext();

  const balance = useMemo(
    () =>
      isEvmSendType
        ? getEvmBalance({ accounts, asset, contractBalances, from })
        : getNonEvmBalance(asset),
    [accounts, asset, contractBalances, from, isEvmSendType],
  );

  return {
    balance,
  };
};
