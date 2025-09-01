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
import { AssetType, TokenStandard } from '../../types/token';
import { formatToFixedDecimals } from '../../utils/send';
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
  if (!asset || !from) {
    return '0';
  }
  if (isNativeToken(asset)) {
    const accountAddress = Object.keys(accounts).find(
      (address) => address?.toLowerCase() === from?.toLowerCase(),
    ) as Hex;
    const account = accounts[accountAddress];
    const balance = hexToBN(account.balance);
    return formatToFixedDecimals(fromWei(balance), asset.decimals);
  }
  return formatToFixedDecimals(
    fromTokenMinimalUnitString(
      contractBalances[asset.address as Hex],
      asset.decimals,
    ),
    asset.decimals,
  );
};

export const getNonEvmBalance = (asset?: AssetType) => {
  if (!asset) {
    return '0';
  }

  return formatToFixedDecimals(asset.balance, asset?.decimals);
};

export const useBalance = () => {
  const { isEvmSendType } = useSendType();
  const accounts = useSelector(selectAccounts);
  const contractBalances = useSelector(selectContractBalances);
  const { asset, from } = useSendContext();

  const balance = useMemo(() => {
    if (asset?.standard === TokenStandard.ERC1155) {
      return asset?.balance ?? '0';
    }
    return isEvmSendType
      ? getEvmBalance({
          accounts,
          asset: asset as AssetType,
          contractBalances,
          from: from as Hex,
        })
      : getNonEvmBalance(asset as AssetType);
  }, [accounts, asset, contractBalances, from, isEvmSendType]);

  return {
    balance,
  };
};
