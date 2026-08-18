import { useCallback, useState } from 'react';
import Engine from '../../../../core/Engine';
import {
  CardProviderIds,
  type CardAuthResult,
} from '../../../../core/Engine/controllers/card-controller/provider-types';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import { getCardProviderErrorMessage } from '../util/getCardProviderErrorMessage';
import { withCardProvider } from '../util/metrics';

function getController() {
  const controller = Engine.context?.CardController;
  if (!controller) {
    throw new Error('CardController not initialized');
  }
  return controller;
}

interface SiweSignInParams {
  country: string;
  address: string;
}

function getSiweErrorType(error: unknown): string {
  if (!(error instanceof Error)) {
    return 'unknown';
  }
  const message = error.message.toLowerCase();
  if (
    message.includes('user denied') ||
    message.includes('user rejected') ||
    message.includes('user cancelled') ||
    message.includes('user canceled')
  ) {
    return 'user_cancelled';
  }
  if (message.includes('expected a siwe challenge')) {
    return 'unexpected_auth_step';
  }
  return 'provider_error';
}

export { getSiweErrorType };

export const useImmersveSiweAuth = () => {
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { trackEvent, createEventBuilder } = useAnalytics();

  const signIn = useCallback(
    async ({ country, address }: SiweSignInParams): Promise<CardAuthResult> => {
      setIsAuthenticating(true);
      setError(null);
      const metricsProps = withCardProvider(CardProviderIds.Immersve);
      try {
        trackEvent(
          createEventBuilder(MetaMetricsEvents.CARD_SIWE_AUTH_STARTED)
            .addProperties(metricsProps)
            .build(),
        );

        const controller = getController();

        await controller.initiateAuth(country, address);

        const step = controller.getCurrentAuthStep();
        if (!step || step.type !== 'siwe') {
          throw new Error('Expected a SIWE challenge from the provider');
        }

        const signature =
          await Engine.context.KeyringController.signPersonalMessage({
            data: '0x' + Buffer.from(step.message, 'utf8').toString('hex'),
            from: address,
          });

        const result = await controller.submitCredentials({
          type: 'siwe',
          signature,
        });

        trackEvent(
          createEventBuilder(MetaMetricsEvents.CARD_SIWE_AUTH_COMPLETED)
            .addProperties(metricsProps)
            .build(),
        );

        return result;
      } catch (e) {
        trackEvent(
          createEventBuilder(MetaMetricsEvents.CARD_SIWE_AUTH_FAILED)
            .addProperties(
              withCardProvider(CardProviderIds.Immersve, {
                error_type: getSiweErrorType(e),
              }),
            )
            .build(),
        );
        setError(getCardProviderErrorMessage(e));
        throw e;
      } finally {
        setIsAuthenticating(false);
      }
    },
    [trackEvent, createEventBuilder],
  );

  return { signIn, isAuthenticating, error };
};
