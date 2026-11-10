import '../mocks';
import Engine from '../../../app/core/Engine';
import MoneySplashView from '../../../app/components/UI/Money/Views/MoneySplashView';
import Routes from '../../../app/constants/navigation/Routes';
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
}

export function renderMoneySplashView({
  splashSeen = false,
  apy = 0.062,
  params,
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

  return renderScreenWithRoutes(
    MoneySplashView,
    { name: Routes.MONEY.SPLASH },
    [
      {
        name: Routes.MONEY.CONFIRMATIONS_ROOT,
        Component: createRouteParamsProbe(Routes.MONEY.CONFIRMATIONS_ROOT),
      },
      { name: Routes.HOME_TABS },
    ],
    { state },
    params,
  );
}
