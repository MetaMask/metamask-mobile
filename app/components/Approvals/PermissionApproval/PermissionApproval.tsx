// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { useEffect, useRef } from 'react';
import useApprovalRequest from '../../Views/confirmations/hooks/useApprovalRequest';
import { ApprovalTypes } from '../../../core/RPCMethods/RPCMethodMiddleware';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { createAccountConnectNavDetails } from '../../Views/AccountConnect';
import { useSelector } from 'react-redux';
import { selectAccountsLength } from '../../../selectors/accountTrackerController';
import { useMetrics } from '../../../components/hooks/useMetrics';

export interface PermissionApprovalProps {
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  navigation: any;
}

const PermissionApproval = (props: PermissionApprovalProps) => {
  const { trackEvent } = useMetrics();
  const { approvalRequest } = useApprovalRequest();
  const totalAccounts = useSelector(selectAccountsLength);
  const isProcessing = useRef<boolean>(false);

  useEffect(() => {
    if (approvalRequest?.type !== ApprovalTypes.REQUEST_PERMISSIONS) {
      isProcessing.current = false;
      return;
    }

    const requestData = approvalRequest?.requestData;

    if (!requestData?.permissions?.eth_accounts) return;

    const {
      metadata: { id },
    } = requestData;

    if (isProcessing.current) return;

    isProcessing.current = true;

    trackEvent(MetaMetricsEvents.CONNECT_REQUEST_STARTED, {
      number_of_accounts: totalAccounts,
      source: 'PERMISSION SYSTEM',
    });

    props.navigation.navigate(
      ...createAccountConnectNavDetails({
        hostInfo: requestData,
        permissionRequestId: id,
      }),
    );
  }, [approvalRequest, totalAccounts, props.navigation, trackEvent]);

  return null;
};

export default PermissionApproval;
