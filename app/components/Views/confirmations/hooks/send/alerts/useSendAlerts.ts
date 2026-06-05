import { useCallback, useEffect, useMemo, useState } from 'react';

import { useSendContext } from '../../../context/send-context/send-context';
import { useFirstTimeInteractionSendAlert } from './useFirstTimeInteractionSendAlert';
import { useTokenContractSendAlert } from './useTokenContractSendAlert';
import type { SendAlert } from './types';

export function useSendAlerts(): {
  alerts: SendAlert[];
  hasUnacknowledgedAlerts: boolean;
  acknowledgeAlerts: () => void;
  isAlertCheckPending: boolean;
} {
  const { to } = useSendContext();
  const { alert: tokenContractAlert, isPending: tokenContractPending } =
    useTokenContractSendAlert();
  const { alert: firstTimeAlert, isPending: firstTimePending } =
    useFirstTimeInteractionSendAlert();
  const [acknowledged, setAcknowledged] = useState(false);

  const isAlertCheckPending = tokenContractPending || firstTimePending;

  const alerts = useMemo(() => {
    const result: SendAlert[] = [];
    if (tokenContractAlert) {
      result.push(tokenContractAlert);
    }
    if (firstTimeAlert) {
      result.push(firstTimeAlert);
    }
    return result;
  }, [tokenContractAlert, firstTimeAlert]);

  useEffect(() => {
    setAcknowledged(false);
  }, [to]);

  const acknowledgeAlerts = useCallback(() => {
    setAcknowledged(true);
  }, []);

  const hasUnacknowledgedAlerts = alerts.length > 0 && !acknowledged;

  return {
    alerts,
    hasUnacknowledgedAlerts,
    acknowledgeAlerts,
    isAlertCheckPending,
  };
}
