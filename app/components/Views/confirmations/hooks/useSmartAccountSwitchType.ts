import { TransactionMeta } from '@metamask/transaction-controller';

import { EIP_7702_REVOKE_ADDRESS } from './useEIP7702Accounts';
import { useTransactionMetadataRequest } from './transactions/useTransactionMetadataRequest';

export function useSmartAccountSwitchType() {
  const transactionMetadata: TransactionMeta | undefined =
    useTransactionMetadataRequest();
  const { txParams } = transactionMetadata ?? {
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
    isUpgradeOnly,
    isAccountTypeSwitchOnly: isDowngrade || isUpgradeOnly,
  };
}
