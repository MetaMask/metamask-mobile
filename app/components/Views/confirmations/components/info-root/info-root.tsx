import { ApprovalType } from '@metamask/controller-utils';
import { TransactionType } from '@metamask/transaction-controller';
import React from 'react';
import { UnstakeConfirmationViewProps } from '../../../../UI/Stake/Views/UnstakeConfirmationView/UnstakeConfirmationView.types';
import { useQRHardwareContext } from '../../context/qr-hardware-context';
import useApprovalRequest from '../../hooks/useApprovalRequest';
import { useTransactionMetadataRequest } from '../../hooks/transactions/useTransactionMetadataRequest';
import ContractInteraction from '../info/contract-interaction';
import PersonalSign from '../info/personal-sign';
import QRInfo from '../qr-info';
import StakingClaim from '../../external/staking/info/staking-claim';
import StakingDeposit from '../../external/staking/info/staking-deposit';
import StakingWithdrawal from '../../external/staking/info/staking-withdrawal';
import TypedSignV1 from '../info/typed-sign-v1';
import TypedSignV3V4 from '../info/typed-sign-v3v4';

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
      case TransactionType.contractInteraction:
        return ContractInteraction;
      case TransactionType.stakingClaim:
        return StakingClaim;
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

  if (
    transactionType &&
    [
      // We only need this path for stake withdrawal and claim confirmations
      // because they are passed the same route object as an argument that
      // contains the wei amount to be withdrawn / claimed. Staking deposit
      // doesn't need it because it reads the amount to stake from the
      // transaction value in the transaction metadata directly.
      TransactionType.stakingUnstake,
      TransactionType.stakingClaim,
    ].includes(transactionType)
  ) {
    const StakingComponentWithArgs =
      InfoComponent as React.ComponentType<UnstakeConfirmationViewProps>;
    return (
      <StakingComponentWithArgs
        route={route as UnstakeConfirmationViewProps['route']}
      />
    );
  }

  const GenericComponent = InfoComponent as React.ComponentType<
    Record<string, never>
  >;
  return <GenericComponent />;
};

export default Info;
