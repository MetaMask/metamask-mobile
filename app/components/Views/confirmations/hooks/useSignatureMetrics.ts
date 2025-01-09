import { useCallback, useEffect } from 'react';
import type { Json } from '@metamask/utils';

import getDecimalChainId from '../../../../util/networks/getDecimalChainId';
import { MetricsEventBuilder } from '../../../../core/Analytics/MetricsEventBuilder';
import {
  MetaMetrics,
  MetaMetricsEvents,
  store,
} from '../../../../core/Analytics';
import { getBlockaidMetricsParams } from '../../../../util/blockaid';

import useApprovalRequest from './useApprovalRequest';
import { isSignatureRequest } from '../utils/confirm';
import { getAddressAccountType } from '../../../../util/address';
import Logger from '../../../../util/Logger';
import { selectChainId } from '../../../../selectors/networkController';
import { SecurityAlertResponse } from '../components/BlockaidBanner/BlockaidBanner.types';

type ApprovalRequestData = Record<string, string | Json> | null;

const getAnalyticsParams = (
  messageParams: ApprovalRequestData & {
    meta: Record<string, unknown>;
    securityAlertResponse: SecurityAlertResponse;
  },
  type: string,
) => {
  const { meta = {}, from, securityAlertResponse, version } = messageParams;

  const analyticsParams = {
    account_type: getAddressAccountType(from as string),
    dapp_host_name: 'N/A',
    signature_type: type,
    version: version || 'N/A',
    chain_id: getDecimalChainId(selectChainId(store.getState())),
    ui_customizations: ['redesigned_confirmation'],
    ...(meta.analytics as Record<string, string>),
    ...(securityAlertResponse
      ? getBlockaidMetricsParams(securityAlertResponse)
      : {}),
  };

  try {
    if (meta.url) {
      const url = new URL(meta.url as string);
      analyticsParams.dapp_host_name = url.host;
    }
  } catch (error) {
    Logger.error(error as Error);
  }

  return analyticsParams;
};

const useSignatureMetrics = () => {
  const { approvalRequest } = useApprovalRequest();

  const { requestData, type: approvalRequestType } = approvalRequest ?? {
    requestData: {},
  };

  const captureSignatureMetrics = useCallback(
    async (
      event: (typeof MetaMetricsEvents)[keyof typeof MetaMetricsEvents],
    ) => {
      if (!approvalRequestType || !isSignatureRequest(approvalRequestType)) {
        return;
      }

      MetaMetrics.getInstance().trackEvent(
        MetricsEventBuilder.createEventBuilder(event)
          .addProperties(getAnalyticsParams(requestData, approvalRequestType))
          .build(),
      );
    },
    [approvalRequestType, requestData],
  );

  useEffect(() => {
    captureSignatureMetrics(MetaMetricsEvents.SIGNATURE_REQUESTED);
  }, [captureSignatureMetrics]);

  return { captureSignatureMetrics };
};

export default useSignatureMetrics;
