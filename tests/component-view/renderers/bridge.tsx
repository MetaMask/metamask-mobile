import '../mocks';
import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Pressable, Text } from 'react-native';
import type { DeepPartial } from '../../../app/util/test/renderWithProvider';
import type { RootState } from '../../../app/reducers';
import {
  createRouteParamsProbe,
  renderComponentViewScreen,
  renderScreenWithRoutes,
} from '../render';
import Routes from '../../../app/constants/navigation/Routes';
import BridgeView from '../../../app/components/UI/Bridge/Views/BridgeView';
import { BridgeModalStack } from '../../../app/components/UI/Bridge/routes';
import { BridgeTokenSelector } from '../../../app/components/UI/Bridge/components/BridgeTokenSelector/BridgeTokenSelector';
import RecurringJobDetailsView from '../../../app/components/UI/Bridge/Views/RecurringJobDetailsView';
import { RecurringJobDetailsViewSelectorsIDs } from '../../../app/components/UI/Bridge/Views/RecurringJobDetailsView/RecurringJobDetailsView.testIds';
import type { RecurringJobDetailsRouteParams } from '../../../app/components/UI/Bridge/Views/RecurringJobDetailsView/RecurringJobDetailsView.types';
import type { AppNavigationProp } from '../../../app/core/NavigationService/types';
import BlockExplorersModal from '../../../app/components/UI/Bridge/components/TransactionDetails/BlockExplorersModal';
import { initialStateBridge } from '../presets/bridge';
import type { TransactionMeta } from '@metamask/transaction-controller';
import type { Transaction } from '@metamask/keyring-api';
import { BridgeSessionProvider } from '../../../app/components/UI/Bridge/providers/BridgeSessionProvider';
import { BridgeQuoteDataProvider } from '../../../app/components/UI/Bridge/hooks/useBridgeQuoteData/BridgeQuoteDataContext';
import { SwapQuotesProvider } from '../../../app/components/UI/Bridge/providers/SwapQuotesProvider';

const BridgeSessionTree = ({ children }: { children: React.ReactNode }) => (
  <BridgeSessionProvider>
    <SwapQuotesProvider>
      <BridgeQuoteDataProvider>{children}</BridgeQuoteDataProvider>
    </SwapQuotesProvider>
  </BridgeSessionProvider>
);

export const withBridgeSession = (Component: React.ComponentType) =>
  function BridgeViewWithSession() {
    return (
      <BridgeSessionTree>
        <Component />
      </BridgeSessionTree>
    );
  };

export const BridgeViewWithSession = withBridgeSession(BridgeView);

const ScreensStack = createNativeStackNavigator();

const renderBridgeViewWithRoutes = (
  extraScreens: { name: string; Component: React.ComponentType<object> }[],
  state: DeepPartial<RootState>,
) => {
  const BridgeScreenStack = () => (
    <BridgeSessionTree>
      <ScreensStack.Navigator screenOptions={{ headerShown: false }}>
        <ScreensStack.Screen
          name={Routes.BRIDGE.BRIDGE_VIEW}
          component={BridgeView}
        />
        {extraScreens.map(({ name, Component }) => (
          <ScreensStack.Screen key={name} name={name} component={Component} />
        ))}
      </ScreensStack.Navigator>
    </BridgeSessionTree>
  );

  return renderComponentViewScreen(
    BridgeScreenStack,
    { name: Routes.BRIDGE.ROOT },
    { state },
  );
};

interface RenderBridgeViewOptions {
  overrides?: DeepPartial<RootState>;
  deterministicFiat?: boolean;
}

interface RenderRecurringJobDetailsViewOptions extends RenderBridgeViewOptions {
  jobId: string;
}

interface RenderBlockExplorersModalOptions {
  state: DeepPartial<RootState>;
  params: {
    evmTxMeta?: TransactionMeta;
    multiChainTx?: Transaction;
  };
}

/**
 * Renders BridgeView with a sensible default Bridge preset.
 * Pass overrides to tweak the state for each specific test.
 */
export function renderBridgeView(
  options: RenderBridgeViewOptions = {},
): ReturnType<typeof renderComponentViewScreen> {
  const { overrides, deterministicFiat } = options;

  const builder = initialStateBridge({ deterministicFiat });
  if (overrides) {
    builder.withOverrides(overrides);
  }
  const state = builder.build();

  return renderComponentViewScreen(
    BridgeViewWithSession as unknown as React.ComponentType,
    { name: Routes.BRIDGE.BRIDGE_VIEW },
    { state },
  );
}

export function renderBridgeViewWithModals(
  options: RenderBridgeViewOptions = {},
): ReturnType<typeof renderComponentViewScreen> {
  const { overrides, deterministicFiat } = options;
  const builder = initialStateBridge({ deterministicFiat });
  if (overrides) {
    builder.withOverrides(overrides);
  }
  const state = builder.build();

  return renderBridgeViewWithRoutes(
    [
      {
        name: Routes.BRIDGE.MODALS.ROOT,
        Component: BridgeModalStack,
      },
    ],
    state,
  );
}

export function renderBridgeViewWithRecurringJobDetails(
  options: RenderBridgeViewOptions = {},
): ReturnType<typeof renderComponentViewScreen> {
  const { overrides, deterministicFiat } = options;
  const builder = initialStateBridge({ deterministicFiat });
  if (overrides) {
    builder.withOverrides(overrides);
  }
  const state = builder.build();

  return renderBridgeViewWithRoutes(
    [
      {
        name: Routes.BRIDGE.RECURRING_JOB_DETAILS,
        Component:
          RecurringJobDetailsView as unknown as React.ComponentType<object>,
      },
    ],
    state,
  );
}

export const renderBridgeViewWithTokenSelector = (
  state: DeepPartial<RootState>,
) =>
  renderBridgeViewWithRoutes(
    [
      {
        name: Routes.BRIDGE.TOKEN_SELECTOR,
        Component:
          BridgeTokenSelector as unknown as React.ComponentType<object>,
      },
    ],
    state,
  );

function RecurringJobDetailsTestEntry({
  jobId,
}: RecurringJobDetailsRouteParams) {
  const navigation = useNavigation<AppNavigationProp>();

  return React.createElement(
    Pressable,
    {
      onPress: () =>
        navigation.navigate(Routes.BRIDGE.RECURRING_JOB_DETAILS, { jobId }),
      testID: RecurringJobDetailsViewSelectorsIDs.TEST_ENTRY_BUTTON,
    },
    React.createElement(Text, null, 'Open recurring job details'),
  );
}

export function renderRecurringJobDetailsView({
  jobId,
  overrides,
  deterministicFiat,
}: RenderRecurringJobDetailsViewOptions): ReturnType<
  typeof renderScreenWithRoutes
> {
  const builder = initialStateBridge({ deterministicFiat });
  if (overrides) {
    builder.withOverrides(overrides);
  }
  const state = builder.build();

  return renderScreenWithRoutes(
    () => React.createElement(RecurringJobDetailsTestEntry, { jobId }),
    { name: 'RecurringJobDetailsTestEntry' },
    [
      {
        name: Routes.BRIDGE.RECURRING_JOB_DETAILS,
        Component:
          RecurringJobDetailsView as unknown as React.ComponentType<object>,
      },
    ],
    { state },
  );
}

/**
 * Renders BlockExplorersModal with a WEBVIEW.MAIN params probe so explorer
 * presses can assert navigation without mocking useNavigation.
 */
export function renderBlockExplorersModal(
  options: RenderBlockExplorersModalOptions,
): ReturnType<typeof renderScreenWithRoutes> {
  return renderScreenWithRoutes(
    BlockExplorersModal as unknown as React.ComponentType,
    { name: Routes.BRIDGE.MODALS.TRANSACTION_DETAILS_BLOCK_EXPLORER },
    [
      {
        name: Routes.WEBVIEW.MAIN,
        Component: createRouteParamsProbe(Routes.WEBVIEW.MAIN),
      },
    ],
    { state: options.state },
    options.params as unknown as Record<string, unknown>,
  );
}
