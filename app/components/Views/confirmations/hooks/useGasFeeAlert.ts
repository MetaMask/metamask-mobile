import { ApprovalTypes } from '../../../../core/RPCMethods/RPCMethodMiddleware';
import Alert from '../types/confirm';
import useApprovalRequest from './useApprovalRequest';

const useGasFeeAlert = (): Alert | undefined => {
  const { approvalRequest } = useApprovalRequest();

  if (approvalRequest?.type !== ApprovalTypes.TRANSACTION) {
    return undefined;
  }

  return {
    alertDetails: ['Alert details - 1', 'Alert details - 2'],
    key: 'gasFee',
    field: 'gasFee',
    isBlocking: true,
    title: 'gas fee alert',
    message: 'there is an alert for gas fee in transaction',
    severity: 'danger',
  };
};

export default useGasFeeAlert;
