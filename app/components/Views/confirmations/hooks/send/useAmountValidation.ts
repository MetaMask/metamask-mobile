import { AccountInformation } from '@metamask/assets-controllers';
import { Hex } from '@metamask/utils';
import { useMemo } from 'react';
import { useSelector } from 'react-redux';

import { strings } from '../../../../../../locales/i18n';
import {
  hexToBN,
  isDecimal,
  toTokenMinimalUnit,
  toWei,
} from '../../../../../util/number';
import { selectAccounts } from '../../../../../selectors/accountTrackerController';
import { selectContractBalances } from '../../../../../selectors/tokenBalancesController';
import { AssetType } from '../../types/token';
import { isNativeToken } from '../../utils/generic';
import { useSendContext } from '../../context/send-context';

export interface ValidateAmountArgs {
  accounts: Record<Hex, AccountInformation>;
  amount?: string;
  asset?: AssetType;
  contractBalances: Record<Hex, Hex>;
  from: Hex;
}

export const validateAmountFn = ({
  accounts,
  amount,
  asset,
  contractBalances,
  from,
}: ValidateAmountArgs) => {
  if (!asset) {
    return;
  }
  if (amount === undefined || amount === null || amount === '') {
    return;
  }
  if (!isDecimal(amount) || Number(amount) < 0) {
    return strings('transaction.invalid_amount');
  }
  let weiValue;
  let weiBalance;
  if (isNativeToken(asset)) {
    const accountAddress = Object.keys(accounts).find(
      (address) => address.toLowerCase() === from.toLowerCase(),
    ) as Hex;
    const account = accounts[accountAddress];
    // toWei can throw error if input is not a number: Error: while converting number to string, invalid number value
    try {
      weiValue = toWei(amount);
    } catch (error) {
      return strings('transaction.invalid_amount');
    }
    weiBalance = hexToBN(account?.balance ?? '0');
  } else {
    weiValue = toTokenMinimalUnit(amount, asset.decimals);
    weiBalance = hexToBN(contractBalances[asset.address as Hex]);
  }
  if (weiBalance.cmp(weiValue) === -1) {
    return strings('transaction.insufficient');
  }
  return undefined;
};

const useAmountValidation = () => {
  const accounts = useSelector(selectAccounts);
  const contractBalances = useSelector(selectContractBalances);
  const { asset, from, value } = useSendContext();

  const amountError = useMemo(
    () =>
      validateAmountFn({
        accounts,
        amount: value,
        asset,
        contractBalances,
        from: from as Hex,
      }),
    [accounts, asset, contractBalances, from, value],
  );

  return { amountError };
};

export default useAmountValidation;
