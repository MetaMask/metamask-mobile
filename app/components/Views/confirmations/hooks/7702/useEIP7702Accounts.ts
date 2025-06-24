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

export function useEIP7702Accounts(networkConfiguration: NetworkConfiguration) {
  const defaultRpcEndpoint =
    networkConfiguration.rpcEndpoints[
      networkConfiguration.defaultRpcEndpointIndex
    ];
  const { networkClientId } = defaultRpcEndpoint as { networkClientId: string };

  const downgradeAccount = useCallback(
    async (address: Hex) => {
      await addMMOriginatedTransaction(
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
          networkClientId,
          type: TransactionType.revokeDelegation,
        },
      );
    },
    [networkClientId],
  );

  const upgradeAccount = useCallback(
    async (address: Hex, upgradeContractAddress: Hex) => {
      await addMMOriginatedTransaction(
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
          networkClientId,
          type: TransactionType.batch,
        },
      );
    },
    [networkClientId],
  );

  return { downgradeAccount, upgradeAccount };
}
