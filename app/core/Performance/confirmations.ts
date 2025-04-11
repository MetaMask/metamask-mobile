import { ApprovalType } from '@metamask/controller-utils';
import { TransactionType } from '@metamask/transaction-controller';
import { TraceContext, TraceName, trace, endTrace } from '../../util/trace';
import { REDESIGNED_TRANSACTION_TYPES } from '../../components/Views/confirmations/hooks/useConfirmationRedesignEnabled';
let ConfirmationStartupSpan: TraceContext;

export const getConfirmationStartupSpan = () => {
  return ConfirmationStartupSpan;
};

export const startConfirmationStartupSpan = ({
  approvalType,
  transactionType,
  signatureType,
  parentContext,
}: {
  approvalType: ApprovalType;
  transactionType?: TransactionType;
  signatureType?: TransactionType.personalSign | TransactionType.signTypedData;
  parentContext?: TraceContext;
}) => {
  const isRedesigned =
    approvalType === ApprovalType.Transaction
      ? REDESIGNED_TRANSACTION_TYPES.includes(
          transactionType as TransactionType,
        )
      : [ApprovalType.EthSignTypedData, ApprovalType.PersonalSign].includes(
          approvalType,
        );

  const tags = {
    'confirmations.approval_type': approvalType,
    'confirmations.transaction_type': transactionType as string,
    'confirmations.signature_type': signatureType as string,
    'confirmations.is_redesigned': isRedesigned,
  };

  ConfirmationStartupSpan = trace({
    name: TraceName.ConfirmationStartup,
    tags,
    parentContext,
  });
};

export const endConfirmationStartupSpan = () => {
  endTrace({
    name: TraceName.ConfirmationStartup,
  });
};

export default getConfirmationStartupSpan;
