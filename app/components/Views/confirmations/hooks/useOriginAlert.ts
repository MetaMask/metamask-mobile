import { ApprovalTypes } from '../../../../core/RPCMethods/RPCMethodMiddleware';
import Alert from '../types/confirm';
import useApprovalRequest from './useApprovalRequest';

const useOriginAlert = (): Alert | undefined => {
  const { approvalRequest } = useApprovalRequest();

  if (approvalRequest?.type !== ApprovalTypes.ETH_SIGN_TYPED_DATA) {
    return undefined;
  }

  return {
    alertDetails: ['Alert details - 1', 'Alert details - 2'],
    key: 'origin',
    field: 'origin',
    isBlocking: true,
    title: 'origin alert',
    message: 'there is an alert for origin',
    severity: 'danger',
  };
};

export default useOriginAlert;
