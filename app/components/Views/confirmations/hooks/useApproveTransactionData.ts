import { useMemo } from 'react';

import { APPROVAL_4BYTE_SELECTORS, ZERO_AMOUNT } from '../constants/approve';
import {
  get4ByteCode,
  parseStandardTokenTransactionData,
} from '../utils/transaction';
import {
  calculateApprovalTokenAmount,
  calculateTokenBalance,
} from '../utils/approvals';

import { ZERO_ADDRESS } from '../constants/address';
import { TokenStandard } from '../types/token';
import { ApproveMethod } from '../types/approve';
import { useGetTokenStandardAndDetails } from './useGetTokenStandardAndDetails';
import { useTransactionMetadataRequest } from './transactions/useTransactionMetadataRequest';
import { useERC20TokenBalance } from './useERC20TokenBalance';

export interface ApproveTransactionData {
  // ERC20 specific - will be Unlimited if exceeds the max
  amount?: string;

  // Approve method
  approveMethod?: ApproveMethod;

  // Permit2 specific
  expiration?: string;

  // ERC20 specific
  decimals?: number;

  // Approval parsing loading state
  isLoading: boolean;

  // isRevoke approval
  isRevoke?: boolean;

  // ERC20 specific - amount in decimals
  rawAmount?: string;

  // Spender address
  spender?: string;

  // Permit2 specific
  token?: string;

  // ERC721 / ERC1155 specific
  tokenId?: string;

  // Token balance
  tokenBalance?: string;

  // Token standard
  tokenStandard?: TokenStandard;

  // Token Symbol
  tokenSymbol?: string;
}

/**
 * Hook to parse and extract approval transaction data from current transaction.
 *
 * This hook analyzes transaction data to determine the type of approval operation
 * being performed (ERC20, ERC721, ERC1155, or Permit2) and extracts relevant
 * information such as spender address, amount, token ID, and whether it's a revoke operation.
 *
 * @returns {ApproveTransactionData} An object containing parsed approval transaction data:
 * `amount` - The approval amount (for ERC20 tokens)
 * `approveMethod` - The type of approval method used (APPROVE, INCREASE_ALLOWANCE, etc.)
 * `expiration` - Expiration timestamp (for Permit2 approvals)
 * `isLoading` - Whether the transaction data is still being processed
 * `isRevoke` - Whether this is a revoke operation (setting approval to zero/zero address)
 * `tokenStandard` - The token standard (ERC20, ERC721, ERC1155)
 * `spender` - The address being approved to spend tokens
 * `token` - The token address (for Permit2 approvals)
 * `tokenId` - The specific token ID (for ERC721/ERC1155 tokens)
 */
export const useApproveTransactionData = (): ApproveTransactionData => {
  const transactionMetadata = useTransactionMetadataRequest();

  const { txParams, networkClientId } = transactionMetadata ?? {};
  const data = txParams?.data;
  const contractAddress = txParams?.to;
  const { details, isPending: isTokenStandardPending } =
    useGetTokenStandardAndDetails(contractAddress, networkClientId);
  const { tokenBalance } = useERC20TokenBalance(
    contractAddress as string,
    txParams?.from as string,
    networkClientId as string,
  );

  const tokenStandard = details?.standard?.toUpperCase();

  // Memoize parsing operations
  const { fourByteCode, parsedData } = useMemo(() => {
    if (!data) {
      return { fourByteCode: undefined, parsedData: undefined };
    }

    const code = get4ByteCode(data);
    const parsed = parseStandardTokenTransactionData(data);

    return { fourByteCode: code, parsedData: parsed };
  }, [data]);

  // Memoize the entire parsed approval data
  const parsedApproveData = useMemo((): ApproveTransactionData => {
    if (!transactionMetadata || isTokenStandardPending || !parsedData) {
      return {
        isLoading: true,
      };
    }

    const result: ApproveTransactionData = {
      approveMethod: undefined,
      decimals: details?.decimalsNumber,
      isLoading: false,
      isRevoke: false,
      tokenStandard: tokenStandard as TokenStandard,
      tokenBalance: undefined,
      tokenSymbol: details?.symbol as string,
    };

    switch (fourByteCode) {
      case APPROVAL_4BYTE_SELECTORS.APPROVE: {
        const [spender, amount] = parsedData?.args ?? [];

        result.spender = spender;

        if (tokenStandard === TokenStandard.ERC721) {
          result.tokenId = amount?.toString();
          result.isRevoke =
            spender?.toLowerCase() === ZERO_ADDRESS.toLowerCase();
        } else {
          const { amount: amountInDecimals, rawAmount } =
            calculateApprovalTokenAmount(
              amount?.toString() as string,
              details.decimalsNumber,
            );
          result.amount = amountInDecimals;
          result.rawAmount = rawAmount;
          result.isRevoke = amount?.toString() === ZERO_AMOUNT;
          result.tokenBalance = calculateTokenBalance(
            tokenBalance ?? '0',
            details.decimalsNumber,
          );
        }

        result.approveMethod = ApproveMethod.APPROVE;
        break;
      }
      case APPROVAL_4BYTE_SELECTORS.ERC20_DECREASE_ALLOWANCE:
      case APPROVAL_4BYTE_SELECTORS.ERC20_INCREASE_ALLOWANCE: {
        const [spender, amount] = parsedData?.args ?? [];
        const { amount: amountInDecimals, rawAmount } =
          calculateApprovalTokenAmount(
            amount?.toString() as string,
            details.decimalsNumber,
          );
        result.amount = amountInDecimals;
        result.rawAmount = rawAmount;
        result.spender = spender;
        result.isRevoke = false;
        result.approveMethod =
          fourByteCode === APPROVAL_4BYTE_SELECTORS.ERC20_DECREASE_ALLOWANCE
            ? ApproveMethod.DECREASE_ALLOWANCE
            : ApproveMethod.INCREASE_ALLOWANCE;
        result.tokenBalance = calculateTokenBalance(
          tokenBalance ?? '0',
          details.decimalsNumber,
        );
        break;
      }
      case APPROVAL_4BYTE_SELECTORS.SET_APPROVAL_FOR_ALL: {
        const [spender, approved] = parsedData?.args ?? [];
        result.spender = spender;
        result.isRevoke = !approved;
        result.approveMethod = ApproveMethod.SET_APPROVAL_FOR_ALL;
        break;
      }
      case APPROVAL_4BYTE_SELECTORS.PERMIT2_APPROVE: {
        const [token, spender, amount, expiration] = parsedData?.args ?? [];
        result.token = token;
        result.spender = spender;
        const { amount: amountInDecimals, rawAmount } =
          calculateApprovalTokenAmount(
            amount?.toString() as string,
            details.decimalsNumber,
          );
        result.amount = amountInDecimals;
        result.rawAmount = rawAmount;
        result.expiration = expiration?.toString();
        result.isRevoke = amount?.toString() === ZERO_AMOUNT;
        result.approveMethod = ApproveMethod.PERMIT2_APPROVE;
        result.tokenBalance = calculateTokenBalance(
          tokenBalance ?? '0',
          details.decimalsNumber,
        );
        break;
      }
      default: {
        result.approveMethod = undefined;
        break;
      }
    }

    return result;
  }, [
    details.decimalsNumber,
    details.symbol,
    isTokenStandardPending,
    tokenStandard,
    fourByteCode,
    parsedData,
    transactionMetadata,
    tokenBalance,
  ]);

  return parsedApproveData;
};
