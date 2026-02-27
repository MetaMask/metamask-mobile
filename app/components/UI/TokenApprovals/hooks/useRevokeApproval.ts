import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { Interface } from '@ethersproject/abi';
import { addTransaction } from '../../../../util/transaction-controller';
import {
  setRevocationStatus,
  removeApproval,
} from '../../../../core/redux/slices/tokenApprovals';
import { ApprovalItem, ApprovalAssetType } from '../types';
import {
  ERC20_APPROVE_ABI,
  ERC721_SET_APPROVAL_FOR_ALL_ABI,
} from '../constants/approvals';

import Engine from '../../../../core/Engine';

function buildRevokeTransactionData(approval: ApprovalItem): string {
  if (
    approval.asset.type === ApprovalAssetType.ERC721 ||
    approval.asset.type === ApprovalAssetType.ERC1155
  ) {
    const iface = new Interface(ERC721_SET_APPROVAL_FOR_ALL_ABI);
    return iface.encodeFunctionData('setApprovalForAll', [
      approval.spender.address,
      false,
    ]);
  }

  // ERC-20: approve(spender, 0)
  const iface = new Interface(ERC20_APPROVE_ABI);
  return iface.encodeFunctionData('approve', [approval.spender.address, 0]);
}

function getNetworkClientIdForChain(chainId: string): string | undefined {
  const { NetworkController } = Engine.context;
  const networkState = NetworkController.state;

  // Find network client for the given chainId
  for (const [clientId, config] of Object.entries(
    networkState.networkConfigurationsByChainId ?? {},
  )) {
    if (clientId.toLowerCase() === chainId.toLowerCase()) {
      const rpcEndpoints = (
        config as { rpcEndpoints?: { networkClientId: string }[] }
      ).rpcEndpoints;
      if (rpcEndpoints?.[0]?.networkClientId) {
        return rpcEndpoints[0].networkClientId;
      }
    }
  }

  return undefined;
}

export function useRevokeApproval() {
  const dispatch = useDispatch();

  const revokeApproval = useCallback(
    async (approval: ApprovalItem) => {
      dispatch(
        setRevocationStatus({
          id: approval.id,
          status: { status: 'pending' },
        }),
      );

      try {
        const data = buildRevokeTransactionData(approval);
        const networkClientId = getNetworkClientIdForChain(approval.chainId);

        const txParams = {
          to: approval.asset.address as `0x${string}`,
          from: undefined, // Will use selected account
          data: data as `0x${string}`,
          value: '0x0' as `0x${string}`,
        };

        const result = await addTransaction(txParams, {
          networkClientId,
          origin: 'MetaMask',
        });

        dispatch(
          setRevocationStatus({
            id: approval.id,
            status: {
              status: 'submitted',
              transactionHash: result.transactionMeta.hash,
            },
          }),
        );

        // Wait for the transaction to be confirmed
        await result.result;

        dispatch(
          setRevocationStatus({
            id: approval.id,
            status: { status: 'confirmed' },
          }),
        );

        // Remove from list after a short delay to show confirmed state
        setTimeout(() => {
          dispatch(removeApproval(approval.id));
        }, 2000);
      } catch (err) {
        dispatch(
          setRevocationStatus({
            id: approval.id,
            status: {
              status: 'failed',
              error: err instanceof Error ? err.message : 'Transaction failed',
            },
          }),
        );
      }
    },
    [dispatch],
  );

  return { revokeApproval };
}
