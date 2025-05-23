import { TransactionMeta } from '@metamask/transaction-controller';

import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { EIP_7702_REVOKE_ADDRESS } from './useEIP7702Accounts';

export function use7702TransactionType() {
  const transactionMetadata: TransactionMeta | undefined =
    useTransactionMetadataRequest();

  const { nestedTransactions, txParams } = transactionMetadata ?? {
    txParams: { data: '', authorizationList: [] },
  };
  const { authorizationList, data } = txParams ?? { data: '' };
  const authorizationAddress = authorizationList?.[0]?.address;

  const isDowngrade =
    Boolean(authorizationAddress) &&
    authorizationAddress === EIP_7702_REVOKE_ADDRESS;

  const isUpgrade =
    Boolean(authorizationAddress) &&
    authorizationAddress !== EIP_7702_REVOKE_ADDRESS;

  const isUpgradeOnly = isUpgrade && (!data || data === '0x');

  return {
    isDowngrade,
    isUpgrade,
    isBatched: !isUpgrade && Boolean(nestedTransactions?.length),
    isBatchedUpgrade: isUpgrade && Boolean(nestedTransactions?.length),
    isUpgradeOnly,
  };
}
