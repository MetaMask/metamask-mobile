import React, { useCallback, useState } from 'react';
import useApprovalRequest from '../../Views/confirmations/hooks/useApprovalRequest';
import { ApprovalTypes } from '../../../core/RPCMethods/RPCMethodMiddleware';
import Approval from '../../Views/confirmations/Approval';
import Approve from '../../Views/confirmations/ApproveView/Approve';
import QRSigningModal from '../../UI/QRHardware/QRSigningModal';
import withQRHardwareAwareness from '../../UI/QRHardware/withQRHardwareAwareness';
import { IQRState } from '../../UI/QRHardware/types';
import { useConfirmationRedesignEnabled } from '../../Views/confirmations/hooks/useConfirmationRedesignEnabled';

export enum TransactionModalType {
  Transaction = 'transaction',
  Dapp = 'dapp',
}

export interface TransactionApprovalProps {
  transactionType?: TransactionModalType;
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  navigation: any;
  onComplete: () => void;
  QRState?: IQRState;
  isSigningQRObject?: boolean;
}

const TransactionApprovalInternal = (props: TransactionApprovalProps) => {
  const { approvalRequest } = useApprovalRequest();
  const { isRedesignedEnabled } = useConfirmationRedesignEnabled();
  const [modalVisible, setModalVisible] = useState(false);
  const { onComplete: propsOnComplete } = props;

  const onComplete = useCallback(() => {
    setModalVisible(false);
    propsOnComplete();
  }, [propsOnComplete]);

  if (
    (approvalRequest?.type !== ApprovalTypes.TRANSACTION && !modalVisible) ||
    isRedesignedEnabled
  ) {
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
    return (
      <Approve
        modalVisible
        hideModal={onComplete}
        navigation={props.navigation}
      />
    );
  }

  if (props.isSigningQRObject && !props.transactionType) {
    return (
      <QRSigningModal
        isVisible
        // TODO: Replace "any" with type
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  TransactionApprovalInternal as any,
);
