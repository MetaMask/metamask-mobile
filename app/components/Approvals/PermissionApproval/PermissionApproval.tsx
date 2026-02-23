import { useEffect, useRef } from 'react';
import useApprovalRequest from '../../Views/confirmations/hooks/useApprovalRequest';
import { ApprovalTypes } from '../../../core/RPCMethods/RPCMethodMiddleware';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { createAccountConnectNavDetails } from '../../Views/AccountConnect';
import { useSelector } from 'react-redux';
import { selectAccountsLength } from '../../../selectors/accountTrackerController';
import { useMetrics } from '../../../components/hooks/useMetrics';
import useOriginSource from '../../hooks/useOriginSource';
import {
  Caip25EndowmentPermissionName,
  getAllScopesFromPermission,
} from '@metamask/chain-agnostic-permission';
import { getApiAnalyticsProperties } from '../../../util/metrics/MultichainAPI/getApiAnalyticsProperties';
import { selectPendingApprovals } from '../../../selectors/approvalController';
import { isEqual } from 'lodash';

export interface PermissionApprovalProps {
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  navigation: any;
}

const PermissionApproval = (props: PermissionApprovalProps) => {
  const { trackEvent, createEventBuilder } = useMetrics();
  const pendingApprovals = useSelector(selectPendingApprovals, isEqual);
  const { approvalRequest } = useApprovalRequest();
  const totalAccounts = useSelector(selectAccountsLength);

  // Prevents re-navigation for the same approval when pendingApprovals changes.
  const lastNavigatedApprovalIdRef = useRef<string | null>(null);

  const eventSource = useOriginSource({
    origin: approvalRequest?.requestData?.metadata?.origin,
  });

  useEffect(() => {
    if (
      approvalRequest?.type !== ApprovalTypes.REQUEST_PERMISSIONS ||
      !eventSource
    ) {
      return;
    }

    const requestData = approvalRequest?.requestData;

    if (!requestData?.permissions?.[Caip25EndowmentPermissionName]) return;

    const {
      metadata: { id },
    } = requestData;

    if (requestData?.diff?.permissionDiffMap?.[Caip25EndowmentPermissionName]) {
      // Use the SwitchChainApproval component to handle this request instead
      return;
    }

    if (lastNavigatedApprovalIdRef.current === id) {
      return;
    }
    lastNavigatedApprovalIdRef.current = id;

    const chainIds = getAllScopesFromPermission(
      requestData.permissions[Caip25EndowmentPermissionName],
    );

    const isMultichainRequest =
      !approvalRequest?.requestData?.metadata?.isEip1193Request;

    trackEvent(
      createEventBuilder(MetaMetricsEvents.CONNECT_REQUEST_STARTED)
        .addProperties({
          number_of_accounts: totalAccounts,
          source: eventSource,
          chain_id_list: chainIds,
          ...getApiAnalyticsProperties(isMultichainRequest),
        })
        .build(),
    );

    props.navigation.navigate(
      ...createAccountConnectNavDetails({
        hostInfo: requestData,
        permissionRequestId: id,
      }),
    );
  }, [
    approvalRequest,
    totalAccounts,
    props.navigation,
    trackEvent,
    createEventBuilder,
    eventSource,
    // Re-run when the queue changes so new approvals are picked up.
    // The ref guard above prevents re-navigation for the same approval.
    pendingApprovals,
  ]);

  return null;
};

export default PermissionApproval;
