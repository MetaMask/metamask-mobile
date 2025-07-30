import BN from 'bnjs5';
import { AccountInformation } from '@metamask/assets-controllers';
import { BNToHex, toHex } from '@metamask/controller-utils';
import { Hex } from '@metamask/utils';
import { TransactionParams } from '@metamask/transaction-controller';

import { strings } from '../../../../../../locales/i18n.js';
import { generateTransferData } from '../../../../../util/transactions';
import {
  hexToBN,
  isDecimal,
  toTokenMinimalUnit,
  toWei,
} from '../../../../../util/number';
import { AssetType } from '../../types/token';
import { isNativeToken } from '../../utils/generic';

export const prepareEVMTransaction = (
  asset: AssetType,
  transactionParams: TransactionParams,
) => {
  const { from, to, value } = transactionParams;
  const trxnParams: TransactionParams = { from };
  if (isNativeToken(asset)) {
    trxnParams.data = '0x';
    trxnParams.to = to;
    trxnParams.value = BNToHex(toWei(value ?? '0') as unknown as BN);
  } else if (asset.tokenId) {
    trxnParams.data = generateTransferData('transferFrom', {
      fromAddress: from,
      toAddress: to,
      tokenId: toHex(asset.tokenId),
    });
    trxnParams.to = asset.address;
    trxnParams.value = '0x0';
  } else {
    const tokenAmount = toTokenMinimalUnit(value ?? '0', asset.decimals);
    trxnParams.data = generateTransferData('transfer', {
      toAddress: to,
      amount: BNToHex(tokenAmount),
    });
    trxnParams.to = asset.address;
    trxnParams.value = '0x0';
  }
  return trxnParams;
};

export interface ValidateAmountArgs {
  accounts: Record<Hex, AccountInformation>;
  amount?: string;
  asset?: AssetType;
  contractBalances: Record<Hex, Hex>;
  from: Hex;
}

export const validateAmount = ({
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
    const account = accountAddress ? accounts[accountAddress] : undefined;
    // toWei can throw error if input is not a number: Error: while converting number to string, invalid number value
    try {
      weiValue = toWei(amount);
    } catch (error) {
      return strings('transaction.invalid_amount');
    }
    weiBalance = hexToBN(account?.balance ?? '0');
  } else {
    weiValue = toTokenMinimalUnit(amount, asset.decimals);
    weiBalance = hexToBN(contractBalances[asset.address as Hex] ?? 0x0);
  }
  if (weiBalance.cmp(weiValue) === -1) {
    return strings('transaction.insufficient');
  }
  return undefined;
};
