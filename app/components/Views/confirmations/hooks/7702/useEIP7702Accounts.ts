import { Hex } from '@metamask/utils';
import { NetworkConfiguration } from '@metamask/network-controller';
import {
  TransactionEnvelopeType,
  TransactionType,
} from '@metamask/transaction-controller';
import { useCallback } from 'react';

import { addMMOriginatedTransaction } from '../../utils/transaction';

export const EIP_7702_REVOKE_ADDRESS =
  '0x0000000000000000000000000000000000000000';

interface UseEIP7702AccountsOptions {
  requireApproval?: boolean;
}

export function useEIP7702Accounts(
  networkConfiguration: NetworkConfiguration | undefined,
  { requireApproval = true }: UseEIP7702AccountsOptions = {},
) {
  const defaultRpcEndpoint =
    networkConfiguration?.rpcEndpoints[
      networkConfiguration.defaultRpcEndpointIndex
    ];
  const networkClientId = (
    defaultRpcEndpoint as { networkClientId?: string } | undefined
  )?.networkClientId;

  const requireNetworkClientId = useCallback(() => {
    if (!networkClientId) {
      throw new Error('Network client ID is required to update account type');
    }
    return networkClientId;
  }, [networkClientId]);

  const downgradeAccount = useCallback(
    (address: Hex) =>
      addMMOriginatedTransaction(
        {
          authorizationList: [
            {
              address: EIP_7702_REVOKE_ADDRESS,
            },
          ],
          from: address,
          to: address,
          type: TransactionEnvelopeType.setCode,
        },
        {
          networkClientId: requireNetworkClientId(),
          requireApproval,
          type: TransactionType.revokeDelegation,
        },
      ),
    [requireApproval, requireNetworkClientId],
  );

  const upgradeAccount = useCallback(
    (address: Hex, upgradeContractAddress: Hex) =>
      addMMOriginatedTransaction(
        {
          authorizationList: [
            {
              address: upgradeContractAddress,
            },
          ],
          from: address,
          to: address,
          type: TransactionEnvelopeType.setCode,
        },
        {
          networkClientId: requireNetworkClientId(),
          requireApproval,
          type: TransactionType.batch,
        },
      ),
    [requireApproval, requireNetworkClientId],
  );

  return { downgradeAccount, upgradeAccount };
}
