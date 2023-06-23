import React from 'react';
import useApprovalRequest from '../hooks/useApprovalRequest';
import { ApprovalTypes } from '../../core/RPCMethods/RPCMethodMiddleware';
import Approval from '../Views/Approval';
import Approve from '../Views/ApproveView/Approve';

export enum TransactionModalType {
  Transaction = 'transaction',
  Dapp = 'dapp',
}

export interface TransactionApprovalProps {
  transactionType: TransactionModalType;
  navigation: any;
  onReject: () => void;
}

const TransactionApproval = (props: TransactionApprovalProps) => {
  const { approvalRequest } = useApprovalRequest();

  if (approvalRequest?.type !== ApprovalTypes.TRANSACTION) return null;

  if (props.transactionType === TransactionModalType.Dapp) {
    return (
      <Approval
        navigation={props.navigation}
        dappTransactionModalVisible
        hideModal={props.onReject}
      />
    );
  }

  if (props.transactionType === TransactionModalType.Transaction) {
    return <Approve modalVisible hideModal={props.onReject} />;
  }

  return null;
};

export default TransactionApproval;
