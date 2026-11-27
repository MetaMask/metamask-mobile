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
import RecurringOrderDetailsView from '../../../app/components/UI/Bridge/Views/RecurringOrderDetailsView';
import { RecurringOrderDetailsViewSelectorsIDs } from '../../../app/components/UI/Bridge/Views/RecurringOrderDetailsView/RecurringOrderDetailsView.testIds';
import type { RecurringOrderDetailsRouteParams } from '../../../app/components/UI/Bridge/Views/RecurringOrderDetailsView/RecurringOrderDetailsView.types';
import RecurringSwapDetailsView from '../../../app/components/UI/Bridge/Views/RecurringSwapDetailsView';
import SwapsLimitOrderActivityPage from '../../../app/components/UI/Bridge/Views/SwapsLimitOrderActivityPage';
import type { AppNavigationProp } from '../../../app/core/NavigationService/types';
import BlockExplorersModal from '../../../app/components/UI/Bridge/components/TransactionDetails/BlockExplorersModal';
import { OpenLimitOrderDetailsModalScreen } from '../../../app/components/UI/Bridge/components/OpenLimitOrderDetailsModal/OpenLimitOrderDetailsModalScreen';
import { LimitOrderTabRow } from '../../../app/components/UI/Bridge/components/LimitOrderTabRow';
import type { LimitOrder } from '../../../app/components/UI/Bridge/api/limitOrders/getLimitOrders/types';
import { initialStateBridge } from '../presets/bridge';
import type { TransactionMeta } from '@metamask/transaction-controller';
import type { Transaction } from '@metamask/keyring-api';
import { BridgeSessionProvider } from '../../../app/components/UI/Bridge/providers/BridgeSessionProvider';
import { BridgeQuoteDataProvider } from '../../../app/components/UI/Bridge/hooks/useBridgeQuoteData/BridgeQuoteDataContext';
import { BridgeTokenSelector } from '../../../app/components/UI/Bridge/components/BridgeTokenSelector/BridgeTokenSelector';
import { HardwareWalletProvider } from '../../../app/core/HardwareWallet/HardwareWalletProvider';

const BridgeSessionTree = ({ children }: { children: React.ReactNode }) => (
  <HardwareWalletProvider>
    <BridgeSessionProvider>
      <BridgeQuoteDataProvider>{children}</BridgeQuoteDataProvider>
    </BridgeSessionProvider>
  </HardwareWalletProvider>
);

const RecurringOrderDetailsWithSession = () => (
  <BridgeSessionTree>
    <RecurringOrderDetailsView />
  </BridgeSessionTree>
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
const RecurringSwapDetailsViewWithSession = withBridgeSession(
  RecurringSwapDetailsView,
);

const ScreensStack = createNativeStackNavigator();
const BridgeProbeStack = createNativeStackNavigator();
const LimitOrderActivityStack = createNativeStackNavigator();
const BridgeViewParamsProbe = createRouteParamsProbe(Routes.BRIDGE.BRIDGE_VIEW);

export function BridgeLimitOrderActivityNavigator() {
  return (
    <LimitOrderActivityStack.Navigator screenOptions={{ headerShown: false }}>
      <LimitOrderActivityStack.Screen
        name={Routes.BRIDGE.SWAPS_LIMIT_ORDER_ACTIVITY}
        component={SwapsLimitOrderActivityPage}
      />
    </LimitOrderActivityStack.Navigator>
  );
}

function BridgeNavigatorProbe() {
  return (
    <BridgeProbeStack.Navigator screenOptions={{ headerShown: false }}>
      <BridgeProbeStack.Screen
        name={Routes.BRIDGE.BRIDGE_VIEW}
        component={BridgeViewParamsProbe}
      />
    </BridgeProbeStack.Navigator>
  );
}

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

interface RenderBridgeViewForMoneySwapOptions extends RenderBridgeViewOptions {
  srcTokenAddress?: string;
  destTokenAddress?: string;
  srcAmount?: string;
}

interface RenderRecurringOrderDetailsViewOptions
  extends RenderBridgeViewOptions,
    RecurringOrderDetailsRouteParams {}

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
    BridgeViewWithSession,
    { name: Routes.BRIDGE.BRIDGE_VIEW },
    { state },
  );
}

const HomeTabsParamsProbe = createRouteParamsProbe(Routes.HOME_TABS);

/**
 * Home sits under Bridge, matching production. Confirm uses
 * `navigate(HOME_TABS, ..., { pop: true })`. Starting on Bridge alone lets iOS
 * native-stack pop the only screen and never mount Home.
 */
const MoneySwapHomeHost = () => {
  const navigation = useNavigation<AppNavigationProp>();

  React.useEffect(() => {
    navigation.navigate(Routes.BRIDGE.BRIDGE_VIEW);
  }, [navigation]);

  return <HomeTabsParamsProbe />;
};

/**
 * BridgeView plus probes for Money home and the post-trade sheet so a confirm
 * press can assert which destination the swap actually took.
 */
export const renderBridgeViewForMoneySwap = (
  options: RenderBridgeViewForMoneySwapOptions = {},
): ReturnType<typeof renderScreenWithRoutes> => {
  const {
    overrides,
    deterministicFiat,
    srcTokenAddress,
    destTokenAddress,
    srcAmount,
  } = options;

  const builder = initialStateBridge({
    deterministicFiat,
  }).withBridgeRecommendedQuoteEvmSimple({
    srcTokenAddress,
    destTokenAddress,
    srcAmount,
  });
  if (overrides) {
    builder.withOverrides(overrides);
  }

  return renderScreenWithRoutes(
    MoneySwapHomeHost,
    { name: Routes.HOME_TABS },
    [
      {
        name: Routes.BRIDGE.BRIDGE_VIEW,
        Component: BridgeViewWithSession,
      },
      {
        name: Routes.BRIDGE.MODALS.ROOT,
        Component: createRouteParamsProbe(Routes.BRIDGE.MODALS.ROOT),
      },
    ],
    { state: builder.build() },
  );
};

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

export function renderBridgeViewWithRecurringOrderDetails(
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
        name: Routes.BRIDGE.RECURRING_ORDER_DETAILS,
        Component: RecurringOrderDetailsView,
      },
      {
        name: Routes.BRIDGE.RECURRING_SWAP_DETAILS,
        Component: RecurringSwapDetailsView,
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
        Component: BridgeTokenSelector,
      },
    ],
    state,
  );

function RecurringOrderDetailsTestEntry({
  order,
}: RecurringOrderDetailsRouteParams) {
  const navigation = useNavigation<AppNavigationProp>();

  return React.createElement(
    Pressable,
    {
      onPress: () =>
        navigation.navigate(Routes.BRIDGE.RECURRING_ORDER_DETAILS, { order }),
      testID: RecurringOrderDetailsViewSelectorsIDs.TEST_ENTRY_BUTTON,
    },
    React.createElement(Text, null, 'Open recurring order details'),
  );
}

export function renderRecurringOrderDetailsView({
  order,
  overrides,
  deterministicFiat,
}: RenderRecurringOrderDetailsViewOptions): ReturnType<
  typeof renderScreenWithRoutes
> {
  const builder = initialStateBridge({ deterministicFiat });
  if (overrides) {
    builder.withOverrides(overrides);
  }
  const state = builder.build();

  return renderScreenWithRoutes(
    () => React.createElement(RecurringOrderDetailsTestEntry, { order }),
    { name: 'RecurringOrderDetailsTestEntry' },
    [
      {
        name: Routes.BRIDGE.RECURRING_ORDER_DETAILS,
        Component: RecurringOrderDetailsWithSession,
      },
      {
        name: Routes.BRIDGE.RECURRING_SWAP_DETAILS,
        Component: RecurringSwapDetailsViewWithSession,
      },
      {
        name: Routes.BRIDGE.ROOT,
        Component: BridgeNavigatorProbe,
      },
      {
        name: Routes.WEBVIEW.MAIN,
        Component: createRouteParamsProbe(
          Routes.WEBVIEW.MAIN,
        ) as React.ComponentType<object>,
      },
      {
        name: Routes.RAMP.TOKEN_SELECTION,
        Component: createRouteParamsProbe(
          Routes.RAMP.TOKEN_SELECTION,
        ) as React.ComponentType<object>,
      },
    ],
    { state },
  );
}

interface RenderOpenLimitOrderDetailsModalOptions
  extends RenderBridgeViewOptions {
  order: LimitOrder;
}

export function renderOpenLimitOrderDetailsModal({
  order,
  overrides,
  deterministicFiat,
}: RenderOpenLimitOrderDetailsModalOptions): ReturnType<
  typeof renderScreenWithRoutes
> {
  const builder = initialStateBridge({ deterministicFiat });
  if (overrides) {
    builder.withOverrides(overrides);
  }
  const state = builder.build();

  return renderScreenWithRoutes(
    OpenLimitOrderDetailsModalScreen,
    { name: Routes.BRIDGE.MODALS.OPEN_LIMIT_ORDER_DETAILS_MODAL },
    [
      {
        name: Routes.BRIDGE.MODALS.ROOT,
        Component: BridgeModalStack,
      },
    ],
    { state },
    { order },
  );
}

interface RenderLimitOrderTabRowOptions extends RenderBridgeViewOptions {
  order: LimitOrder;
}

export function renderLimitOrderTabRow({
  order,
  overrides,
  deterministicFiat,
}: RenderLimitOrderTabRowOptions): ReturnType<typeof renderScreenWithRoutes> {
  const builder = initialStateBridge({ deterministicFiat });
  if (overrides) {
    builder.withOverrides(overrides);
  }
  const state = builder.build();

  return renderScreenWithRoutes(
    () => React.createElement(LimitOrderTabRow, { order }),
    { name: Routes.BRIDGE.BRIDGE_VIEW },
    [
      {
        name: Routes.BRIDGE.MODALS.ROOT,
        Component: BridgeModalStack,
      },
      {
        name: Routes.BRIDGE.ROOT,
        Component: BridgeLimitOrderActivityNavigator,
      },
      {
        name: Routes.WEBVIEW.MAIN,
        Component: createRouteParamsProbe(
          Routes.WEBVIEW.MAIN,
        ) as React.ComponentType<object>,
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
    BlockExplorersModal,
    { name: Routes.BRIDGE.MODALS.TRANSACTION_DETAILS_BLOCK_EXPLORER },
    [
      {
        name: Routes.WEBVIEW.MAIN,
        Component: createRouteParamsProbe(Routes.WEBVIEW.MAIN),
      },
    ],
    { state: options.state },
    options.params,
  );
}
