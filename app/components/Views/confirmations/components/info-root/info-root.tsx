import { ApprovalType } from '@metamask/controller-utils';
import { TransactionType } from '@metamask/transaction-controller';
import React from 'react';
import { UnstakeConfirmationViewProps } from '../../../../UI/Stake/Views/UnstakeConfirmationView/UnstakeConfirmationView.types';
import { useQRHardwareContext } from '../../context/qr-hardware-context';
import StakingClaim from '../../external/staking/info/staking-claim';
import StakingDeposit from '../../external/staking/info/staking-deposit';
import StakingWithdrawal from '../../external/staking/info/staking-withdrawal';
import { use7702TransactionType } from '../../hooks/7702/use7702TransactionType';
import { useTransactionMetadataRequest } from '../../hooks/transactions/useTransactionMetadataRequest';
import useApprovalRequest from '../../hooks/useApprovalRequest';
import ContractInteraction from '../info/contract-interaction';
import PersonalSign from '../info/personal-sign';
import SwitchAccountType from '../info/switch-account-type';
import TransactionBatch from '../info/transaction-batch';
import Transfer from '../info/transfer';
import TypedSignV1 from '../info/typed-sign-v1';
import TypedSignV3V4 from '../info/typed-sign-v3v4';
import Approve from '../info/approve';
import QRInfo from '../qr-info';
import ContractDeployment from '../info/contract-deployment';
import { PerpsDepositInfo } from '../info/perps-deposit-info';
import { PredictDepositInfo } from '../info/predict-deposit-info';
import { hasTransactionType } from '../../utils/transaction';
import { PredictClaimInfo } from '../info/predict-claim-info';
import { PredictWithdrawInfo } from '../info/predict-withdraw-info';
import { MusdConversionInfo } from '../info/musd-conversion-info';

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
      case TransactionType.stakingClaim:
        return StakingClaim;
      case TransactionType.stakingDeposit:
        return StakingDeposit;
      case TransactionType.stakingUnstake:
        return StakingWithdrawal;
      case TransactionType.simpleSend:
      case TransactionType.tokenMethodTransfer:
      case TransactionType.tokenMethodTransferFrom:
      case TransactionType.tokenMethodSafeTransferFrom:
        return Transfer;
      case TransactionType.deployContract:
        return ContractDeployment;
      case TransactionType.tokenMethodApprove:
      case TransactionType.tokenMethodSetApprovalForAll:
      case TransactionType.tokenMethodIncreaseAllowance:
        return Approve;
      case TransactionType.perpsDeposit:
        return PerpsDepositInfo;
      // Default to contract interaction as generic transaction confirmation
      default:
        return ContractInteraction;
    }
  },
  [ApprovalType.TransactionBatch]: () => TransactionBatch,
};

interface InfoProps {
  route?: UnstakeConfirmationViewProps['route'];
}

const Info = ({ route }: InfoProps) => {
  const { approvalRequest } = useApprovalRequest();
  const transactionMetadata = useTransactionMetadataRequest();
  const { isSigningQRObject } = useQRHardwareContext();
  const { isDowngrade, isUpgradeOnly } = use7702TransactionType();

  if (!approvalRequest?.type) {
    return null;
  }

  if (isDowngrade || isUpgradeOnly) {
    return <SwitchAccountType />;
  }

  if (isSigningQRObject) {
    return <QRInfo />;
  }

  if (
    transactionMetadata &&
    hasTransactionType(transactionMetadata, [TransactionType.musdConversion])
  ) {
    return <MusdConversionInfo />;
  }

  if (
    transactionMetadata &&
    hasTransactionType(transactionMetadata, [TransactionType.predictDeposit])
  ) {
    return <PredictDepositInfo />;
  }

  if (
    transactionMetadata &&
    hasTransactionType(transactionMetadata, [TransactionType.predictClaim])
  ) {
    return <PredictClaimInfo />;
  }

  if (
    transactionMetadata &&
    hasTransactionType(transactionMetadata, [TransactionType.predictWithdraw])
  ) {
    return <PredictWithdrawInfo />;
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
