import { Interface } from '@ethersproject/abi';
import type { Hex } from '@metamask/utils';
import { TransactionType } from '@metamask/transaction-controller';
import Engine from '../../../../core/Engine';
import { ApprovalItem, ApprovalAssetType } from '../types';
import {
  ERC20_APPROVE_ABI,
  ERC721_SET_APPROVAL_FOR_ALL_ABI,
} from '../constants/approvals';

export function getTransactionType(approval: ApprovalItem) {
  if (
    approval.asset.type === ApprovalAssetType.ERC721 ||
    approval.asset.type === ApprovalAssetType.ERC1155
  ) {
    return TransactionType.tokenMethodSetApprovalForAll;
  }
  return TransactionType.tokenMethodApprove;
}

export function buildRevokeTransactionData(approval: ApprovalItem): string {
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

export function getNetworkClientIdForChain(chainId: string): string {
  const { NetworkController } = Engine.context;
  const clientId = NetworkController.findNetworkClientIdByChainId(
    chainId as Hex,
  );
  if (!clientId) {
    throw new Error(`No network client found for chain ${chainId}`);
  }
  return clientId;
}
