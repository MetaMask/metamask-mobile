import { useSelector } from 'react-redux';
import useApprovalRequest from './useApprovalRequest';
import { ApprovalType } from '@metamask/controller-utils';
import { selectSignatureRequestById } from '../../../../selectors/signatureController';
import { RootState } from '../../../UI/BasicFunctionality/BasicFunctionalityModal/BasicFunctionalityModal.test';

const SIGNATURE_APPROVAL_TYPES = [
  ApprovalType.PersonalSign,
  ApprovalType.EthSignTypedData,
];

export function useSignatureRequest() {
  const { approvalRequest } = useApprovalRequest();

  const signatureRequest = useSelector((state: RootState) =>
    selectSignatureRequestById(state, approvalRequest?.id as string),
  );

  if (
    !SIGNATURE_APPROVAL_TYPES.includes(approvalRequest?.type as ApprovalType) ||
    !signatureRequest
  ) {
    return undefined;
  }

    return signatureRequest;
}
