import '../mocks';
import React, { useRef } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type {
  CryptoCurrency,
  FiatCurrency,
  RegionsService,
} from '@consensys/on-ramp-sdk';
import renderWithProvider, {
  type DeepPartial,
} from '../../../app/util/test/renderWithProvider';
import type { RootState } from '../../../app/reducers';
import { renderComponentViewScreen } from '../render';
import Routes from '../../../app/constants/navigation/Routes';
import {
  RampSDKProvider,
  type RampSDK,
} from '../../../app/components/UI/Ramp/Aggregator/sdk';
import BuildQuote from '../../../app/components/UI/Ramp/Aggregator/Views/BuildQuote/BuildQuote';
import Quotes from '../../../app/components/UI/Ramp/Aggregator/Views/Quotes/Quotes';
import V2BuildQuote from '../../../app/components/UI/Ramp/Views/BuildQuote/BuildQuote';
import V2TokenSelection from '../../../app/components/UI/Ramp/Views/TokenSelection/TokenSelection';
import V2SettingsModal from '../../../app/components/UI/Ramp/Views/Modals/SettingsModal/SettingsModal';
import V2PaymentSelectionModal from '../../../app/components/UI/Ramp/Views/Modals/PaymentSelectionModal/PaymentSelectionModal';
import V2ProviderSelectionModal from '../../../app/components/UI/Ramp/Views/Modals/ProviderSelectionModal/ProviderSelectionModal';
import PaymentMethodSelectorModal from '../../../app/components/UI/Ramp/Aggregator/components/PaymentMethodSelectorModal';
import TokenSelectModal from '../../../app/components/UI/Ramp/Aggregator/components/TokenSelectModal/TokenSelectModal';
import FiatSelectorModal from '../../../app/components/UI/Ramp/Aggregator/components/FiatSelectorModal';
import RegionSelectorModal from '../../../app/components/UI/Ramp/Aggregator/components/RegionSelectorModal';
import SettingsModal from '../../../app/components/UI/Ramp/Aggregator/Views/Modals/Settings/SettingsModal';
import AccountSelector from '../../../app/components/Views/AccountSelector';
import { useStore } from 'react-redux';
import { Text } from 'react-native';
import {
  RampType,
  type Region,
} from '../../../app/components/UI/Ramp/Aggregator/types';
import { deepMerge } from '../stateFixture';
import {
  buildRampsFranceSellFixture,
  initialStateRamps,
} from '../presets/ramps';
import Engine from '../../../app/core/Engine';
import { updateBgState } from '../../../app/core/redux/slices/engine';
import type { MultichainAccountsFixture } from '../presets/multichainAccounts';
import type { Store } from '@reduxjs/toolkit';

interface RenderBuildQuoteViewOptions {
  rampType?: RampType;
  overrides?: DeepPartial<RootState>;
  initialParams?: Record<string, unknown>;
  state?: DeepPartial<RootState>;
}

interface AccountsControllerMock {
  state: {
    internalAccounts: {
      accounts: Record<string, unknown>;
      selectedAccount: string;
    };
    accountIdByAddress: Record<string, string>;
  };
  listAccounts: jest.Mock;
  listMultichainAccounts: jest.Mock;
}

function syncEngineAccountsFromFixture(
  fixture: MultichainAccountsFixture,
  selectedAccountOverride?: string,
) {
  const accountsController = Engine.context
    .AccountsController as unknown as AccountsControllerMock;
  const selectedAccount =
    selectedAccountOverride ??
    fixture.state.engine?.backgroundState?.AccountsController?.internalAccounts
      ?.selectedAccount ??
    Object.keys(fixture.internalAccounts)[0] ??
    '';

  accountsController.state.internalAccounts = {
    accounts: fixture.internalAccounts,
    selectedAccount: selectedAccount as string,
  };
  accountsController.state.accountIdByAddress = Object.values(
    fixture.internalAccounts,
  ).reduce<Record<string, string>>(
    (addressMap, account) => ({
      ...addressMap,
      [account.address]: account.id,
      [account.address.toLowerCase()]: account.id,
    }),
    {},
  );
  accountsController.listAccounts.mockReturnValue(
    Object.values(fixture.internalAccounts),
  );
  accountsController.listMultichainAccounts.mockReturnValue(
    Object.values(fixture.internalAccounts),
  );
}

interface EngineWithState {
  state?: Record<string, unknown>;
  context: typeof Engine.context;
}

/**
 * Mirrors AccountSelector → Engine.context.AccountTreeController.setSelectedAccountGroup
 * so Redux selectors (useAccountGroupName) update in component view tests.
 */
export function wireAccountTreeControllerForStore(
  store: Store,
  fixture: MultichainAccountsFixture,
) {
  const accountTreeController = Engine.context
    .AccountTreeController as unknown as {
    setSelectedAccountGroup: (groupId: string) => void;
  };

  accountTreeController.setSelectedAccountGroup = (groupId: string) => {
    const group = Object.values(fixture.groups).find((g) => g?.id === groupId);
    const accountId = group?.accounts?.[0];
    if (!group || !accountId) {
      return;
    }

    const engineWithState = Engine as unknown as EngineWithState;
    const backgroundState = store.getState().engine.backgroundState as Record<
      string,
      unknown
    >;
    const existingAccountTree = backgroundState.AccountTreeController as Record<
      string,
      unknown
    >;

    engineWithState.state = {
      ...(engineWithState.state ?? {}),
      AccountTreeController: {
        ...existingAccountTree,
        selectedAccountGroup: groupId,
      },
      AccountsController: {
        internalAccounts: {
          accounts: fixture.internalAccounts,
          selectedAccount: accountId,
        },
      },
    };

    store.dispatch(updateBgState({ key: 'AccountTreeController' }));
    store.dispatch(updateBgState({ key: 'AccountsController' }));
    syncEngineAccountsFromFixture(fixture, accountId);
  };
}

/**
 * Wires Engine.context.RampsController.setSelectedProvider so that provider
 * changes propagate to Redux — mirrors how the real controller pushes state
 * through its messenger. Call once after rendering; resets on jest.restoreAllMocks.
 */
export function wireRampsControllerForStore(store: Store) {
  const rampsController = Engine.context.RampsController as unknown as {
    setSelectedProvider: (
      providerId: string | null,
      options?: { autoSelected?: boolean },
    ) => void;
    setSelectedPaymentMethod: (
      paymentMethod?: { id: string } | string | null,
    ) => void;
    setSelectedToken: (assetId: string) => void;
  };

  const updateRampsSlice = (
    key: 'providers' | 'paymentMethods' | 'tokens',
    resolveSelected: (slice: Record<string, unknown>) => unknown,
  ) => {
    const backgroundState = store.getState().engine.backgroundState as Record<
      string,
      unknown
    >;
    const existingRamps = backgroundState.RampsController as Record<
      string,
      unknown
    >;
    const existingSlice = existingRamps[key] as Record<string, unknown>;

    const engineWithState = Engine as unknown as EngineWithState;
    engineWithState.state = {
      ...(engineWithState.state ?? {}),
      RampsController: {
        ...existingRamps,
        [key]: { ...existingSlice, selected: resolveSelected(existingSlice) },
      },
    };

    store.dispatch(updateBgState({ key: 'RampsController' }));
  };

  rampsController.setSelectedProvider = (providerId) => {
    updateRampsSlice('providers', (slice) =>
      providerId
        ? ((slice.data as { id: string }[]).find((p) => p.id === providerId) ??
          null)
        : null,
    );
  };

  rampsController.setSelectedPaymentMethod = (paymentMethod) => {
    const paymentMethodId =
      typeof paymentMethod === 'string' ? paymentMethod : paymentMethod?.id;
    updateRampsSlice('paymentMethods', (slice) =>
      paymentMethodId
        ? ((slice.data as { id: string }[]).find(
            (method) => method.id === paymentMethodId,
          ) ?? null)
        : null,
    );
  };

  rampsController.setSelectedToken = (assetId) => {
    updateRampsSlice('tokens', (slice) => {
      const data = slice.data as {
        allTokens?: { assetId: string }[];
        topTokens?: { assetId: string }[];
      } | null;
      return (
        [...(data?.allTokens ?? []), ...(data?.topTokens ?? [])].find(
          (token) => token.assetId === assetId,
        ) ?? null
      );
    });
  };
}

/**
 * Connects RampsController selection methods to the Redux store during render,
 * before child screen effects run. Needed when BuildQuote switches provider
 * on mount, which happens before a test can call wireRampsControllerForStore.
 */
function WireRampsControllerOnRender() {
  const store = useStore();
  const wired = useRef(false);
  if (!wired.current) {
    wireRampsControllerForStore(store);
    wired.current = true;
  }
  return null;
}

/**
 * Renders the Aggregator BuildQuote screen wrapped in RampSDKProvider.
 * Defaults to sell mode to match the deeplink-to-sell regression coverage.
 *
 * Requires setupRampSdkApiMock() to be called in beforeEach so the
 * SDK's HTTP initialisation calls are intercepted.
 */
export function renderBuildQuoteView(
  options: RenderBuildQuoteViewOptions = {},
): ReturnType<typeof renderComponentViewScreen> {
  const {
    rampType = RampType.SELL,
    overrides,
    initialParams,
    state: stateOverride,
  } = options;

  const builder = initialStateRamps();
  if (overrides) {
    builder.withOverrides(overrides);
  }
  const state = stateOverride ?? builder.build();

  const BuildQuoteWithProvider = () => (
    <RampSDKProvider rampType={rampType}>
      <BuildQuote />
    </RampSDKProvider>
  );

  return renderComponentViewScreen(
    BuildQuoteWithProvider,
    { name: Routes.RAMP.BUILD_QUOTE },
    { state },
    initialParams,
  );
}

function createQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
}

export interface RenderBuildQuoteWithRoutesResult
  extends ReturnType<typeof renderWithProvider> {
  multichainFixture?: MultichainAccountsFixture;
}

export interface RenderBuildQuoteWithRoutesOptions
  extends RenderBuildQuoteViewOptions {
  /** Register AccountSelector directly on the root stack (sell account switch). */
  includeAccountSelector?: boolean;
  /** Use France + multichain fixture preset for sell E2E parity. */
  useFranceSellFixture?: boolean;
  /**
   * Render the BuildQuote navbar (deposit-style header with the configuration
   * button) and register a TransactionsView placeholder so settings → order
   * history navigation is observable.
   */
  includeBuySettingsAndTransactionsRoutes?: boolean;
  /**
   * Register a Quotes route placeholder so "Get quotes" navigation from
   * BuildQuote can be asserted via route probe.
   */
  includeQuotesRoute?: boolean;
}

/**
 * Marker rendered by the placeholder TransactionsView screen so the
 * settings → order history navigation can be asserted from tests.
 */
export const TRANSACTIONS_VIEW_PLACEHOLDER_TEXT =
  'TransactionsView placeholder';

interface TransactionsViewPlaceholderRouteParams {
  redirectToOrders?: boolean;
  screen?: string;
  params?: { redirectToOrders?: boolean };
}

const TransactionsViewPlaceholder = ({
  route,
}: {
  route: { params?: TransactionsViewPlaceholderRouteParams };
}) => {
  const redirectToOrders =
    route.params?.redirectToOrders ?? route.params?.params?.redirectToOrders;
  return (
    <Text>
      {TRANSACTIONS_VIEW_PLACEHOLDER_TEXT} redirectToOrders=
      {String(Boolean(redirectToOrders))}
    </Text>
  );
};

/**
 * Renders Aggregator BuildQuote with the Ramp modal stack registered.
 * Use this when a test presses BuildQuote controls that navigate to token,
 * fiat, region, payment method selectors, or account selector.
 */
export function renderBuildQuoteWithRoutes(
  options: RenderBuildQuoteWithRoutesOptions = {},
): RenderBuildQuoteWithRoutesResult {
  const {
    rampType = RampType.BUY,
    overrides,
    initialParams,
    includeAccountSelector = false,
    useFranceSellFixture = false,
    includeBuySettingsAndTransactionsRoutes = false,
    includeQuotesRoute = false,
    state: stateOverride,
  } = options;

  let multichainFixture: MultichainAccountsFixture | undefined;
  let state: DeepPartial<RootState>;

  if (useFranceSellFixture) {
    if (stateOverride) {
      throw new Error(
        'renderBuildQuoteWithRoutes: `state` and `useFranceSellFixture` are mutually exclusive — use `overrides` to extend the France fixture instead.',
      );
    }
    const franceFixture = buildRampsFranceSellFixture();
    multichainFixture = franceFixture.multichainFixture;
    state = franceFixture.state;
    if (overrides) {
      state = deepMerge(
        state as Record<string, unknown>,
        overrides as Record<string, unknown>,
      ) as DeepPartial<RootState>;
    }
    syncEngineAccountsFromFixture(multichainFixture);
  } else {
    const builder = initialStateRamps();
    if (overrides) {
      builder.withOverrides(overrides);
    }
    state = stateOverride ?? builder.build();
  }

  const RootStack = createNativeStackNavigator();
  const MainStack = createNativeStackNavigator();
  const ModalsStack = createNativeStackNavigator();

  const QuotesPlaceholder = () => (
    <Text testID={`route-${Routes.RAMP.QUOTES}`}>Quotes placeholder</Text>
  );

  const MainRoutes = () => (
    <MainStack.Navigator
      initialRouteName={Routes.RAMP.BUILD_QUOTE}
      screenOptions={{
        headerShown: includeBuySettingsAndTransactionsRoutes,
      }}
    >
      <MainStack.Screen
        name={Routes.RAMP.BUILD_QUOTE}
        component={BuildQuote}
        initialParams={initialParams}
      />
      {includeQuotesRoute ? (
        <MainStack.Screen
          name={Routes.RAMP.QUOTES}
          component={QuotesPlaceholder}
        />
      ) : null}
    </MainStack.Navigator>
  );

  const RampModalsRoutes = () => (
    <ModalsStack.Navigator screenOptions={{ headerShown: false }}>
      <ModalsStack.Screen
        name={Routes.RAMP.MODALS.TOKEN_SELECTOR}
        component={TokenSelectModal}
      />
      <ModalsStack.Screen
        name={Routes.RAMP.MODALS.PAYMENT_METHOD_SELECTOR}
        component={PaymentMethodSelectorModal}
      />
      <ModalsStack.Screen
        name={Routes.RAMP.MODALS.FIAT_SELECTOR}
        component={FiatSelectorModal}
      />
      <ModalsStack.Screen
        name={Routes.RAMP.MODALS.REGION_SELECTOR}
        component={RegionSelectorModal}
      />
      {includeBuySettingsAndTransactionsRoutes ? (
        <ModalsStack.Screen
          name={Routes.RAMP.MODALS.SETTINGS}
          component={SettingsModal}
        />
      ) : null}
    </ModalsStack.Navigator>
  );

  const stackTree = (
    <QueryClientProvider client={createQueryClient()}>
      <RampSDKProvider rampType={rampType}>
        <RootStack.Navigator
          initialRouteName={Routes.RAMP.ID}
          screenOptions={{ headerShown: false }}
        >
          <RootStack.Screen name={Routes.RAMP.ID} component={MainRoutes} />
          <RootStack.Screen
            name={Routes.RAMP.MODALS.ID}
            component={RampModalsRoutes}
          />
          {includeAccountSelector ? (
            <RootStack.Screen
              name={Routes.MULTICHAIN_ACCOUNTS.ACCOUNT_SELECTOR}
              component={AccountSelector}
            />
          ) : null}
          {includeBuySettingsAndTransactionsRoutes ? (
            <RootStack.Screen
              name={Routes.TRANSACTIONS_VIEW}
              component={TransactionsViewPlaceholder}
            />
          ) : null}
        </RootStack.Navigator>
      </RampSDKProvider>
    </QueryClientProvider>
  );

  const result = renderWithProvider(stackTree, { state });

  if (multichainFixture) {
    wireAccountTreeControllerForStore(result.store, multichainFixture);
  }

  return { ...result, multichainFixture };
}

interface RenderV2BuildQuoteViewOptions {
  initialParams?: Record<string, unknown>;
  state?: DeepPartial<RootState>;
  overrides?: DeepPartial<RootState>;
}

/**
 * Renders the V2 unified-buy BuildQuote screen
 * (`app/components/UI/Ramp/Views/BuildQuote`). This is the screen entered via
 * `createBuildQuoteNavDetails` from the V2 router branch in `handleRampUrl`,
 * NOT the legacy Aggregator BuildQuote.
 *
 * Seed `RampsController` Redux state via `overrides` and stub
 * `Engine.context.RampsController` methods so the React Query layers
 * (`useRampsProviders`, `useRampsPaymentMethods`, `useRampsQuotes`) resolve
 * with deterministic data instead of hitting the real controller.
 */
export function renderV2BuildQuoteView(
  options: RenderV2BuildQuoteViewOptions = {},
): ReturnType<typeof renderWithProvider> {
  const { initialParams, state: stateOverride, overrides } = options;

  const builder = initialStateRamps();
  if (overrides) {
    builder.withOverrides(overrides);
  }
  const state = stateOverride ?? builder.build();

  const RootStack = createNativeStackNavigator();

  const stackTree = (
    <QueryClientProvider client={createQueryClient()}>
      <RootStack.Navigator
        initialRouteName={Routes.RAMP.AMOUNT_INPUT}
        screenOptions={{ headerShown: false }}
      >
        <RootStack.Screen
          name={Routes.RAMP.AMOUNT_INPUT}
          component={V2BuildQuote}
          initialParams={initialParams}
        />
      </RootStack.Navigator>
    </QueryClientProvider>
  );

  return renderWithProvider(stackTree, { state });
}

interface RenderV2BuildQuoteWithRoutesOptions
  extends RenderV2BuildQuoteViewOptions {
  /**
   * Register V2 SettingsModal under `RampModals` and a TransactionsView
   * placeholder so the settings cog → "View order history" navigation path
   * can be asserted end to end.
   */
  includeBuySettingsAndTransactionsRoutes?: boolean;
  /**
   * Register V2 PaymentSelectionModal under `RampModals` so taps on the
   * payment pill from BuildQuote navigate to the payment selector.
   */
  includePaymentSelectionRoute?: boolean;
  /**
   * Register V2 ProviderSelectionModal under `RampModals` so the
   * `Change provider` link inside PaymentSelectionModal can navigate to
   * the provider list.
   */
  includeProviderSelectionRoute?: boolean;
  /**
   * Register route probes for the screens `continueWithQuote` navigates to
   * (Checkout WebView, VerifyIdentity, EnterEmail). Each probe renders its
   * route params as JSON under `testID="route-<RouteName>"`.
   */
  includeContinueRoutes?: boolean;
  /**
   * Register a route probe for the Token Not Available modal so the
   * unavailable-token redirect can be asserted.
   */
  includeTokenNotAvailableRoute?: boolean;
  /**
   * Connect RampsController selection methods to Redux during the first
   * render, so mount effects (provider auto-switch) see the wired methods.
   */
  wireRampsController?: boolean;
}

/**
 * Builds a placeholder screen that renders `testID="route-<routeName>"` with
 * its route params serialised as JSON, so tests can assert both the
 * navigation target and the params passed to it.
 */
export function createRouteParamsProbe(routeName: string) {
  const RouteParamsProbe = ({
    route,
  }: {
    route: { params?: Record<string, unknown> };
  }) => (
    <Text testID={`route-${routeName}`}>
      {JSON.stringify(route.params ?? {})}
    </Text>
  );
  return RouteParamsProbe;
}

/**
 * Renders the V2 BuildQuote screen plus the V2 modal routes that BuildQuote
 * navigates into (settings cog → SettingsModal → TransactionsView, payment
 * pill → PaymentSelectionModal). Use this when a test taps controls that
 * navigate inside the V2 flow.
 */
export function renderV2BuildQuoteWithRoutes(
  options: RenderV2BuildQuoteWithRoutesOptions = {},
): ReturnType<typeof renderWithProvider> {
  const {
    initialParams,
    state: stateOverride,
    overrides,
    includeBuySettingsAndTransactionsRoutes = false,
    includePaymentSelectionRoute = false,
    includeProviderSelectionRoute = false,
    includeContinueRoutes = false,
    includeTokenNotAvailableRoute = false,
    wireRampsController = false,
  } = options;

  const builder = initialStateRamps();
  if (overrides) {
    builder.withOverrides(overrides);
  }
  const state = stateOverride ?? builder.build();

  const RootStack = createNativeStackNavigator();
  const MainStack = createNativeStackNavigator();
  const ModalsStack = createNativeStackNavigator();

  const CheckoutProbe = createRouteParamsProbe(Routes.RAMP.CHECKOUT);
  const VerifyIdentityProbe = createRouteParamsProbe(
    Routes.RAMP.VERIFY_IDENTITY,
  );
  const EnterEmailProbe = createRouteParamsProbe(Routes.RAMP.ENTER_EMAIL);
  const TokenNotAvailableProbe = createRouteParamsProbe(
    Routes.RAMP.MODALS.TOKEN_NOT_AVAILABLE,
  );

  const MainRoutes = () => (
    <MainStack.Navigator
      initialRouteName={Routes.RAMP.AMOUNT_INPUT}
      screenOptions={{ headerShown: false }}
    >
      <MainStack.Screen
        name={Routes.RAMP.AMOUNT_INPUT}
        component={V2BuildQuote}
        initialParams={initialParams}
      />
      {includeContinueRoutes ? (
        <MainStack.Screen
          name={Routes.RAMP.CHECKOUT}
          component={CheckoutProbe}
        />
      ) : null}
      {includeContinueRoutes ? (
        <MainStack.Screen
          name={Routes.RAMP.VERIFY_IDENTITY}
          component={VerifyIdentityProbe}
        />
      ) : null}
      {includeContinueRoutes ? (
        <MainStack.Screen
          name={Routes.RAMP.ENTER_EMAIL}
          component={EnterEmailProbe}
        />
      ) : null}
    </MainStack.Navigator>
  );

  const RampModalsRoutes = () => (
    <ModalsStack.Navigator screenOptions={{ headerShown: false }}>
      {includeBuySettingsAndTransactionsRoutes ? (
        <ModalsStack.Screen
          name={Routes.RAMP.MODALS.BUILD_QUOTE_SETTINGS}
          component={V2SettingsModal}
        />
      ) : null}
      {includePaymentSelectionRoute ? (
        <ModalsStack.Screen
          name={Routes.RAMP.MODALS.PAYMENT_SELECTION}
          component={V2PaymentSelectionModal}
        />
      ) : null}
      {includeProviderSelectionRoute ? (
        <ModalsStack.Screen
          name={Routes.RAMP.MODALS.PROVIDER_SELECTION}
          component={V2ProviderSelectionModal}
        />
      ) : null}
      {includeTokenNotAvailableRoute ? (
        <ModalsStack.Screen
          name={Routes.RAMP.MODALS.TOKEN_NOT_AVAILABLE}
          component={TokenNotAvailableProbe}
        />
      ) : null}
    </ModalsStack.Navigator>
  );

  const stackTree = (
    <QueryClientProvider client={createQueryClient()}>
      {wireRampsController ? <WireRampsControllerOnRender /> : null}
      <RootStack.Navigator
        initialRouteName={Routes.RAMP.ID}
        screenOptions={{ headerShown: false }}
      >
        <RootStack.Screen name={Routes.RAMP.ID} component={MainRoutes} />
        {(includeBuySettingsAndTransactionsRoutes ||
          includePaymentSelectionRoute ||
          includeProviderSelectionRoute ||
          includeTokenNotAvailableRoute) && (
          <RootStack.Screen
            name={Routes.RAMP.MODALS.ID}
            component={RampModalsRoutes}
          />
        )}
        {includeBuySettingsAndTransactionsRoutes ? (
          <RootStack.Screen
            name={Routes.TRANSACTIONS_VIEW}
            component={TransactionsViewPlaceholder}
          />
        ) : null}
      </RootStack.Navigator>
    </QueryClientProvider>
  );

  return renderWithProvider(stackTree, { state });
}

interface RenderV2TokenSelectionWithRoutesOptions {
  state?: DeepPartial<RootState>;
  overrides?: DeepPartial<RootState>;
  /**
   * Connect RampsController selection methods to Redux during the first
   * render, so a token tap updates the selected token before BuildQuote mounts.
   */
  wireRampsController?: boolean;
}

/**
 * Renders the V2 unified-buy entry point: TokenSelection as the initial
 * screen with the real V2 BuildQuote registered at `AMOUNT_INPUT`, so a token
 * tap can be followed into the amount screen. The Unsupported Token modal is
 * registered as a route probe.
 */
export function renderV2TokenSelectionWithRoutes(
  options: RenderV2TokenSelectionWithRoutesOptions = {},
): ReturnType<typeof renderWithProvider> {
  const {
    state: stateOverride,
    overrides,
    wireRampsController = false,
  } = options;

  const builder = initialStateRamps();
  if (overrides) {
    builder.withOverrides(overrides);
  }
  const state = stateOverride ?? builder.build();

  const RootStack = createNativeStackNavigator();
  const MainStack = createNativeStackNavigator();
  const ModalsStack = createNativeStackNavigator();

  const UnsupportedTokenProbe = createRouteParamsProbe(
    Routes.RAMP.MODALS.UNSUPPORTED_TOKEN,
  );

  const MainRoutes = () => (
    <MainStack.Navigator
      initialRouteName={Routes.RAMP.TOKEN_SELECTION}
      screenOptions={{ headerShown: false }}
    >
      <MainStack.Screen
        name={Routes.RAMP.TOKEN_SELECTION}
        component={V2TokenSelection}
      />
      <MainStack.Screen
        name={Routes.RAMP.AMOUNT_INPUT}
        component={V2BuildQuote}
      />
    </MainStack.Navigator>
  );

  const RampModalsRoutes = () => (
    <ModalsStack.Navigator screenOptions={{ headerShown: false }}>
      <ModalsStack.Screen
        name={Routes.RAMP.MODALS.UNSUPPORTED_TOKEN}
        component={UnsupportedTokenProbe}
      />
    </ModalsStack.Navigator>
  );

  const stackTree = (
    <QueryClientProvider client={createQueryClient()}>
      {wireRampsController ? <WireRampsControllerOnRender /> : null}
      <RootStack.Navigator
        initialRouteName={Routes.RAMP.TOKEN_SELECTION_ROOT}
        screenOptions={{ headerShown: false }}
      >
        <RootStack.Screen
          name={Routes.RAMP.TOKEN_SELECTION_ROOT}
          component={MainRoutes}
        />
        <RootStack.Screen
          name={Routes.RAMP.MODALS.ID}
          component={RampModalsRoutes}
        />
      </RootStack.Navigator>
    </QueryClientProvider>
  );

  return renderWithProvider(stackTree, { state });
}

/**
 * Default region used by the Aggregator Quotes renderer. France matches the
 * sell flow regression baseline (USD/EUR fiat, region-default amount paths).
 */
const DEFAULT_AGG_REGION = {
  id: '/regions/fr',
  name: 'France',
  emoji: '🇫🇷',
  unsupported: false,
  recommended: true,
  detected: false,
  support: { buy: true, sell: true, recurringBuy: false },
  currencies: ['/currencies/fiat/eur'],
} as unknown as Region;

const DEFAULT_AGG_ASSET = {
  id: '/currencies/crypto/1/eth',
  idv2: '/currencies/crypto/1/0x0000000000000000000000000000000000000000',
  network: {
    active: true,
    chainId: '1',
    chainName: 'Ethereum Mainnet',
    shortName: 'Ethereum',
  },
  logo: 'https://token.api.cx.metamask.io/assets/nativeCurrencyLogos/ethereum.svg',
  decimals: 18,
  address: '0x0000000000000000000000000000000000000000',
  symbol: 'ETH',
  name: 'Ethereum',
} as unknown as CryptoCurrency;

const DEFAULT_AGG_FIAT = {
  id: '/currencies/fiat/eur',
  symbol: 'EUR',
  name: 'Euro',
  denomSymbol: '€',
  decimals: 2,
} as unknown as FiatCurrency;

/** Shape that `useSDKMethod('getQuotes' | 'getSellQuotes')` consumes via `data?.quotes`. */
export interface AggregatorQuotesSdkMocks {
  /** Resolved value for `sdk.getQuotes(regionId, paymentMethods, crypto, fiat, amount, receiver, abortController)`. */
  getQuotes?: jest.Mock;
  /** Resolved value for `sdk.getSellQuotes(...)`. */
  getSellQuotes?: jest.Mock;
}

export interface RenderAggregatorQuotesViewOptions {
  rampType: RampType;
  /** Amount passed via route params + used in the SDK call. */
  amount?: number;
  /** Selected asset on the RampSDK context (passed as `crypto` to `getQuotes`). */
  selectedAsset?: CryptoCurrency;
  /** Selected fiat on the RampSDK context (passed as `fiat` to `getQuotes`). */
  selectedFiatCurrency?: FiatCurrency;
  /** Selected region on the RampSDK context (used as `regionId`). */
  selectedRegion?: Region;
  /** Selected payment method id (passed as `[paymentMethodId]` to `getQuotes`). */
  selectedPaymentMethodId?: string;
  /** Selected wallet address (passed as `receiver` to `getQuotes`). */
  selectedAddress?: string;
  /** Pre-built jest.fn() spies for the SDK quote methods. */
  sdkMocks?: AggregatorQuotesSdkMocks;
  state?: DeepPartial<RootState>;
  overrides?: DeepPartial<RootState>;
}

export interface RenderAggregatorQuotesViewResult {
  render: ReturnType<typeof renderComponentViewScreen>;
  sdkMocks: Required<AggregatorQuotesSdkMocks>;
}

/**
 * Renders the Aggregator `Quotes` screen with a stub `RegionsService`-shaped
 * SDK whose `getQuotes` / `getSellQuotes` return deterministic data.
 *
 * Tests are responsible for mocking `LoadingAnimation` to fire its
 * `onAnimationEnd` immediately when `finish={true}` so the screen exits the
 * animation phase and renders the resolved quote.
 *
 * The pipeline exercised here mirrors production:
 * `Quotes` → `useQuotesAndCustomActions` → `useSortedQuotes` → `useQuotes` →
 * `useSDKMethod('getQuotes' | 'getSellQuotes')` → `sdk[method](...)`. Only
 * the leaf HTTP call is replaced — every hook layer above it runs as it
 * does in the app.
 */
export function renderAggregatorQuotesView(
  options: RenderAggregatorQuotesViewOptions,
): RenderAggregatorQuotesViewResult {
  const {
    rampType,
    amount = 50,
    selectedAsset = DEFAULT_AGG_ASSET,
    selectedFiatCurrency = DEFAULT_AGG_FIAT,
    selectedRegion = DEFAULT_AGG_REGION,
    selectedPaymentMethodId = '/payments/debit-credit-card',
    selectedAddress = '0x1234567890123456789012345678901234567890',
    sdkMocks = {},
    state: stateOverride,
    overrides,
  } = options;

  const builder = initialStateRamps();
  if (overrides) {
    builder.withOverrides(overrides);
  }
  const state = stateOverride ?? builder.build();

  const getQuotes =
    sdkMocks.getQuotes ??
    jest.fn().mockResolvedValue({ quotes: [], sorted: [], customActions: [] });
  const getSellQuotes =
    sdkMocks.getSellQuotes ??
    jest.fn().mockResolvedValue({ quotes: [], sorted: [], customActions: [] });

  const sdkStub = { getQuotes, getSellQuotes } as unknown as RegionsService;

  const rampSdkValue: RampSDK = {
    sdk: sdkStub,
    sdkError: undefined,
    rampType,
    setRampType: jest.fn(),
    intent: undefined,
    setIntent: jest.fn(),
    selectedRegion,
    setSelectedRegion: jest.fn(),
    selectedPaymentMethodId,
    setSelectedPaymentMethodId: jest.fn(),
    selectedAsset,
    setSelectedAsset: jest.fn(),
    selectedFiatCurrencyId: selectedFiatCurrency.id,
    setSelectedFiatCurrencyId: jest.fn(),
    selectedAddress,
    selectedNetworkName: selectedAsset.network?.shortName,
    isBuy: rampType === RampType.BUY,
    isSell: rampType === RampType.SELL,
    appConfig: {
      POLLING_INTERVAL: 20000,
      POLLING_INTERVAL_HIGHLIGHT: 10000,
      POLLING_CYCLES: 6,
    },
    callbackBaseUrl:
      'https://on-ramp-content.uat-api.cx.metamask.io/regions/fake-callback',
    isInternalBuild: true,
  };

  const QuotesWithProvider = () => (
    <RampSDKProvider value={rampSdkValue} rampType={rampType}>
      <Quotes />
    </RampSDKProvider>
  );

  const render = renderComponentViewScreen(
    QuotesWithProvider,
    { name: Routes.RAMP.QUOTES },
    { state },
    {
      amount,
      asset: selectedAsset,
      fiatCurrency: selectedFiatCurrency,
    },
  );

  return {
    render,
    sdkMocks: { getQuotes, getSellQuotes },
  };
}
