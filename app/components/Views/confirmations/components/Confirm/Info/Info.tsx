import { ApprovalType } from '@metamask/controller-utils';
import { TransactionType } from '@metamask/transaction-controller';
import React from 'react';
import { useQRHardwareContext } from '../../../context/QRHardwareContext';
import useApprovalRequest from '../../../hooks/useApprovalRequest';
import { useTransactionMetadataRequest } from '../../../hooks/useTransactionMetadataRequest';
import PersonalSign from './PersonalSign';
import QRInfo from './QRInfo';
import StakingDeposit from './StakingDeposit';
import StakingWithdrawal from './StakingWithdrawal';
import TypedSignV1 from './TypedSignV1';
import TypedSignV3V4 from './TypedSignV3V4';
import { UnstakeConfirmationViewProps } from '../../../../../UI/Stake/Views/UnstakeConfirmationView/UnstakeConfirmationView.types';
interface ConfirmationInfoComponentRequest {
  signatureRequestVersion?: string;
  transactionType?: TransactionType;
}

const ConfirmationInfoComponentMap = {
  [TransactionType.personalSign]: () => PersonalSign,
  [TransactionType.signTypedData]: ({
    signatureRequestVersion,
  }: ConfirmationInfoComponentRequest) => {
    if (signatureRequestVersion === 'V1') return TypedSignV1;
    return TypedSignV3V4;
  },
  [ApprovalType.Transaction]: ({
    transactionType,
  }: ConfirmationInfoComponentRequest) => {
    switch (transactionType) {
      case TransactionType.stakingDeposit:
        return StakingDeposit;
      case TransactionType.stakingUnstake:
        return StakingWithdrawal;
      default:
        return null;
    }
  },
};

interface InfoProps {
  route?: UnstakeConfirmationViewProps['route'];
}

const Info = ({ route }: InfoProps) => {
  const { approvalRequest } = useApprovalRequest();
  const transactionMetadata = useTransactionMetadataRequest();
  const { isSigningQRObject } = useQRHardwareContext();

  if (!approvalRequest?.type) {
    return null;
  }

  if (isSigningQRObject) {
    return <QRInfo />;
  }

  const { requestData } = approvalRequest ?? {
    requestData: {},
  };
  const signatureRequestVersion = requestData?.version;
  const transactionType = transactionMetadata?.type;

  const InfoComponent = ConfirmationInfoComponentMap[
    approvalRequest?.type as keyof typeof ConfirmationInfoComponentMap
  ]({ signatureRequestVersion, transactionType });

  if (!InfoComponent) return null;

  if (transactionType === TransactionType.stakingUnstake) {
    const StakingWithdrawalComponent = InfoComponent as React.ComponentType<UnstakeConfirmationViewProps>;
    return <StakingWithdrawalComponent route={route as UnstakeConfirmationViewProps['route']} />;
  }

  const GenericComponent = InfoComponent as React.ComponentType<Record<string, never>>;
  return <GenericComponent />;
};

export default Info;