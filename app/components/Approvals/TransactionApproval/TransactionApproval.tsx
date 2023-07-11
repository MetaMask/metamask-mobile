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
  onReject: () => void;
  QRState?: IQRState;
  isSigningQRObject?: boolean;
}

const TransactionApprovalInternal = (props: TransactionApprovalProps) => {
  const { approvalRequest } = useApprovalRequest();
  const [modalVisible, setModalVisible] = useState(false);
  const { onReject: propsOnReject } = props;

  const onReject = useCallback(() => {
    setModalVisible(false);
    propsOnReject();
  }, [propsOnReject]);

  if (approvalRequest?.type !== ApprovalTypes.TRANSACTION && !modalVisible)
    return null;

  if (props.transactionType === TransactionModalType.Dapp) {
    if (!modalVisible) {
      setModalVisible(true);
    }

    return (
      <Approval
        navigation={props.navigation}
        dappTransactionModalVisible
        hideModal={onReject}
      />
    );
  }

  if (props.transactionType === TransactionModalType.Transaction) {
    if (!modalVisible) {
      setModalVisible(true);
    }

    return <Approve modalVisible hideModal={onReject} />;
  }

  if (props.isSigningQRObject) {
    return <QRSigningModal isVisible QRState={props.QRState as any} />;
  }

  return null;
};

export const TransactionApproval = withQRHardwareAwareness(
  TransactionApprovalInternal as any,
);
