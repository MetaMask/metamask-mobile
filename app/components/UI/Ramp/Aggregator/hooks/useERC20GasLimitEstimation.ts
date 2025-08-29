import { useState, useCallback } from 'react';
import { TransactionParams } from '@metamask/transaction-controller';
import { toHex } from '@metamask/controller-utils';
import useInterval from '../../../../hooks/useInterval';
import { getGasLimit } from '../../../../../util/custom-gas';
import { safeToChecksumAddress } from '../../../../../util/address';
import { generateTransferData } from '../../../../../util/transactions';
import { addHexPrefix, BN } from 'ethereumjs-util';
import { toTokenMinimalUnit } from '../../../../../util/number/legacy';

const TRANSFER_GAS_LIMIT = 21000;
const POLLING_INTERVAL = 15000; // 15s

interface Options {
  tokenAddress?: string;
  fromAddress: string | null;
  chainId: string;
  amount: string;
  decimals: number;
  isNativeToken: boolean;
}

/**
 * Returns the estimated gas limit for an ERC20 transfer.
 *
 * @param options - The options object
 * @param options.tokenAddress - The token address. If provided, will estimate gas limit for ERC20 transfer
 * @param options.fromAddress - The address of the sender. Needs to be provided to estimate gas limit for ERC20 transfer
 * @param options.chainId - The chain ID for the network. Required for accurate ERC20 gas estimation
 * @param options.amount - The amount of the token to transfer. Required for accurate ERC20 gas estimation
 * @returns The estimated gas limit as a number
 */
function useERC20GasLimitEstimation({
  tokenAddress,
  fromAddress,
  chainId,
  amount,
  decimals,
  isNativeToken,
}: Options) {
  const [estimatedGasLimit, setEstimatedGasLimit] =
    useState(TRANSFER_GAS_LIMIT);

  const estimateERC20GasLimit = useCallback(() => {
    if (!tokenAddress || isNativeToken) {
      return;
    }

    const estimateGas = async () => {
      try {
        if (!fromAddress) {
          return;
        }

        const amountInMinimalUnit = toTokenMinimalUnit(amount, decimals);
        const amountHex = addHexPrefix(
          new BN(amountInMinimalUnit.toString()).toString('hex'),
        );

        const dummyToAddress = '0x1234567890123456789012345678901234567890';

        const transaction: TransactionParams = {
          from: safeToChecksumAddress(fromAddress as string) as string,
          to: safeToChecksumAddress(tokenAddress),
          value: '0x0',
          data: generateTransferData('transfer', {
            toAddress: safeToChecksumAddress(dummyToAddress),
            amount: amountHex,
          }),
          chainId: toHex(chainId),
        };

        const gasLimitResponse = await getGasLimit(transaction);
        setEstimatedGasLimit(gasLimitResponse.gas.toNumber());
      } catch (error) {
        console.error('Failed to estimate ERC20 transfer gas limit:', error);
      }
    };

    estimateGas();
  }, [tokenAddress, fromAddress, amount, decimals, chainId, isNativeToken]);

  useInterval(
    () => {
      estimateERC20GasLimit();
    },
    { delay: isNativeToken ? null : POLLING_INTERVAL, immediate: true },
  );

  return estimatedGasLimit;
}

export default useERC20GasLimitEstimation;
