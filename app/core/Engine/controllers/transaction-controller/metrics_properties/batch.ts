import {
  TransactionStatus,
  TransactionType,
  type TransactionMeta,
} from '@metamask/transaction-controller';
import { ORIGIN_METAMASK } from '@metamask/approval-controller';
import { Hex } from '@metamask/utils';

import type {
  TransactionMetrics,
  TransactionMetricsBuilderRequest,
} from '../types';
import { JsonMap } from '../../../../Analytics/MetaMetrics.types';
import { getMethodData } from '../../../../../util/transactions';
import { EIP5792ErrorCode } from '../../../../../constants/transaction';

const BATCHED_MESSAGE_TYPE = {
  WALLET_SEND_CALLS: 'wallet_sendCalls',
  ETH_SEND_TRANSACTION: 'eth_sendTransaction',
};

export async function getBatchMetricsProperties({
  transactionMeta,
}: TransactionMetricsBuilderRequest): Promise<TransactionMetrics> {
  const properties: JsonMap = {};
  const { delegationAddress, nestedTransactions, origin, txParams } =
    transactionMeta;
  const isExternal = origin && origin !== ORIGIN_METAMASK;
  const { authorizationList } = txParams;
  const isBatch = Boolean(nestedTransactions?.length);
  const isUpgrade = Boolean(authorizationList?.length);

  if (isExternal) {
    properties.api_method = isBatch
      ? BATCHED_MESSAGE_TYPE.WALLET_SEND_CALLS
      : BATCHED_MESSAGE_TYPE.ETH_SEND_TRANSACTION;
  }

  if (isBatch) {
    properties.batch_transaction_count = nestedTransactions?.length;
    properties.batch_transaction_method = 'eip7702';

    properties.transaction_contract_method =
      await getNestedMethodNames(transactionMeta);

    properties.transaction_contract_address = nestedTransactions
      ?.filter(
        (tx) =>
          tx.type === TransactionType.contractInteraction && tx.to?.length,
      )
      .map((tx) => tx.to as string);
  }

  if (transactionMeta.status === TransactionStatus.rejected) {
    const { error } = transactionMeta;

    properties.eip7702_upgrade_rejection =
      // @ts-expect-error Code has string type in controller
      isUpgrade && error.code === EIP5792ErrorCode.RejectedUpgrade;
  }
  properties.eip7702_upgrade_transaction = isUpgrade;
  properties.account_eip7702_upgraded = delegationAddress;

  return {
    properties,
    sensitiveProperties: {},
  };
}

async function getNestedMethodNames(
  transactionMeta: TransactionMeta,
): Promise<string[]> {
  const { nestedTransactions: transactions = [], networkClientId } =
    transactionMeta ?? {};
  const allData = transactions
    .filter((tx) => tx.type === TransactionType.contractInteraction && tx.data)
    .map((tx) => tx.data as Hex);

  const results = await Promise.all(
    allData.map((data) => getMethodData(data, networkClientId)),
  );

  const names = results
    .map((result) => result?.name)
    .filter((name) => name?.length) as string[];

  return names;
}
