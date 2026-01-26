import type { Hex } from '@metamask/utils';
import { DecodingData } from '@metamask/signature-controller';
import { SecurityAlertResponse } from '@metamask/transaction-controller';
import { useCallback, useEffect, useMemo } from 'react';

import getDecimalChainId from '../../../../../util/networks/getDecimalChainId';
import { MetricsEventBuilder } from '../../../../../core/Analytics/MetricsEventBuilder';
import { MetaMetrics, MetaMetricsEvents } from '../../../../../core/Analytics';
import { getAddressAccountType } from '../../../../../util/address';
import { getBlockaidMetricsParams } from '../../../../../util/blockaid';
import { getHostFromUrl } from '../../utils/generic';
import { isSignatureRequest } from '../../utils/confirm';
import { getSignatureDecodingEventProps } from '../../utils/signature-metrics';
import { useSignatureRequest } from './useSignatureRequest';
import { useSecurityAlertResponse } from '../alerts/useSecurityAlertResponse';
import { useTypedSignSimulationEnabled } from './useTypedSignSimulationEnabled';
import { parseAndNormalizeSignTypedDataFromSignatureRequest } from '../../utils/signature';
import { useSelector } from 'react-redux';
import { selectConfirmationMetricsById } from '../../../../../core/redux/slices/confirmationMetrics';
import { RootState } from '../../../../../reducers';

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
  confirmationMetrics: Record<string, unknown>,
) => {
  const { meta = {}, from, version } = messageParams;
  const { ui_customizations = [], ...blockaidProperties } =
    securityAlertResponse
      ? getBlockaidMetricsParams(securityAlertResponse)
      : {};

  const allCustomizations = ui_customizations as string[];

  return {
    account_type: getAddressAccountType(from as string),
    dapp_host_name: getHostFromUrl(meta.url as string) ?? 'N/A',
    signature_type: type,
    version: version || 'N/A',
    chain_id: chainId ? getDecimalChainId(chainId) : '',
    ...(allCustomizations.length > 0 && {
      ui_customizations: allCustomizations,
    }),
    ...(primaryType ? { eip712_primary_type: primaryType } : {}),
    ...(meta.analytics as Record<string, string>),
    ...getSignatureDecodingEventProps(
      decodingData,
      decodingLoading,
      isSimulationEnabled,
    ),
    ...blockaidProperties,
    ...confirmationMetrics,
  };
};

export const useSignatureMetrics = () => {
  const signatureRequest = useSignatureRequest();
  const isSimulationEnabled = useTypedSignSimulationEnabled();
  const { securityAlertResponse } = useSecurityAlertResponse();

  const { chainId, decodingData, decodingLoading, messageParams, type, id } =
    signatureRequest ?? {};
  const { primaryType } =
    parseAndNormalizeSignTypedDataFromSignatureRequest(signatureRequest);

  const confirmationMetrics = useSelector((state: RootState) =>
    selectConfirmationMetricsById(state, id ?? ''),
  );

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
      confirmationMetrics?.properties ?? {},
    );
  }, [
    chainId,
    confirmationMetrics,
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
