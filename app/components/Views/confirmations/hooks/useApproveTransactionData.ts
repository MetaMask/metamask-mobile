import { useMemo } from 'react';
import { APPROVAL_4BYTE_SELECTORS, ZERO_AMOUNT } from '../constants/approve';
import {
  get4ByteCode,
  parseStandardTokenTransactionData,
} from '../utils/transaction';
import { useTransactionMetadataRequest } from './transactions/useTransactionMetadataRequest';
import { ZERO_ADDRESS } from '../constants/address';
import { useGetTokenStandardAndDetails } from './useGetTokenStandardAndDetails';
import { TokenStandard } from '../types/token';
import { ApproveMethod } from '../types/approve';

type ApproveTransactionData = {
  // ERC20 specific
  amount?: string;

  // Approve method
  approveMethod?: ApproveMethod;

  // Permit2 specific
  expiration?: string;

  // Approval parsing loading state
  isLoading: boolean;

  // isRevoke approval
  isRevoke?: boolean;

  // Token standard
  tokenStandard?: TokenStandard;

  // Spender address
  spender?: string;

  // Permit2 specific
  token?: string;

  // ERC721 / ERC1155 specific
  tokenId?: string;
};

/**
 * Hook to parse and extract approval transaction data from current transaction.
 *
 * This hook analyzes transaction data to determine the type of approval operation
 * being performed (ERC20, ERC721, ERC1155, or Permit2) and extracts relevant
 * information such as spender address, amount, token ID, and whether it's a revoke operation.
 *
 * @returns {ApproveTransactionData} An object containing parsed approval transaction data:
 *   - `amount` - The approval amount (for ERC20 tokens)
 *   - `approveMethod` - The type of approval method used (APPROVE, INCREASE_ALLOWANCE, etc.)
 *   - `expiration` - Expiration timestamp (for Permit2 approvals)
 *   - `isLoading` - Whether the transaction data is still being processed
 *   - `isRevoke` - Whether this is a revoke operation (setting approval to zero/zero address)
 *   - `tokenStandard` - The token standard (ERC20, ERC721, ERC1155)
 *   - `spender` - The address being approved to spend tokens
 *   - `token` - The token address (for Permit2 approvals)
 *   - `tokenId` - The specific token ID (for ERC721/ERC1155 tokens)
 */
export const useApproveTransactionData = (): ApproveTransactionData => {
  const transactionMetadata = useTransactionMetadataRequest();

  const { txParams, networkClientId } = transactionMetadata ?? {};
  const data = txParams?.data ?? '0x';
  const contractAddress = txParams?.to;
  const { details, isPending: isTokenStandardPending } =
    useGetTokenStandardAndDetails(contractAddress, networkClientId);

  const tokenStandard = details?.standard;

  // Memoize parsing operations
  const { fourByteCode, parsedData } = useMemo(() => {
    if (!data) {
      return { fourByteCode: undefined, parsedData: undefined };
    }

    const fourByteCode = get4ByteCode(data);
    const parsedData = parseStandardTokenTransactionData(data);

    return { fourByteCode, parsedData };
  }, [data]);

  // Memoize the entire parsed approval data
  const parsedApproveData = useMemo((): ApproveTransactionData => {
    if (!transactionMetadata || isTokenStandardPending) {
      return {
        isLoading: true,
      };
    }    

    const result: ApproveTransactionData = {
      isLoading: false,
      isRevoke: false,
      tokenStandard: tokenStandard as TokenStandard,
      approveMethod: undefined,
    };

    switch (fourByteCode) {
      case APPROVAL_4BYTE_SELECTORS.APPROVE: {
        const [spender, amount] = parsedData?.args ?? [];

        const normalizedAmount = amount?.toString();

        result.spender = spender;

        if (tokenStandard === TokenStandard.ERC721) {
          result.tokenId = normalizedAmount;
          result.isRevoke =
            spender?.toLowerCase() === ZERO_ADDRESS.toLowerCase();
        } else {
          result.amount = normalizedAmount;
          result.isRevoke = normalizedAmount === ZERO_AMOUNT;
        }

        result.approveMethod = ApproveMethod.APPROVE;
        break;
      }
      case APPROVAL_4BYTE_SELECTORS.ERC20_DECREASE_ALLOWANCE:
      case APPROVAL_4BYTE_SELECTORS.ERC20_INCREASE_ALLOWANCE: {
        const [spender, amount] = parsedData?.args ?? [];
        result.spender = spender;
        result.amount = amount?.toString();
        result.isRevoke = false;
        result.approveMethod =
          fourByteCode === APPROVAL_4BYTE_SELECTORS.ERC20_DECREASE_ALLOWANCE
            ? ApproveMethod.DECREASE_ALLOWANCE
            : ApproveMethod.INCREASE_ALLOWANCE;
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
        result.amount = amount?.toString();
        result.expiration = expiration?.toString();
        result.isRevoke = amount?.toString() === ZERO_AMOUNT;
        result.approveMethod = ApproveMethod.PERMIT2_APPROVE;
        break;
      }
      default: {
        result.approveMethod = undefined;
        break;
      }
    }

    return result;
  }, [
    transactionMetadata,
    isTokenStandardPending,
    tokenStandard,
    fourByteCode,
    parsedData,
  ]);

  return parsedApproveData;
};
