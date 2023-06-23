import React from 'react';
import useApprovalRequest from '../hooks/useApprovalRequest';
import { ApprovalTypes } from '../../core/RPCMethods/RPCMethodMiddleware';
import Approval from '../Views/Approval';
import Approve from '../Views/ApproveView/Approve';
import QRSigningModal from '../UI/QRHardware/QRSigningModal';
import withQRHardwareAwareness from '../UI/QRHardware/withQRHardwareAwareness';
import { IQRState } from '../UI/QRHardware/types';

export enum TransactionModalType {
  Transaction = 'transaction',
  Dapp = 'dapp',
}

export interface TransactionApprovalProps {
  transactionType: TransactionModalType;
  navigation: any;
  onReject: () => void;
  QRState?: IQRState;
  isSigningQRObject?: boolean;
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

  if (props.isSigningQRObject) {
    return <QRSigningModal isVisible QRState={props.QRState as any} />;
  }

  return null;
};

export default withQRHardwareAwareness(TransactionApproval as any);
