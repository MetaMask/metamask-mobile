import {
  TransactionType,
  TransactionMeta,
} from '@metamask/transaction-controller';
import { ApprovalType } from '@metamask/controller-utils';

import { type ApprovalRequestType } from '../../hooks/useApprovalRequest';

import { CONFIRMATION_EVENT_LOCATIONS } from '../../../../../core/Analytics/events/confirmations';

const ConfirmationLocationtMap = {
  [TransactionType.personalSign]: () =>
    CONFIRMATION_EVENT_LOCATIONS.PERSONAL_SIGN,
  [TransactionType.signTypedData]: ({
    signatureRequestVersion,
  }: {
    signatureRequestVersion: string;
  }) => {
    if (signatureRequestVersion === 'V1')
      return CONFIRMATION_EVENT_LOCATIONS.TYPED_SIGN_V1;
    return CONFIRMATION_EVENT_LOCATIONS.TYPED_SIGN_V3_V4;
  },
  [ApprovalType.Transaction]: ({
    transactionType,
  }: {
    transactionType?: TransactionType;
  }) => {
    switch (transactionType) {
      case TransactionType.stakingDeposit:
        return CONFIRMATION_EVENT_LOCATIONS.STAKING_DEPOSIT;
      case TransactionType.stakingUnstake:
        return CONFIRMATION_EVENT_LOCATIONS.STAKING_WITHDRAWAL;
      default:
        return undefined;
    }
  },
};

export const determineConfirmationLocation = ({
  approvalRequest,
  transactionMeta,
}: {
  approvalRequest?: ApprovalRequestType;
  transactionMeta?: TransactionMeta;
}) => {
  const { requestData } = approvalRequest ?? {
    requestData: {},
  };
  const signatureRequestVersion = requestData?.version;
  const transactionType = transactionMeta?.type;

  const confirmationLocation = ConfirmationLocationtMap[
    approvalRequest?.type as keyof typeof ConfirmationLocationtMap
  ]({
    signatureRequestVersion,
    transactionType,
  });
  return confirmationLocation;
};
