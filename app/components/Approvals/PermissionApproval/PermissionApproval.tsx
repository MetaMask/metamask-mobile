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
  Caip25CaveatType,
  Caip25EndowmentPermissionName,
} from '@metamask/chain-agnostic-permission';
import { getApiAnalytics } from '../../../core/Analytics/helpers/getApiAnalytics';

export interface PermissionApprovalProps {
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  navigation: any;
}

const PermissionApproval = (props: PermissionApprovalProps) => {
  const { trackEvent, createEventBuilder } = useMetrics();
  const { approvalRequest } = useApprovalRequest();
  const totalAccounts = useSelector(selectAccountsLength);

  const isProcessing = useRef<boolean>(false);

  const eventSource = useOriginSource({
    origin: approvalRequest?.requestData?.metadata?.origin,
  });

  useEffect(() => {
    if (
      approvalRequest?.type !== ApprovalTypes.REQUEST_PERMISSIONS ||
      !eventSource
    ) {
      isProcessing.current = false;
      return;
    }

    const requestData = approvalRequest?.requestData;

    if (!requestData?.permissions?.[Caip25EndowmentPermissionName]) return;

    const {
      metadata: { id },
    } = requestData;

    if (isProcessing.current) return;

    isProcessing.current = true;

    const chainIds = Object.keys(
      requestData.permissions[Caip25EndowmentPermissionName]?.caveats?.find(
        ({ type }: { type: string }) => type === Caip25CaveatType,
      )?.value?.optionalScopes ?? {},
    );

    const isMultichainRequest =
      !approvalRequest.requestData?.metadata?.isEip1193Request;

    trackEvent(
      createEventBuilder(MetaMetricsEvents.CONNECT_REQUEST_STARTED)
        .addProperties({
          number_of_accounts: totalAccounts,
          source: eventSource,
          chain_id_list: chainIds,
          ...getApiAnalytics(isMultichainRequest),
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
  ]);

  return null;
};

export default PermissionApproval;
