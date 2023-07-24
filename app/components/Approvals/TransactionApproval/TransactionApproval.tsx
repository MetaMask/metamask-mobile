import React, { useCallback, useState } from 'react';
import useApprovalRequest from '../../hooks/useApprovalRequest';
import { ApprovalTypes } from '../../../core/RPCMethods/RPCMethodMiddleware';
import Approval from '../../Views/Approval';
import Approve from '../../Views/ApproveView/Approve';
import QRSigningModal from '../../UI/QRHardware/QRSigningModal';
import withQRHardwareAwareness from '../../UI/QRHardware/withQRHardwareAwareness';
import { IQRState } from '../../UI/QRHardware/types';

export enum TransactionModalType {
  Transaction = 'transaction',
  Dapp = 'dapp',
}

export interface TransactionApprovalProps {
  transactionType?: TransactionModalType;
  navigation: any;
  onComplete: () => void;
  QRState?: IQRState;
  isSigningQRObject?: boolean;
}

const TransactionApprovalInternal = (props: TransactionApprovalProps) => {
  const { approvalRequest } = useApprovalRequest();
  const [modalVisible, setModalVisible] = useState(false);
  const { onComplete: propsOnComplete } = props;

  const onComplete = useCallback(() => {
    setModalVisible(false);
    propsOnComplete();
  }, [propsOnComplete]);

  if (approvalRequest?.type !== ApprovalTypes.TRANSACTION && !modalVisible) {
    return null;
  }

  if (!modalVisible) {
    setModalVisible(true);
  }

  if (props.transactionType === TransactionModalType.Dapp) {
    return (
      <Approval
        navigation={props.navigation}
        dappTransactionModalVisible
        hideModal={onComplete}
      />
    );
  }

  if (props.transactionType === TransactionModalType.Transaction) {
    return <Approve modalVisible hideModal={onComplete} />;
  }

  if (props.isSigningQRObject && !props.transactionType) {
    return (
      <QRSigningModal
        isVisible
        QRState={props.QRState as any}
        onSuccess={onComplete}
        onCancel={onComplete}
        onFailure={onComplete}
      />
    );
  }

  return null;
};

export const TransactionApproval = withQRHardwareAwareness(
  TransactionApprovalInternal as any,
);
