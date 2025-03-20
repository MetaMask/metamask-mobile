import { useMemo, useState } from 'react';
import {
  TransactionType,
  TransactionMeta,
} from '@metamask/transaction-controller';
import { ApprovalType } from '@metamask/controller-utils';

import { CONFIRMATION_EVENT_LOCATIONS } from '../../../../core/Analytics/events/confirmations';
import { useTransactionMetadataRequest } from '../hooks/useTransactionMetadataRequest';
import useApprovalRequest, {
  type ApprovalRequestType,
} from '../hooks/useApprovalRequest';

const ConfirmationLocationMap = {
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
  

const determineConfirmationLocation = ({
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

  const confirmationLocationFn =
    ConfirmationLocationMap[
      approvalRequest?.type as keyof typeof ConfirmationLocationMap
    ];

  if (!confirmationLocationFn) {
    return undefined;
  }

  return confirmationLocationFn({
    signatureRequestVersion,
    transactionType,
  });
};

/**
 * Hook that provides the confirmation location based on approval request and transaction metadata
 * @returns The current confirmation location
 */
export const useConfirmationLocation = ():
  | CONFIRMATION_EVENT_LOCATIONS
  | undefined => {
  const { approvalRequest } = useApprovalRequest();
  const transactionMeta = useTransactionMetadataRequest();

  // Keep the initial location for component mount
  const initialLocation = determineConfirmationLocation({
    approvalRequest,
    transactionMeta,
  });

  const [location, setLocation] = useState<
    CONFIRMATION_EVENT_LOCATIONS | undefined
  >(initialLocation);

  useMemo(() => {
    const determinedLocation = determineConfirmationLocation({
      approvalRequest,
      transactionMeta,
    });
    setLocation(determinedLocation);
  }, [approvalRequest, transactionMeta]);

  return location;
};

