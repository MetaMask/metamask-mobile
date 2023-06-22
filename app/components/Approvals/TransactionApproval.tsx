import React, { useCallback } from 'react';
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
}

const TransactionApproval = (props: TransactionApprovalProps) => {
  const { approvalRequest, setApprovalRequestHandled } = useApprovalRequest();

  const onReject = useCallback(() => {
    setApprovalRequestHandled();
  }, [setApprovalRequestHandled]);

  if (approvalRequest?.type !== ApprovalTypes.TRANSACTION) return null;

  if (props.transactionType === TransactionModalType.Dapp) {
    return (
      <Approval
        navigation={props.navigation}
        dappTransactionModalVisible
        hideModal={onReject}
      />
    );
  }

  if (props.transactionType === TransactionModalType.Transaction) {
    return <Approve modalVisible hideModal={onReject} />;
  }
};

export default TransactionApproval;
