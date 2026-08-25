import type { MessengerClientInitFunction } from '../../types';
import { CardController, defaultCardControllerState } from './CardController';
import type { CardControllerMessenger } from './types';
import { BaanxService } from './services/BaanxService';
import { BaanxProvider } from './providers/BaanxProvider';
import { resolveBaanxConfig } from './services/baanx-config';
import { ImmersveService } from './services/ImmersveService';
import { ImmersveProvider } from './providers/ImmersveProvider';
import { resolveImmersveConfig } from './services/immersve-config';
import { CardService } from './services/CardService';
import { CardProviderIds } from './provider-types';
import { getDefaultCardApiBaseUrlForMetaMaskEnv } from '../../../../components/UI/Card/util/mapCardApiUrl';
import {
  readCardFeatureFlag,
  readCardProviderConfig,
  type CardFeatureFlag,
  type ImmersveProgramConfig,
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

  const getRemoteFeatureFlags = () =>
    controllerMessenger.call('RemoteFeatureFlagController:getState')
      .remoteFeatureFlags;

  const getCardFeatureFlag = (): CardFeatureFlag =>
    readCardFeatureFlag(getRemoteFeatureFlags());

  const getImmersveConfig = (): ImmersveProgramConfig =>
    readCardProviderConfig<ImmersveProgramConfig>(
      getRemoteFeatureFlags(),
      CardProviderIds.Immersve,
    );

  const baanxConfig = resolveBaanxConfig();
  const baanxProvider = new BaanxProvider({
    service: new BaanxService(baanxConfig),
    getCardFeatureFlag,
  });

  const immersveConfig = resolveImmersveConfig();
  const immersveProvider = new ImmersveProvider({
    service: new ImmersveService({
      getBaseUrl: () =>
        getImmersveConfig().apiBaseUrl || immersveConfig.baseUrl,
    }),
    config: immersveConfig,
    getProgramConfig: getImmersveConfig,
  });

  const cardService = new CardService({
    getBaseUrl: () =>
      getDefaultCardApiBaseUrlForMetaMaskEnv(process.env.METAMASK_ENVIRONMENT),
  });

  const controller = new CardController({
    messenger: controllerMessenger,
    state: {
      ...(persistedState.CardController ?? defaultCardControllerState),
    },
    providers: {
      [CardProviderIds.Baanx]: baanxProvider,
      [CardProviderIds.Immersve]: immersveProvider,
    },
    cardService,
  });

  return { controller };
};

export { CardController };
export type { CardControllerMessenger };
