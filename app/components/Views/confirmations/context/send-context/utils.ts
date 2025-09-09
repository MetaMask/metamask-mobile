import BN from 'bnjs5';
import { BNToHex, toHex } from '@metamask/controller-utils';
import { TransactionParams } from '@metamask/transaction-controller';

import { generateTransferData } from '../../../../../util/transactions';
import { toTokenMinimalUnit, toWei } from '../../../../../util/number';
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
    const tokenAmount = toTokenMinimalUnit(value ?? '0', asset.decimals ?? 0);
    trxnParams.data = generateTransferData('transfer', {
      toAddress: to,
      amount: BNToHex(tokenAmount),
    });
    trxnParams.to = asset.address;
    trxnParams.value = '0x0';
  }
  return trxnParams;
};
