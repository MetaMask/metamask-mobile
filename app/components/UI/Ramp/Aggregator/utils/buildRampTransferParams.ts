import { TransactionParams } from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';

import { NATIVE_ADDRESS } from '../../../../../constants/on-ramp';
import { safeToChecksumAddress } from '../../../../../util/address';
import { generateTransferData } from '../../../../../util/transactions';
import { bigIntToHex } from '../../../../../util/number/bigint';

interface BuildRampTransferParamsArgs {
  from?: string;
  chainId?: Hex;
  assetAddress?: string;
  recipient?: string;
  amount?: bigint;
}

/**
 * Builds the native or ERC-20 transfer Ramp submits for a sell. The same
 * object is used for the gas estimate and for `addTransaction`.
 *
 * @returns The transaction params, or `undefined` when the shape is incomplete.
 */
export function buildRampTransferParams({
  from,
  chainId,
  assetAddress,
  recipient,
  amount,
}: BuildRampTransferParamsArgs): TransactionParams | undefined {
  const fromAddress = safeToChecksumAddress(from);
  const recipientAddress = safeToChecksumAddress(recipient);
  const tokenAddress = safeToChecksumAddress(assetAddress);

  if (
    !fromAddress ||
    !chainId ||
    !recipientAddress ||
    !tokenAddress ||
    amount === undefined
  ) {
    return undefined;
  }

  if (assetAddress === NATIVE_ADDRESS) {
    return {
      from: fromAddress,
      to: recipientAddress,
      value: bigIntToHex(amount),
      chainId,
    };
  }

  return {
    from: fromAddress,
    to: tokenAddress,
    value: '0x0',
    data: generateTransferData('transfer', {
      toAddress: recipientAddress,
      amount: bigIntToHex(amount),
    }),
    chainId,
  };
}
