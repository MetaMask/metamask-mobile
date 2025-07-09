import {
  BatchTransactionParams,
  SimulationTokenBalanceChange,
  SimulationTokenStandard,
} from '@metamask/transaction-controller';
import { add0x, Hex } from '@metamask/utils';
import { toHex } from '@metamask/controller-utils';
import { useMemo } from 'react';

import useBalanceChanges from '../../../../UI/SimulationDetails/useBalanceChanges';
import { BalanceChange } from '../../../../UI/SimulationDetails/types';
import { useAsyncResult } from '../../../../hooks/useAsyncResult';
import { TOKEN_VALUE_UNLIMITED_THRESHOLD } from '../../utils/confirm';
import {
  memoizedGetTokenStandardAndDetails,
  TokenDetailsERC20,
} from '../../utils/token';
import { parseApprovalTransactionData } from '../../utils/approvals';
import { ApproveMethod } from '../../types/approve';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';

type ApprovalSimulationBalanceChange = SimulationTokenBalanceChange & {
  tokenSymbol?: string;
  isAll: boolean;
  isUnlimited: boolean;
  nestedTransactionIndex: number;
  approveMethod: ApproveMethod;
};

export type ApprovalBalanceChange = BalanceChange & {
  approveMethod?: ApproveMethod;
  nestedTransactionIndex: number;
};

export function useBatchApproveBalanceChanges(): {
  pending: boolean;
  value: ApprovalBalanceChange[];
} {
  const transactionMeta = useTransactionMetadataRequest();
  const {
    chainId,
    nestedTransactions,
    networkClientId,
    txParams: { from },
  } = transactionMeta ?? { txParams: {} };

  const { value: simulationBalanceChanges, pending: pendingSimulationChanges } =
    useBatchApproveSimulationBalanceChanges({
      from: from as Hex,
      nestedTransactions,
    });

  const { value: balanceChanges, pending: pendingBalanceChanges } =
    useBalanceChanges({
      chainId: chainId as Hex,
      simulationData: {
        tokenBalanceChanges: simulationBalanceChanges ?? [],
      },
      networkClientId: networkClientId as string,
    });

  const finalBalanceChanges = useMemo(
    () =>
      (balanceChanges ?? []).map<ApprovalBalanceChange>((change, index) => {
        const simulation = simulationBalanceChanges?.[index];

        return {
          ...change,
          approveMethod: simulation?.approveMethod,
          isApproval: true,
          isAllApproval: simulation?.isAll ?? false,
          isUnlimitedApproval: simulation?.isUnlimited ?? false,
          nestedTransactionIndex: simulation?.nestedTransactionIndex ?? -1,
        };
      }),
    [balanceChanges, simulationBalanceChanges],
  );

  return {
    pending: pendingSimulationChanges || pendingBalanceChanges,
    value: finalBalanceChanges,
  };
}

function useBatchApproveSimulationBalanceChanges({
  from,
  nestedTransactions,
}: {
  from?: Hex;
  nestedTransactions?: BatchTransactionParams[];
}) {
  return useAsyncResult(
    async () =>
      buildSimulationTokenBalanceChanges({
        from,
        nestedTransactions,
      }),
    [nestedTransactions],
  );
}

async function buildSimulationTokenBalanceChanges({
  from,
  nestedTransactions,
}: {
  from?: Hex;
  nestedTransactions?: BatchTransactionParams[];
}): Promise<ApprovalSimulationBalanceChange[]> {
  const balanceChanges: ApprovalSimulationBalanceChange[] = [];

  if (!nestedTransactions) {
    return balanceChanges;
  }

  for (let i = 0; i < nestedTransactions.length; i++) {
    const transaction = nestedTransactions[i];
    const { data, to } = transaction;

    if (!data || !to) {
      continue;
    }

    const tokenData = await memoizedGetTokenStandardAndDetails({
      tokenAddress: to,
      userAddress: from,
    });

    if (!tokenData?.standard) {
      continue;
    }

    const standard =
      tokenData?.standard?.toLowerCase() as SimulationTokenStandard;

    const isNFT = standard !== SimulationTokenStandard.erc20;

    const parseResult = parseApprovalTransactionData(data as Hex);

    if (!parseResult) {
      continue;
    }

    const { amountOrTokenId, isApproveAll: isAll, name } = parseResult;
    const amountOrTokenIdHex = add0x(amountOrTokenId?.toString(16) ?? '0x0');

    const difference =
      isNFT || amountOrTokenId === undefined ? '0x1' : amountOrTokenIdHex;

    const tokenId = isNFT && amountOrTokenId ? amountOrTokenIdHex : undefined;

    const isUnlimited =
      !isNFT &&
      (amountOrTokenId?.abs().toNumber() ?? 0) >
        TOKEN_VALUE_UNLIMITED_THRESHOLD;

    const balanceChange: ApprovalSimulationBalanceChange = {
      address: to as Hex,
      approveMethod: name,
      difference,
      id: tokenId,
      isAll: isAll ?? false,
      isDecrease: true,
      isUnlimited,
      newBalance: '0x0',
      nestedTransactionIndex: i,
      previousBalance: toHex((tokenData as TokenDetailsERC20).balance ?? '0x0'),
      standard,
      tokenSymbol: tokenData.symbol,
    };

    balanceChanges.push(balanceChange);
  }
  return balanceChanges;
}
