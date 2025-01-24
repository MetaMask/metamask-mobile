import type { Hex } from '@metamask/utils';
import { SecurityAlertResponse } from '@metamask/transaction-controller';
import { useCallback, useEffect } from 'react';

import getDecimalChainId from '../../../../util/networks/getDecimalChainId';
import { MetricsEventBuilder } from '../../../../core/Analytics/MetricsEventBuilder';
import { MetaMetrics, MetaMetricsEvents } from '../../../../core/Analytics';
import { getAddressAccountType } from '../../../../util/address';
import { getBlockaidMetricsParams } from '../../../../util/blockaid';
import { getHostFromUrl } from '../utils/generic';
import { isSignatureRequest } from '../utils/confirm';
import { useSignatureRequest } from './useSignatureRequest';
import { useSecurityAlertResponse } from './useSecurityAlertResponse';

interface MessageParamsType {
  meta: Record<string, unknown>;
  from: string;
  version: string;
  securityAlertResponse: SecurityAlertResponse;
}

const getAnalyticsParams = (
  messageParams: MessageParamsType,
  securityAlertResponse: SecurityAlertResponse,
  type: string,
  chainId: Hex | undefined,
) => {
  const { meta = {}, from, version } = messageParams;

  return {
    account_type: getAddressAccountType(from as string),
    dapp_host_name: getHostFromUrl(meta.url as string) ?? 'N/A',
    signature_type: type,
    version: version || 'N/A',
    chain_id: chainId ? getDecimalChainId(chainId) : '',
    ui_customizations: ['redesigned_confirmation'],
    ...(meta.analytics as Record<string, string>),
    ...(securityAlertResponse
      ? getBlockaidMetricsParams(securityAlertResponse)
      : {}),
  };
};

export const useSignatureMetrics = () => {
  const signatureRequest = useSignatureRequest();
  const { securityAlertResponse } = useSecurityAlertResponse();

  const { chainId, messageParams, type } = signatureRequest ?? {};

  const captureSignatureMetrics = useCallback(
    async (
      event: (typeof MetaMetricsEvents)[keyof typeof MetaMetricsEvents],
    ) => {
      if (!type || !isSignatureRequest(type)) {
        return;
      }

      MetaMetrics.getInstance().trackEvent(
        MetricsEventBuilder.createEventBuilder(event)
          .addProperties(
            getAnalyticsParams(
              messageParams as unknown as MessageParamsType,
              securityAlertResponse as SecurityAlertResponse,
              type,
              chainId,
            ),
          )
          .build(),
      );
    },
    [chainId, messageParams, securityAlertResponse, type],
  );

  useEffect(() => {
    captureSignatureMetrics(MetaMetricsEvents.SIGNATURE_REQUESTED);
  }, [captureSignatureMetrics]);

  return { captureSignatureMetrics };
};
