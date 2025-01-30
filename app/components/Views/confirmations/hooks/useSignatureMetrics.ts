import type { Hex } from '@metamask/utils';
import { DecodingData } from '@metamask/signature-controller';
import { SecurityAlertResponse } from '@metamask/transaction-controller';
import { useCallback, useEffect, useMemo } from 'react';

import getDecimalChainId from '../../../../util/networks/getDecimalChainId';
import { MetricsEventBuilder } from '../../../../core/Analytics/MetricsEventBuilder';
import { MetaMetrics, MetaMetricsEvents } from '../../../../core/Analytics';
import { getAddressAccountType } from '../../../../util/address';
import { getBlockaidMetricsParams } from '../../../../util/blockaid';
import { getHostFromUrl } from '../utils/generic';
import { isSignatureRequest } from '../utils/confirm';
import { getSignatureDecodingEventProps } from '../utils/signatureMetrics';
import { useSignatureRequest } from './useSignatureRequest';
import { useSecurityAlertResponse } from './useSecurityAlertResponse';
import { useTypedSignSimulationEnabled } from './useTypedSignSimulationEnabled';
import { getSignatureRequestPrimaryType } from '../utils/signature';

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
  decodingData: DecodingData | undefined,
  decodingLoading: boolean,
  isSimulationEnabled: boolean,
  primaryType: string,
) => {
  const { meta = {}, from, version } = messageParams;

  return {
    account_type: getAddressAccountType(from as string),
    dapp_host_name: getHostFromUrl(meta.url as string) ?? 'N/A',
    signature_type: type,
    version: version || 'N/A',
    chain_id: chainId ? getDecimalChainId(chainId) : '',
    ui_customizations: ['redesigned_confirmation'],
    ...(primaryType ? { eip712_primary_type: primaryType } : {}),
    ...(meta.analytics as Record<string, string>),
    ...(securityAlertResponse
      ? getBlockaidMetricsParams(securityAlertResponse)
      : {}),
    ...getSignatureDecodingEventProps(
      decodingData,
      decodingLoading,
      isSimulationEnabled,
    ),
  };
};

export const useSignatureMetrics = () => {
  const signatureRequest = useSignatureRequest();
  const isSimulationEnabled = useTypedSignSimulationEnabled();
  const { securityAlertResponse } = useSecurityAlertResponse();

  const { chainId, decodingData, decodingLoading, messageParams, type } =
    signatureRequest ?? {};
  const primaryType =
    signatureRequest && getSignatureRequestPrimaryType(signatureRequest);

  const analyticsParams = useMemo(() => {
    if (!type || !isSignatureRequest(type)) {
      return;
    }

    return getAnalyticsParams(
      messageParams as unknown as MessageParamsType,
      securityAlertResponse as SecurityAlertResponse,
      type,
      chainId,
      decodingData,
      !!decodingLoading,
      !!isSimulationEnabled,
      primaryType,
    );
  }, [
    chainId,
    decodingData,
    decodingLoading,
    isSimulationEnabled,
    messageParams,
    primaryType,
    securityAlertResponse,
    type,
  ]);

  const captureSignatureMetrics = useCallback(
    async (
      event: (typeof MetaMetricsEvents)[keyof typeof MetaMetricsEvents],
    ) => {
      if (!analyticsParams) {
        return;
      }

      MetaMetrics.getInstance().trackEvent(
        MetricsEventBuilder.createEventBuilder(event)
          .addProperties(analyticsParams)
          .build(),
      );
    },
    [analyticsParams],
  );

  useEffect(() => {
    captureSignatureMetrics(MetaMetricsEvents.SIGNATURE_REQUESTED);
  }, [captureSignatureMetrics]);

  return { captureSignatureMetrics };
};
