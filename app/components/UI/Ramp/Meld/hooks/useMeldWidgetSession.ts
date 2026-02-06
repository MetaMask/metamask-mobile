/**
 * Hook to create a Meld widget session (launches provider checkout).
 *
 * Replaces: the buy-widget URL generation from the aggregator pattern.
 * Maps to: POST /crypto/session/widget
 *
 * When a user selects a quote, this creates a session with the
 * selected provider and returns a widgetUrl to open in a WebView.
 */

import { useCallback, useState } from 'react';
import meldApi from '../api';
import { useMeldContext } from '../MeldProvider';
import {
  MeldQuote,
  MeldWidgetSession,
  MeldWidgetSessionRequest,
} from '../types';
import Logger from '../../../../../util/Logger';

interface UseMeldWidgetSessionResult {
  session: MeldWidgetSession | null;
  isCreating: boolean;
  error: Error | null;
  createSession: (quote: MeldQuote) => Promise<MeldWidgetSession | null>;
}

export default function useMeldWidgetSession(): UseMeldWidgetSessionResult {
  const { selectedCountry, walletAddress, isBuy } = useMeldContext();

  const [session, setSession] = useState<MeldWidgetSession | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createSession = useCallback(
    async (quote: MeldQuote): Promise<MeldWidgetSession | null> => {
      if (!selectedCountry || !walletAddress) {
        setError(
          new Error('Missing country or wallet address for widget session'),
        );
        return null;
      }

      setIsCreating(true);
      setError(null);

      try {
        const request: MeldWidgetSessionRequest = {
          sessionData: {
            walletAddress,
            countryCode: selectedCountry.countryCode,
            sourceCurrencyCode: quote.sourceCurrencyCode,
            sourceAmount: String(quote.sourceAmount),
            destinationCurrencyCode: quote.destinationCurrencyCode,
            serviceProvider: quote.serviceProvider,
            paymentMethodType: quote.paymentMethodType,
            redirectUrl: 'metamask://',
          },
          sessionType: isBuy ? 'BUY' : 'SELL',
          externalCustomerId: walletAddress,
          externalSessionId: `mm-${Date.now()}`,
        };

        Logger.log(
          '[useMeldWidgetSession] Creating session:',
          JSON.stringify(request),
        );

        const result = await meldApi.createWidgetSession(request);
        setSession(result);
        setIsCreating(false);
        return result;
      } catch (err) {
        const sessionError =
          err instanceof Error ? err : new Error(String(err));
        Logger.error(sessionError, '[useMeldWidgetSession] failed');
        setError(sessionError);
        setIsCreating(false);
        return null;
      }
    },
    [selectedCountry, walletAddress, isBuy],
  );

  return { session, isCreating, error, createSession };
}
