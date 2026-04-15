import type { MessengerClientInitFunction } from '../../types';
import { CardController, defaultCardControllerState } from './CardController';
import type { CardControllerMessenger } from './types';
import { BaanxService } from './services/BaanxService';
import { BaanxProvider } from './providers/BaanxProvider';
import { resolveBaanxConfig } from './services/baanx-config';
import type { CardFeatureFlag } from '../../../../selectors/featureFlagController/card';

/**
 * Initialize the CardController.
 *
 * @param request - The request object.
 * @returns The CardController.
 */
export const cardControllerInit: MessengerClientInitFunction<
  CardController,
  CardControllerMessenger
> = (request) => {
  const { controllerMessenger, persistedState } = request;

  const featureState = controllerMessenger.call(
    'RemoteFeatureFlagController:getState',
  );
  const cardFeatureFlag = featureState.remoteFeatureFlags?.cardFeature as
    | CardFeatureFlag
    | undefined;

  const baanxConfig = resolveBaanxConfig();
  const baanxProvider = new BaanxProvider({
    service: new BaanxService(baanxConfig),
    cardFeatureFlag,
  });

  const controller = new CardController({
    messenger: controllerMessenger,
    state: {
      ...(persistedState.CardController ?? defaultCardControllerState),
      activeProviderId: 'baanx',
    },
    providers: { baanx: baanxProvider },
  });

  return { controller };
};

export { CardController };
export type { CardControllerMessenger };
