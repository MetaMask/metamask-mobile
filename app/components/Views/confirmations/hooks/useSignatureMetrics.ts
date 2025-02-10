import { SecurityAlertResponse } from '@metamask/transaction-controller';
import { useCallback, useEffect } from 'react';

import getDecimalChainId from '../../../../util/networks/getDecimalChainId';
import { MetricsEventBuilder } from '../../../../core/Analytics/MetricsEventBuilder';
import { MetaMetrics, MetaMetricsEvents } from '../../../../core/Analytics';
import { getAddressAccountType } from '../../../../util/address';
import { getBlockaidMetricsParams } from '../../../../util/blockaid';
import { getHostFromUrl } from '../utils/generic';
import { isSignatureRequest } from '../utils/confirm';
import { getSignatureDecodingEventProps } from '../utils/signatureMetrics';
import { useSignatureRequest } from './useSignatureRequest';
import { useTypedSignSimulationEnabled } from './useTypedSignSimulationEnabled';
import { SignatureRequest } from '@metamask/signature-controller';

interface MessageParamsType {
  meta: Record<string, unknown>;
  from: string;
  version: string;
  securityAlertResponse: SecurityAlertResponse;
}

const getAnalyticsParams = (
  signatureRequest: SignatureRequest,
  isSimulationEnabled?: boolean,
) => {
  const { chainId, messageParams, type } = signatureRequest ?? {};
  const {
    meta = {},
    from,
    securityAlertResponse,
    version
  } = (messageParams  as unknown as MessageParamsType) || {};

  return {
    account_type: getAddressAccountType(from as string),
    dapp_host_name: getHostFromUrl(meta.url as string) ?? 'N/A',
    signature_type: type,
    version: version || 'N/A',
    chain_id: chainId ? getDecimalChainId(chainId) : '',
    ui_customizations: ['redesigned_confirmation'],
    ...(meta.analytics as Record<string, string>),
    ...(securityAlertResponse
      ? getBlockaidMetricsParams(securityAlertResponse as SecurityAlertResponse)
      : {}),
    ...getSignatureDecodingEventProps(signatureRequest, isSimulationEnabled),
  };
};

export const useSignatureMetrics = () => {
  const signatureRequest = useSignatureRequest();
  const isSimulationEnabled = useTypedSignSimulationEnabled();

  const type = signatureRequest?.type;

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
              signatureRequest as SignatureRequest,
              isSimulationEnabled,
            ),
          )
          .build(),
      );
    },
    [isSimulationEnabled, type, signatureRequest],
  );

  useEffect(() => {
    captureSignatureMetrics(MetaMetricsEvents.SIGNATURE_REQUESTED);
  }, [captureSignatureMetrics]);

  return { captureSignatureMetrics };
};
