import React, { useMemo } from 'react';
// TODO: Remove legacy import
import {
  Reason,
  SecurityAlertResponse,
} from '../../components/blockaid-banner/BlockaidBanner.types';
import { AlertKeys } from '../../constants/alerts';
import { Alert, AlertSeverity, Severity } from '../../types/alerts';
import { useSecurityAlertResponse } from '../alerts/useSecurityAlertResponse';
import { ResultType as BlockaidResultType } from '../../constants/signatures';
// TODO: Remove legacy import
import {
  getBlockaidBannerTitle,
  getBlockaidConfirmModalMessage,
  getBlockaidModalAmount,
} from '../../components/blockaid-banner/BlockaidBanner.utils';
import BlockaidAlertContent from '../../components/blockaid-alert-content/blockaid-alert-content';
import { useConfirmationMetricEvents } from '../metrics/useConfirmationMetricEvents';
import { useApprovedAmountFiat } from './useApprovedAmountFiat';
import { useSendingAssetsFiatTotal } from './useSendingAssetsFiatTotal';

const IGNORED_RESULT_TYPES = [
  BlockaidResultType.Benign,
  BlockaidResultType.RequestInProgress,
];

function getBlockaidAlertSeverity(severity: BlockaidResultType): AlertSeverity {
  switch (severity) {
    case BlockaidResultType.Malicious:
      return Severity.Danger;
    case BlockaidResultType.Warning:
      return Severity.Warning;
    default:
      return Severity.Info;
  }
}

export default function useBlockaidAlerts(): Alert[] {
  const { securityAlertResponse } = useSecurityAlertResponse();
  const { trackBlockaidAlertLinkClickedEvent } = useConfirmationMetricEvents();
  const sendingFiatTotal = useSendingAssetsFiatTotal();
  const approvedAmountFiat = useApprovedAmountFiat();

  const isResultTypeIgnored =
    !securityAlertResponse?.result_type ||
    IGNORED_RESULT_TYPES.includes(
      securityAlertResponse?.result_type as BlockaidResultType,
    );

  const alerts = useMemo(() => {
    if (!securityAlertResponse || isResultTypeIgnored) {
      return [];
    }

    const { result_type, reason, features } = securityAlertResponse;
    const modalAmount = getBlockaidModalAmount(
      reason as Reason,
      sendingFiatTotal,
      approvedAmountFiat,
    );

    return [
      {
        key: AlertKeys.Blockaid,
        content: (
          <BlockaidAlertContent
            alertDetails={features as string[]}
            securityAlertResponse={
              securityAlertResponse as SecurityAlertResponse
            }
            sendingFiatTotal={sendingFiatTotal}
            onContactUsClicked={trackBlockaidAlertLinkClickedEvent}
          />
        ),
        // The blockaid message displays in the confirm alert modal when the only alert is a blockaid alert
        message: getBlockaidConfirmModalMessage(reason as Reason, modalAmount),
        title: getBlockaidBannerTitle(reason as Reason),
        severity: getBlockaidAlertSeverity(result_type as BlockaidResultType),
      },
    ] as Alert[];
  }, [
    approvedAmountFiat,
    isResultTypeIgnored,
    securityAlertResponse,
    sendingFiatTotal,
    trackBlockaidAlertLinkClickedEvent,
  ]);

  return alerts;
}
