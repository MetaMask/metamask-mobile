import '../mocks';
import React from 'react';
import { Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { QueryClient } from '@tanstack/react-query';
import type { DeepPartial } from '../../../app/util/test/renderWithProvider';
import type { RootState } from '../../../app/reducers';
import Routes from '../../../app/constants/navigation/Routes';
import MoneyEarningsView from '../../../app/components/UI/Money/Views/MoneyEarningsView';
import { renderComponentViewScreen, renderScreenWithRoutes } from '../render';
import { initialStateMoney } from '../presets/money';

const ENABLED_FLAG = { enabled: true, minimumVersion: '0.0.0' };

interface RenderMoneyEarningsViewOptions {
  overrides?: DeepPartial<RootState>;
  remoteFeatureFlags?: Record<string, unknown>;
  initialParams?: Record<string, unknown>;
}

const createQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

const buildState = ({
  overrides,
  remoteFeatureFlags,
}: RenderMoneyEarningsViewOptions): DeepPartial<RootState> => {
  const builder = initialStateMoney({
    remoteFeatureFlags: {
      moneyEnableMoneyAccount: ENABLED_FLAG,
      ...remoteFeatureFlags,
    },
  });
  builder.withOverrides({
    engine: {
      backgroundState: {
        GeolocationController: { location: 'US' },
      },
    },
  });

  if (overrides) {
    builder.withOverrides(overrides);
  }

  return builder.build();
};

export const renderMoneyEarningsView = (
  options: RenderMoneyEarningsViewOptions = {},
): ReturnType<typeof renderComponentViewScreen> =>
  renderComponentViewScreen(
    MoneyEarningsView,
    { name: Routes.MONEY.EARNINGS },
    { state: buildState(options) },
    options.initialParams,
    createQueryClient(),
  );

interface RenderMoneyEarningsViewWithRoutesOptions
  extends RenderMoneyEarningsViewOptions {
  extraRoutes?: Parameters<typeof renderScreenWithRoutes>[2];
}

export const renderMoneyEarningsViewWithRoutes = (
  options: RenderMoneyEarningsViewWithRoutesOptions = {},
): ReturnType<typeof renderScreenWithRoutes> =>
  renderScreenWithRoutes(
    MoneyEarningsView,
    { name: Routes.MONEY.EARNINGS },
    options.extraRoutes ?? [],
    { state: buildState(options) },
    options.initialParams,
    createQueryClient(),
  );

const MoneyHomeProbe = (): React.ReactElement => {
  const navigation = useNavigation();

  React.useEffect(() => {
    navigation.navigate(Routes.MONEY.EARNINGS);
  }, [navigation]);

  return <Text testID={`route-${Routes.MONEY.HOME}`}>{Routes.MONEY.HOME}</Text>;
};

export const renderMoneyEarningsViewWithBackRoute = (
  options: RenderMoneyEarningsViewOptions = {},
): ReturnType<typeof renderScreenWithRoutes> =>
  renderScreenWithRoutes(
    MoneyHomeProbe,
    { name: Routes.MONEY.HOME },
    [
      {
        name: Routes.MONEY.EARNINGS,
        Component: MoneyEarningsView,
      },
    ],
    { state: buildState(options) },
    undefined,
    createQueryClient(),
  );
