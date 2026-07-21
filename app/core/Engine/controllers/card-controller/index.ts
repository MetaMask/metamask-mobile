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

  // Temporary: lets getCardFeatureFlag overlay selectedCardProgramId after
  // the controller exists. Easy to remove with the multi-program test UI.
  const controllerRef: { current?: CardController } = {};

  const getCardFeatureFlag = (): CardFeatureFlag => {
    const featureState = controllerMessenger.call(
      'RemoteFeatureFlagController:getState',
    );
    const flag = resolveCardFeatureFlag(
      featureState.remoteFeatureFlags?.cardFeature as
        | CardFeatureFlag
        | undefined,
    );

    // Temporary: overlay the SignUp-selected Immersve cardProgramId so the
    // provider keeps reading from the feature flag as usual.
    const selectedCardProgramId =
      controllerRef.current?.state?.selectedCardProgramId;
    if (selectedCardProgramId && flag.immersve) {
      return {
        ...flag,
        immersve: {
          ...flag.immersve,
          cardProgramId: selectedCardProgramId,
        },
      };
    }

    return flag;
  };

  const baanxConfig = resolveBaanxConfig();
  const baanxProvider = new BaanxProvider({
    service: new BaanxService(baanxConfig),
    getCardFeatureFlag,
  });

  const immersveConfig = resolveImmersveConfig();
  const immersveProvider = new ImmersveProvider({
    service: new ImmersveService({
      getBaseUrl: () =>
        getCardFeatureFlag()?.immersve?.apiBaseUrl || immersveConfig.baseUrl,
    }),
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
  controllerRef.current = controller;

  return { controller };
};

export { CardController };
export type { CardControllerMessenger };
