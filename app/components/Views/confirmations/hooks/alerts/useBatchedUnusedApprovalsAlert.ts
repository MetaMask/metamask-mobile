import { Hex } from '@metamask/utils';
import {
  NestedTransactionMetadata,
  SimulationTokenBalanceChange,
} from '@metamask/transaction-controller';
import { useMemo } from 'react';

import { strings } from '../../../../../../locales/i18n';
import { TokenStandard } from '../../../../UI/SimulationDetails/types';
import { useAsyncResult } from '../../../../hooks/useAsyncResult';
import { APPROVAL_TYPES } from '../../constants/approvals';
import { AlertKeys } from '../../constants/alerts';
import { RowAlertKey } from '../../components/UI/info-row/alert-row/constants';
import { Severity } from '../../types/alerts';
import { memoizedGetTokenStandardAndDetails } from '../../utils/token';
import {
  parseApprovalTransactionData,
  ParsedApprovalTransactionData,
} from '../../utils/approvals';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';

function getParsedDataAndTokenAddress(transaction: NestedTransactionMetadata): {
  parseResult?: ParsedApprovalTransactionData;
  actualTokenAddress?: Hex;
} {
  const { data, to } = transaction;
  if (!data || !to) {
    return {};
  }

  const parseResult = parseApprovalTransactionData(data);
  if (!parseResult) {
    return {};
  }

  const { name, tokenAddress } = parseResult;

  let actualTokenAddress: Hex;
  switch (name) {
    case APPROVAL_TYPES.approve:
      actualTokenAddress = tokenAddress ?? to;
      break;
    case APPROVAL_TYPES.increaseAllowance:
    case APPROVAL_TYPES.setApprovalForAll:
      actualTokenAddress = to;
      break;
    default:
      return { parseResult };
  }

  return { parseResult, actualTokenAddress };
}

function getUniqueTokenAddresses(
  nestedTransactions: NestedTransactionMetadata[],
): Hex[] {
  const addresses: Hex[] = [];

  nestedTransactions.forEach((transaction) => {
    const { actualTokenAddress } = getParsedDataAndTokenAddress(transaction);

    if (actualTokenAddress) {
      addresses.push(actualTokenAddress);
    }
  });

  return addresses;
}

async function fetchTokenStandards(
  tokenAddresses: Hex[],
): Promise<Record<Hex, TokenStandard>> {
  if (!tokenAddresses.length) {
    return {};
  }

  const standards: Record<Hex, TokenStandard> = {};
  await Promise.all(
    tokenAddresses.map(async (address) => {
      try {
        const details = await memoizedGetTokenStandardAndDetails({
          tokenAddress: address,
        });
        const standard = details?.standard as TokenStandard;
        standards[address] = Object.values(TokenStandard).includes(standard)
          ? standard
          : TokenStandard.none;
      } catch (error) {
        console.warn(`Failed to get token standard for ${address}:`, error);
        standards[address] = TokenStandard.none;
      }
    }),
  );

  return standards;
}

function shouldSkipApproval(
  parseResult: ReturnType<typeof parseApprovalTransactionData>,
  tokenStandards: Record<Hex, TokenStandard>,
  tokenAddress: Hex,
): boolean {
  if (!parseResult) {
    return true;
  }

  // Skip setApprovalForAll revocations
  if (parseResult.isRevokeAll) {
    return true;
  }

  // Check if this is a revocation based on token standard
  if (parseResult.amountOrTokenId?.isZero()) {
    const tokenStandard = tokenStandards[tokenAddress];

    // Only skip zero amounts for ERC20 tokens (revocations)
    // For ERC721/ERC1155, token ID 0 is valid and should not be skipped
    if (tokenStandard === TokenStandard.ERC20) {
      return true;
    }
    // For unknown token standards or NFTs, we don't skip to avoid false negatives
  }

  return false;
}

async function extractApprovals(
  nestedTransactions: NestedTransactionMetadata[],
): Promise<Hex[]> {
  const tokenAddresses = getUniqueTokenAddresses(nestedTransactions);
  const tokenStandards = await fetchTokenStandards(tokenAddresses);

  const approvalsList: Hex[] = [];

  nestedTransactions.forEach((transaction) => {
    const { parseResult, actualTokenAddress } =
      getParsedDataAndTokenAddress(transaction);

    if (actualTokenAddress === undefined) {
      return;
    }

    if (shouldSkipApproval(parseResult, tokenStandards, actualTokenAddress)) {
      return;
    }

    approvalsList.push(actualTokenAddress.toLowerCase() as Hex);
  });

  return approvalsList;
}

function getTokensWithDecrease(
  simulationDataArray: SimulationTokenBalanceChange[],
): Hex[] {
  return (
    simulationDataArray
      ?.filter((change) => change.isDecrease)
      .map((change) => change.address.toLowerCase() as Hex) ?? []
  );
}

function findUnusedApprovals(approvals: Hex[], tokenOutflows: Hex[]): Hex[] {
  if (approvals.length === 0) {
    return [];
  }
  return approvals.filter((approval) => !tokenOutflows.includes(approval));
}

export const useBatchedUnusedApprovalsAlert = () => {
  const transactionMetadata = useTransactionMetadataRequest();

  const nestedTransactions = transactionMetadata?.nestedTransactions;
  const simulationDataArray =
    transactionMetadata?.simulationData?.tokenBalanceChanges;

  const { value: approvals } = useAsyncResult(async () => {
    if (!nestedTransactions?.length) {
      return [];
    }

    return await extractApprovals(nestedTransactions);
  }, [nestedTransactions]);

  const tokenOutflows = useMemo(() => {
    if (!simulationDataArray) {
      return [];
    }

    return getTokensWithDecrease(simulationDataArray);
  }, [simulationDataArray]);

  const unusedApprovals = useMemo(() => {
    if (!approvals) {
      return [];
    }

    return findUnusedApprovals(approvals, tokenOutflows);
  }, [approvals, tokenOutflows]);

  const shouldShowAlert =
    unusedApprovals.length > 0 && Boolean(transactionMetadata?.simulationData);

  return useMemo(() => {
    if (!shouldShowAlert) {
      return [];
    }

    return [
      {
        isBlocking: false,
        field: RowAlertKey.BatchedApprovals,
        key: AlertKeys.BatchedUnusedApprovals,
        message: strings('alert_system.batched_unused_approvals.message'),
        title: strings('alert_system.batched_unused_approvals.title'),
        severity: Severity.Danger,
        skipConfirmation: true,
      },
    ];
  }, [shouldShowAlert]);
};
