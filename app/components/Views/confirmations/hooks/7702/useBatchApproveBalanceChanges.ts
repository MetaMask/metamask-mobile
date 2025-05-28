import BigNumber from 'bignumber.js';
import {
  BatchTransactionParams,
  SimulationTokenBalanceChange,
  SimulationTokenStandard,
} from '@metamask/transaction-controller';
import { add0x, Hex } from '@metamask/utils';
import { useMemo } from 'react';

import useBalanceChanges from '../../../../UI/SimulationDetails/useBalanceChanges';
import { BalanceChange } from '../../../../UI/SimulationDetails/types';
import { useAsyncResult } from '../../../../hooks/useAsyncResult';
import { TOKEN_VALUE_UNLIMITED_THRESHOLD } from '../../utils/confirm';
import { memoizedGetTokenStandardAndDetails } from '../../utils/token';
import { parseStandardTokenTransactionData } from '../../utils/transaction';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';

type ApprovalSimulationBalanceChange = SimulationTokenBalanceChange & {
  isAll: boolean;
  isUnlimited: boolean;
  nestedTransactionIndex: number;
};

export type ApprovalBalanceChange = BalanceChange & {
  nestedTransactionIndex: number;
};

export function useBatchApproveBalanceChanges(): {
  pending: boolean;
  value: ApprovalBalanceChange[];
} {
  const transactionMeta = useTransactionMetadataRequest();
  const { chainId, nestedTransactions, networkClientId } =
    transactionMeta ?? {};

  const { value: simulationBalanceChanges, pending: pendingSimulationChanges } =
    useBatchApproveSimulationBalanceChanges({
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
  nestedTransactions,
}: {
  nestedTransactions?: BatchTransactionParams[];
}) {
  return useAsyncResult(
    async () =>
      buildSimulationTokenBalanceChanges({
        nestedTransactions,
      }),
    [nestedTransactions],
  );
}

export function parseApprovalTransactionData(data: Hex):
  | {
      amountOrTokenId?: BigNumber;
      isApproveAll?: boolean;
      isRevokeAll?: boolean;
    }
  | undefined {
  const transactionDescription = parseStandardTokenTransactionData(data);
  const { args, name } = transactionDescription ?? {};

  if (
    !['approve', 'increaseAllowance', 'setApprovalForAll'].includes(name ?? '')
  ) {
    return undefined;
  }

  const rawAmountOrTokenId =
    args?._value ?? // ERC-20 - approve
    args?.increment; // Fiat Token V2 - increaseAllowance

  const amountOrTokenId = rawAmountOrTokenId
    ? new BigNumber(rawAmountOrTokenId?.toString())
    : undefined;

  const isApproveAll = name === 'setApprovalForAll' && args?._approved === true;
  const isRevokeAll = name === 'setApprovalForAll' && args?._approved === false;

  return {
    amountOrTokenId,
    isApproveAll,
    isRevokeAll,
  };
}

async function buildSimulationTokenBalanceChanges({
  nestedTransactions,
}: {
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

    const { amountOrTokenId, isApproveAll: isAll } = parseResult;
    const amountOrTokenIdHex = add0x(amountOrTokenId?.toString(16) ?? '0x0');

    const difference =
      isNFT || amountOrTokenId === undefined ? '0x1' : amountOrTokenIdHex;

    const tokenId = isNFT && amountOrTokenId ? amountOrTokenIdHex : undefined;

    const isUnlimited =
      !isNFT &&
      (amountOrTokenId?.toNumber() ?? 0) > TOKEN_VALUE_UNLIMITED_THRESHOLD;

    const balanceChange: ApprovalSimulationBalanceChange = {
      address: to as Hex,
      difference,
      id: tokenId,
      isAll: isAll ?? false,
      isDecrease: true,
      isUnlimited,
      newBalance: '0x0',
      nestedTransactionIndex: i,
      previousBalance: '0x0',
      standard,
    };

    balanceChanges.push(balanceChange);
  }
  return balanceChanges;
}
