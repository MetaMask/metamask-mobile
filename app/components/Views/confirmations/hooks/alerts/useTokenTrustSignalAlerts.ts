import { Alert, Severity } from '../../types/alerts';
import { AlertKeys } from '../../constants/alerts';
import { strings } from '../../../../../../locales/i18n';
import { useMemo } from 'react';

export function useTokenTrustSignalAlerts(): Alert[] {
  const alerts = useMemo(() => [
      {
        key: AlertKeys.TokenTrustSignal,
        field: 'token',
        message: strings('alert_system.token_trust_signal.malicious.message'),
        title: strings('alert_system.token_trust_signal.malicious.title'),
        severity: Severity.Danger,
        isBlocking: false,
      },
    ], []);

  return alerts;
}
