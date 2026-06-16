import { useMemo } from 'react';
import { AlertKeys } from '../../constants/alerts';
import { Alert, Severity } from '../../types/alerts';
import { strings } from '../../../../../../locales/i18n';
import { useConfirmationContext } from '../../context/confirmation-context';

export function useHeadlessBuyErrorAlert(): Alert[] {
  const { headlessBuyError } = useConfirmationContext();

  return useMemo(() => {
    if (!headlessBuyError) {
      return [];
    }

    return [
      {
        key: AlertKeys.HeadlessBuyError,
        title: strings('alert_system.headless_buy_error.title'),
        message: headlessBuyError,
        severity: Severity.Danger,
      },
    ];
  }, [headlessBuyError]);
}
