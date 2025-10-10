import React, { useMemo } from 'react';
import { strings } from '../../../../../../locales/i18n';
// TODO: Remove legacy import
import {
  Reason,
  SecurityAlertResponse,
} from '../../legacy/components/BlockaidBanner/BlockaidBanner.types';
import { AlertKeys } from '../../constants/alerts';
import { Alert, AlertSeverity, Severity } from '../../types/alerts';
import { useSecurityAlertResponse } from '../alerts/useSecurityAlertResponse';
import { ResultType as BlockaidResultType } from '../../constants/signatures';
// TODO: Remove legacy import
import { REASON_TITLE_I18N_KEY_MAP } from '../../legacy/components/BlockaidBanner/BlockaidBanner.constants';
import BlockaidAlertContent from '../../components/blockaid-alert-content/blockaid-alert-content';
import { useConfirmationMetricEvents } from '../metrics/useConfirmationMetricEvents';

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

const getTitle = (reason: Reason): string =>
  strings(
    REASON_TITLE_I18N_KEY_MAP[reason] ??
      'blockaid_banner.deceptive_request_title',
  );

const getConfirmModalDescription = (reason: Reason) => {
  let copy;
  switch (reason) {
    case Reason.approvalFarming:
    case Reason.permitFarming:
      copy = strings('alert_system.confirm_modal.blockaid.message1');
      break;
    case Reason.transferFarming:
    case Reason.transferFromFarming:
    case Reason.rawNativeTokenTransfer:
      copy = strings('alert_system.confirm_modal.blockaid.message2');
      break;
    case Reason.seaportFarming:
      copy = strings('alert_system.confirm_modal.blockaid.message3');
      break;
    case Reason.blurFarming:
      copy = strings('alert_system.confirm_modal.blockaid.message4');
      break;
    case Reason.maliciousDomain:
      copy = strings('alert_system.confirm_modal.blockaid.message5');
      break;
    case Reason.tradeOrderFarming:
    case Reason.rawSignatureFarming:
    case Reason.other:
    default:
      copy = strings('alert_system.confirm_modal.blockaid.message');
  }

  return copy;
};

export default function useBlockaidAlerts(): Alert[] {
  const { securityAlertResponse } = useSecurityAlertResponse();
  const { trackBlockaidAlertLinkClickedEvent } = useConfirmationMetricEvents();

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

    return [
      {
        key: AlertKeys.Blockaid,
        content: (
          <BlockaidAlertContent
            alertDetails={features as string[]}
            securityAlertResponse={
              securityAlertResponse as SecurityAlertResponse
            }
            onContactUsClicked={trackBlockaidAlertLinkClickedEvent}
          />
        ),
        // The blockaid message displays in the confirm alert modal when the only alert is a blockaid alert
        message: getConfirmModalDescription(reason as Reason),
        title: getTitle(reason as Reason),
        severity: getBlockaidAlertSeverity(result_type as BlockaidResultType),
      },
    ] as Alert[];
  }, [
    isResultTypeIgnored,
    securityAlertResponse,
    trackBlockaidAlertLinkClickedEvent,
  ]);

  return alerts;
}
