// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { useEffect, useRef } from 'react';
import useApprovalRequest from '../../hooks/useApprovalRequest';
import { ApprovalTypes } from '../../../core/RPCMethods/RPCMethodMiddleware';
import AnalyticsV2 from '../../../util/analytics/analyticsV2';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { createAccountConnectNavDetails } from '../../Views/AccountConnect';
import { useSelector } from 'react-redux';
import { selectAccountsLength } from '../../../selectors/accountTrackerController';

export interface PermissionApprovalProps {
  navigation: any;
}

const PermissionApproval = (props: PermissionApprovalProps) => {
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

    AnalyticsV2.trackEvent(MetaMetricsEvents.CONNECT_REQUEST_STARTED, {
      number_of_accounts: totalAccounts,
      source: 'PERMISSION SYSTEM',
    });

    props.navigation.navigate(
      ...createAccountConnectNavDetails({
        hostInfo: requestData,
        permissionRequestId: id,
      }),
    );
  }, [approvalRequest, totalAccounts, props.navigation]);

  return null;
};

export default PermissionApproval;
