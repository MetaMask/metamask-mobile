import '../mocks';
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { CanonicalMoneyAccountBalanceResponse } from '@metamask/money-account-balance-service';
import type { DeepPartial } from '../../../app/util/test/renderWithProvider';
import type { RootState } from '../../../app/reducers';
import Engine from '../../../app/core/Engine';
import Routes from '../../../app/constants/navigation/Routes';
import { TokenDetailsSource } from '../../../app/components/UI/TokenDetails/constants/constants';
import EarnSection from '../../../app/components/UI/Earn/components/EarnSection';
import { MoneyAccountBalanceServiceQueryKeys } from '../../../app/components/UI/Money/queryKeys';
import { createRouteParamsProbe, renderScreenWithRoutes } from '../render';
import { initialStateEarn } from '../presets/earn';

const EarnStack = createNativeStackNavigator();
const EarnNavigator = EarnStack.Navigator as unknown as React.ComponentType<{
  screenOptions?: { headerShown?: boolean };
}>;
const EarnStrategySelectionProbe = createRouteParamsProbe(
  Routes.EARN.STRATEGY_SELECTION,
);

const NestedEarnNavigationStack = () =>
  React.createElement(
    EarnNavigator,
    { screenOptions: { headerShown: false } },
    React.createElement(EarnStack.Screen, {
      name: Routes.EARN.STRATEGY_SELECTION,
      component: EarnStrategySelectionProbe,
    }),
  );

export const createEarnMoneyBalanceResponse = (
  totalBalance: string,
): CanonicalMoneyAccountBalanceResponse =>
  ({
    musdBalance: '0',
    vmusdValueInMusd: totalBalance,
    totalBalance,
    source: 'rpc',
    usedFallback: false,
  }) as CanonicalMoneyAccountBalanceResponse;

interface EarnDataServiceResponses {
  moneyBalance?:
    | CanonicalMoneyAccountBalanceResponse
    | PromiseLike<CanonicalMoneyAccountBalanceResponse>; // Needed since tests use deferred promises.
  vaultApy?: number | PromiseLike<number> | 'unavailable';
  lendingMarketsError?: Error;
  lendingMarketsRefresh?: PromiseLike<void>;
}

type ControllerMessengerCall = (
  action: string,
  ...args: unknown[]
) => Promise<unknown>;

const getControllerMessengerCall = () =>
  Engine.controllerMessenger
    .call as unknown as jest.MockedFunction<ControllerMessengerCall>;

const getRefreshLendingMarkets = () =>
  Engine.context.EarnController.refreshLendingMarkets as jest.MockedFunction<
    typeof Engine.context.EarnController.refreshLendingMarkets
  >;

/**
 * Configures the component-view Engine mock for Money data-service queries.
 * Call resetEarnDataServiceMocks in afterEach to isolate tests.
 */
export const mockEarnDataServiceResponses = ({
  moneyBalance = createEarnMoneyBalanceResponse('0'),
  vaultApy = 0.062,
  lendingMarketsError,
  lendingMarketsRefresh,
}: EarnDataServiceResponses = {}) => {
  const refreshLendingMarkets = getRefreshLendingMarkets();

  if (lendingMarketsError) {
    refreshLendingMarkets.mockRejectedValue(lendingMarketsError);
  } else if (lendingMarketsRefresh) {
    refreshLendingMarkets.mockImplementation(async () => {
      await lendingMarketsRefresh;
    });
  } else {
    refreshLendingMarkets.mockResolvedValue(undefined);
  }

  getControllerMessengerCall().mockImplementation(async (action) => {
    if (
      action === MoneyAccountBalanceServiceQueryKeys.FETCH_BALANCE_WITH_FALLBACK
    ) {
      return moneyBalance;
    }

    if (action === MoneyAccountBalanceServiceQueryKeys.GET_VAULT_APY) {
      return {
        apy: vaultApy === 'unavailable' ? undefined : await (vaultApy ?? 0.062),
      };
    }

    return undefined;
  });
};

export const resetEarnDataServiceMocks = () => {
  getControllerMessengerCall().mockReset();
  getControllerMessengerCall().mockResolvedValue(undefined);
  getRefreshLendingMarkets().mockReset();
  getRefreshLendingMarkets().mockResolvedValue(undefined);
};

interface RenderEarnSectionOptions {
  overrides?: DeepPartial<RootState>;
  tokenDetailsSource?: TokenDetailsSource;
  initialParams?: Record<string, unknown>;
  dataServiceResponses?: EarnDataServiceResponses;
}

/**
 * Renders EarnSection with route probes for both navigation outcomes.
 */
export function renderEarnSectionWithRoutes(
  options: RenderEarnSectionOptions = {},
): ReturnType<typeof renderScreenWithRoutes> {
  const {
    overrides,
    tokenDetailsSource = TokenDetailsSource.ExploreEarn,
    initialParams,
    dataServiceResponses,
  } = options;
  const builder = initialStateEarn();

  if (overrides) {
    builder.withOverrides(overrides);
  }

  mockEarnDataServiceResponses(dataServiceResponses);

  const EarnSectionScreen = () =>
    React.createElement(EarnSection, { tokenDetailsSource });

  return renderScreenWithRoutes(
    EarnSectionScreen,
    { name: 'EarnSection' },
    [
      {
        name: 'Asset',
        Component: createRouteParamsProbe('Asset'),
      },
      {
        name: Routes.EARN.ROOT,
        Component: NestedEarnNavigationStack,
      },
    ],
    {
      state: builder.build(),
    },
    initialParams,
  );
}
