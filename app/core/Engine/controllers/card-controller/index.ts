import type { MessengerClientInitFunction } from '../../types';
import { CardController, defaultCardControllerState } from './CardController';
import type { CardControllerMessenger } from './types';
import { BaanxService } from './services/BaanxService';
import { BaanxProvider } from './providers/BaanxProvider';
import { resolveBaanxConfig } from './services/baanx-config';
import { ImmersveService } from './services/ImmersveService';
import { ImmersveProvider } from './providers/ImmersveProvider';
import { resolveImmersveConfig } from './services/immersve-config';
import {
  resolveCardFeatureFlag,
  type CardFeatureFlag,
} from '../../../../selectors/featureFlagController/card';

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

  const getCardFeatureFlag = () => {
    const featureState = controllerMessenger.call(
      'RemoteFeatureFlagController:getState',
    );
    return resolveCardFeatureFlag(
      featureState.remoteFeatureFlags?.cardFeature as
        | CardFeatureFlag
        | undefined,
    );
  };

  const baanxConfig = resolveBaanxConfig();
  const baanxProvider = new BaanxProvider({
    service: new BaanxService(baanxConfig),
    getCardFeatureFlag,
  });

  const immersveConfig = resolveImmersveConfig();
  const immersveProvider = new ImmersveProvider({
    service: new ImmersveService({ baseUrl: immersveConfig.baseUrl }),
    config: immersveConfig,
    getCardFeatureFlag,
  });

  const controller = new CardController({
    messenger: controllerMessenger,
    state: {
      ...(persistedState.CardController ?? defaultCardControllerState),
    },
    providers: { baanx: baanxProvider, immersve: immersveProvider },
  });

  return { controller };
};

export { CardController };
export type { CardControllerMessenger };
