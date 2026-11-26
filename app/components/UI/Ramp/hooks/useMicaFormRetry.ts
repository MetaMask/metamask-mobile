import { useCallback, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type {
  TransakAdditionalRequirementsResponse,
  TransakBuyQuote,
} from '@metamask/ramps-controller';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import Logger from '../../../../util/Logger';
import { parseUserFacingError } from '../utils/parseUserFacingError';
import { MICA_FORM_ROUTES, type MicaFormType } from '../utils/micaForms';

interface UseMicaFormRetryOptions {
  formType: MicaFormType;
  quote: TransakBuyQuote;
  quoteId: string;
  headlessSessionId?: string;
  getAdditionalRequirements: (
    quoteId: string,
  ) => Promise<TransakAdditionalRequirementsResponse>;
  setError: (error: string | null) => void;
  fallbackError: string;
  logContext: string;
}

/**
 * Refetches the additional requirements for a MiCA form whose options were
 * missing, and reopens the form screen with the fresh metadata.
 */
export function useMicaFormRetry({
  formType,
  quote,
  quoteId,
  headlessSessionId,
  getAdditionalRequirements,
  setError,
  fallbackError,
  logContext,
}: UseMicaFormRetryOptions) {
  const navigation = useNavigation<AppNavigationProp>();
  const [retrying, setRetrying] = useState(false);

  const retry = useCallback(async () => {
    setRetrying(true);
    setError(null);
    try {
      const freshRequirements = await getAdditionalRequirements(quoteId);
      const form = freshRequirements?.formsRequired?.find(
        (f) => f.type === formType,
      );
      if (form?.metadata) {
        navigation.navigate(MICA_FORM_ROUTES[formType], {
          quote,
          quoteId,
          metadata: form.metadata,
          ...(headlessSessionId ? { headlessSessionId } : {}),
        });
      }
    } catch (err) {
      Logger.error(
        err as Error,
        `${logContext}: Failed to retry fetch requirements`,
      );
      setError(parseUserFacingError(err, fallbackError));
    } finally {
      setRetrying(false);
    }
  }, [
    getAdditionalRequirements,
    quoteId,
    formType,
    navigation,
    quote,
    headlessSessionId,
    setError,
    fallbackError,
    logContext,
  ]);

  return { retrying, retry };
}
