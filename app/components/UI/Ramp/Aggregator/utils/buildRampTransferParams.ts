import { TransactionParams } from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';

import { NATIVE_ADDRESS } from '../../../../../constants/on-ramp';
import {
  isValidHexAddress,
  toChecksumAddress,
} from '../../../../../util/address';
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
 * Builds the native or ERC-20 transfer Ramp submits for a sell.
 *
 * BuildQuote estimates the same transaction shape with a random unfunded
 * recipient and 1 wei; SendTransaction builds a separate object from the
 * order's real deposit wallet and amount.
 *
 * @returns The transaction params, or `undefined` when the shape is incomplete
 * or an address is not a valid EVM address.
 */
export function buildRampTransferParams({
  from,
  chainId,
  assetAddress,
  recipient,
  amount,
}: BuildRampTransferParamsArgs): TransactionParams | undefined {
  if (
    !from ||
    !isValidHexAddress(from) ||
    !recipient ||
    !isValidHexAddress(recipient) ||
    !assetAddress ||
    !isValidHexAddress(assetAddress) ||
    !chainId ||
    amount === undefined
  ) {
    return undefined;
  }

  const fromAddress = toChecksumAddress(from);
  const recipientAddress = toChecksumAddress(recipient);
  const tokenAddress = toChecksumAddress(assetAddress);

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
