import React, { useCallback } from 'react';
import useApprovalRequest from '../../Views/confirmations/hooks/useApprovalRequest';
import { ApprovalTypes } from '../../../core/RPCMethods/RPCMethodMiddleware';
import Approval from '../../Views/confirmations/legacy/Approval';
import Approve from '../../Views/confirmations/legacy/ApproveView/Approve';
import QRSigningModal from '../../UI/QRHardware/QRSigningModal';
import withQRHardwareAwareness from '../../UI/QRHardware/withQRHardwareAwareness';
import { useConfirmationRedesignEnabled } from '../../Views/confirmations/hooks/useConfirmationRedesignEnabled';
import { QrScanRequest, QrScanRequestType } from '@metamask/eth-qr-keyring';

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
  pendingScanRequest?: QrScanRequest;
  isSigningQRObject?: boolean;
}

const TransactionApprovalInternal = (props: TransactionApprovalProps) => {
  const { approvalRequest } = useApprovalRequest();
  const { isRedesignedEnabled } = useConfirmationRedesignEnabled();
  const {
    onComplete: propsOnComplete,
    pendingScanRequest,
    isSigningQRObject,
  } = props;
  const isQRSigning =
    isSigningQRObject &&
    pendingScanRequest?.type === QrScanRequestType.SIGN &&
    !props.transactionType;

  const onComplete = useCallback(() => {
    propsOnComplete();
  }, [propsOnComplete]);

  if (
    (approvalRequest?.type !== ApprovalTypes.TRANSACTION && !isQRSigning) ||
    isRedesignedEnabled
  ) {
    return null;
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

  if (isQRSigning) {
    return (
      <QRSigningModal
        isVisible
        pendingScanRequest={pendingScanRequest}
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
