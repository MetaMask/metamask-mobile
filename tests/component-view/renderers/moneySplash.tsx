import '../mocks';
import React from 'react';
import { Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Engine from '../../../app/core/Engine';
import MoneySplashView from '../../../app/components/UI/Money/Views/MoneySplashView';
import Routes from '../../../app/constants/navigation/Routes';
import type { AppNavigationProp } from '../../../app/core/NavigationService/types';
import { createRouteParamsProbe, renderScreenWithRoutes } from '../render';
import { moneySplashViewState } from '../presets/moneySplash';

const engineCall = Engine.controllerMessenger.call as jest.Mock;
const baseEngineCall = engineCall.getMockImplementation();

function installNetworkClientMock() {
  jest
    .spyOn(Engine.context.NetworkController, 'findNetworkClientIdByChainId')
    .mockReturnValue('monad');
}

export interface RenderMoneySplashViewOptions {
  splashSeen?: boolean;
  /** APY decimal, or null to simulate a missing APY. */
  apy?: number | null;
  params?: Record<string, unknown>;
  /** Push the splash over a host screen so dismissal can be asserted. */
  pushedOverHost?: boolean;
}

const createMoneySplashHost = (params?: Record<string, unknown>) =>
  function MoneySplashHost() {
    const navigation = useNavigation<AppNavigationProp>();

    React.useEffect(() => {
      if (params) {
        navigation.navigate(Routes.MONEY.SPLASH, params);
        return;
      }

      navigation.navigate(Routes.MONEY.SPLASH);
    }, [navigation]);

    return <Text>home</Text>;
  };

export function renderMoneySplashView({
  splashSeen = false,
  apy = 0.062,
  params,
  pushedOverHost = false,
}: RenderMoneySplashViewOptions = {}) {
  installNetworkClientMock();
  engineCall.mockReset();
  engineCall.mockImplementation((action: string, ...args: unknown[]) => {
    if (action === 'MoneyAccountBalanceService:getVaultApy') {
      return Promise.resolve(apy === null ? undefined : { apy: String(apy) });
    }
    if (baseEngineCall) {
      return baseEngineCall(action, ...args);
    }
    return Promise.resolve(undefined);
  });

  const state = moneySplashViewState({ splashSeen });
  const routes = [
    {
      name: Routes.MONEY.CONFIRMATIONS_ROOT,
      Component: createRouteParamsProbe(Routes.MONEY.CONFIRMATIONS_ROOT),
    },
    { name: Routes.HOME_TABS },
  ];

  if (pushedOverHost) {
    return renderScreenWithRoutes(
      createMoneySplashHost(params) as unknown as React.ComponentType,
      { name: Routes.MONEY.HOME },
      [
        {
          name: Routes.MONEY.SPLASH,
          Component: MoneySplashView as unknown as React.ComponentType<object>,
        },
        ...routes,
      ],
      { state },
    );
  }

  return renderScreenWithRoutes(
    MoneySplashView,
    { name: Routes.MONEY.SPLASH },
    routes,
    { state },
    params,
  );
}
