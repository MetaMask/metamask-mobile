import { useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { TransactionType } from '@metamask/transaction-controller';
import { addTransaction } from '../../../../util/transaction-controller';
import {
  setRevocationStatus,
  clearRevocationStatuses,
  removeApproval,
} from '../../../../core/redux/slices/tokenApprovals';
import { ApprovalItem, ApprovalAssetType } from '../types';
import {
  buildRevokeTransactionData,
  getNetworkClientIdForChain,
} from '../utils/revokeTransaction';
import { selectSelectedInternalAccountAddress } from '../../../../selectors/accountsController';
import { isUserRejection } from '../utils/isUserRejection';

function getTransactionType(approval: ApprovalItem) {
  if (
    approval.asset.type === ApprovalAssetType.ERC721 ||
    approval.asset.type === ApprovalAssetType.ERC1155
  ) {
    return TransactionType.tokenMethodSetApprovalForAll;
  }
  return TransactionType.tokenMethodApprove;
}

export function useRevokeApproval() {
  const dispatch = useDispatch();
  const address = useSelector(selectSelectedInternalAccountAddress);

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
          from: address as `0x${string}`,
          data: data as `0x${string}`,
          value: '0x0' as `0x${string}`,
        };

        const result = await addTransaction(txParams, {
          networkClientId,
          origin: 'MetaMask',
          type: getTransactionType(approval),
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
        if (isUserRejection(err)) {
          dispatch(clearRevocationStatuses([approval.id]));
          return;
        }
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
    [dispatch, address],
  );

  return { revokeApproval };
}
