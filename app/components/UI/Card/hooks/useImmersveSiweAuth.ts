import { useCallback, useState } from 'react';
import Engine from '../../../../core/Engine';
import type { CardAuthResult } from '../../../../core/Engine/controllers/card-controller/provider-types';
import { getCardProviderErrorMessage } from '../util/getCardProviderErrorMessage';

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

export const useImmersveSiweAuth = () => {
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signIn = useCallback(
    async ({ country, address }: SiweSignInParams): Promise<CardAuthResult> => {
      setIsAuthenticating(true);
      setError(null);
      try {
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

        return await controller.submitCredentials({
          type: 'siwe',
          signature,
        });
      } catch (e) {
        setError(getCardProviderErrorMessage(e));
        throw e;
      } finally {
        setIsAuthenticating(false);
      }
    },
    [],
  );

  return { signIn, isAuthenticating, error };
};
