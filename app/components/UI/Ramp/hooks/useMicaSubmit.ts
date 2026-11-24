import { useCallback, useMemo, useState } from 'react';
import type {
  TransakAdditionalRequirementsResponse,
  TransakBuyQuote,
} from '@metamask/ramps-controller';
import Routes from '../../../../constants/navigation/Routes';
import Logger from '../../../../util/Logger';
import { parseUserFacingError } from '../utils/parseUserFacingError';
import { useTransakRouting } from './useTransakRouting';

export interface MicaSubmitResult {
  status: 'SUBMITTED' | 'FAILED';
}

interface UseMicaSubmitOptions {
  screenLocation: string;
  quote: TransakBuyQuote;
  quoteId: string;
  headlessSessionId?: string;
  getKycRequirement: (quoteId: string) => Promise<unknown>;
  getAdditionalRequirements: (
    quoteId: string,
  ) => Promise<TransakAdditionalRequirementsResponse>;
  submitError: string;
  logContext: string;
}

/**
 * Submits a MiCA KYC form, refreshes the KYC requirements and routes the user
 * to the next KYC step.
 */
export function useMicaSubmit({
  screenLocation,
  quote,
  quoteId,
  headlessSessionId,
  getKycRequirement,
  getAdditionalRequirements,
  submitError,
  logContext,
}: UseMicaSubmitOptions) {
  // For headless buy flows, post-auth resets must land back on the Host
  // (which carries the live `headlessSessionId`) instead of BuildQuote.
  const transakRoutingConfig = useMemo(
    () => ({
      screenLocation,
      ...(headlessSessionId
        ? {
            baseRoute: Routes.RAMP.HEADLESS_HOST,
            baseRouteParams: { headlessSessionId },
          }
        : {}),
    }),
    [screenLocation, headlessSessionId],
  );
  const { routeAfterAuthentication } = useTransakRouting(transakRoutingConfig);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(
    async (
      submitForm: () => Promise<MicaSubmitResult>,
      failureLogMessage = 'Failed to submit',
    ) => {
      setError(null);
      setLoading(true);

      try {
        const result = await submitForm();

        if (result.status === 'FAILED') {
          setError(submitError);
          return;
        }

        await getKycRequirement(quoteId);
        await getAdditionalRequirements(quoteId);
        await routeAfterAuthentication(quote);
      } catch (err) {
        Logger.error(err as Error, `${logContext}: ${failureLogMessage}`);
        setError(parseUserFacingError(err, submitError));
      } finally {
        setLoading(false);
      }
    },
    [
      submitError,
      getKycRequirement,
      getAdditionalRequirements,
      quoteId,
      routeAfterAuthentication,
      quote,
      logContext,
    ],
  );

  return { loading, error, setError, submit };
}
