import '../mocks';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createStackNavigator } from '@react-navigation/stack';
import type {
  CryptoCurrency,
  FiatCurrency,
  QuoteResponse,
  RegionsService,
  SellQuoteResponse,
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
import V2SettingsModal from '../../../app/components/UI/Ramp/Views/Modals/SettingsModal/SettingsModal';
import V2PaymentSelectionModal from '../../../app/components/UI/Ramp/Views/Modals/PaymentSelectionModal/PaymentSelectionModal';
import V2ProviderSelectionModal from '../../../app/components/UI/Ramp/Views/Modals/ProviderSelectionModal/ProviderSelectionModal';
import PaymentMethodSelectorModal from '../../../app/components/UI/Ramp/Aggregator/components/PaymentMethodSelectorModal';
import TokenSelectModal from '../../../app/components/UI/Ramp/Aggregator/components/TokenSelectModal/TokenSelectModal';
import FiatSelectorModal from '../../../app/components/UI/Ramp/Aggregator/components/FiatSelectorModal';
import RegionSelectorModal from '../../../app/components/UI/Ramp/Aggregator/components/RegionSelectorModal';
import SettingsModal from '../../../app/components/UI/Ramp/Aggregator/Views/Modals/Settings/SettingsModal';
import AccountSelector from '../../../app/components/Views/AccountSelector';
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
  };

  rampsController.setSelectedProvider = (providerId) => {
    const backgroundState = store.getState().engine.backgroundState as Record<
      string,
      unknown
    >;
    const existingRamps = backgroundState.RampsController as Record<
      string,
      unknown
    >;
    const existingProviders = existingRamps.providers as {
      data: { id: string }[];
      selected: unknown;
    };

    const provider = providerId
      ? (existingProviders.data.find((p) => p.id === providerId) ?? null)
      : null;

    const engineWithState = Engine as unknown as EngineWithState;
    engineWithState.state = {
      ...(engineWithState.state ?? {}),
      RampsController: {
        ...existingRamps,
        providers: { ...existingProviders, selected: provider },
      },
    };

    store.dispatch(updateBgState({ key: 'RampsController' }));
  };
}

interface RootModalFlowParams {
  screen?: string;
  params?: Record<string, unknown>;
}

interface RootModalFlowProps {
  route: {
    params?: RootModalFlowParams;
  };
}

const RootModalFlow = ({ route }: RootModalFlowProps) => {
  const initialScreen = route.params?.screen ?? Routes.SHEET.ACCOUNT_SELECTOR;
  const ModalStack = createStackNavigator();

  return (
    <ModalStack.Navigator
      initialRouteName={initialScreen}
      screenOptions={{ headerShown: false }}
    >
      <ModalStack.Screen
        name={Routes.SHEET.ACCOUNT_SELECTOR}
        component={AccountSelector}
        initialParams={route.params?.params}
      />
    </ModalStack.Navigator>
  );
};

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
  /** Register AccountSelector under ROOT_MODAL_FLOW (sell account switch). */
  includeAccountSelector?: boolean;
  /** Use France + multichain fixture preset for sell E2E parity. */
  useFranceSellFixture?: boolean;
  /**
   * Render the BuildQuote navbar (deposit-style header with the configuration
   * button) and register a TransactionsView placeholder so settings → order
   * history navigation is observable.
   */
  includeBuySettingsAndTransactionsRoutes?: boolean;
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

  const RootStack = createStackNavigator();
  const MainStack = createStackNavigator();
  const ModalsStack = createStackNavigator();

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
              name={Routes.MODAL.ROOT_MODAL_FLOW}
              component={RootModalFlow}
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

  const RootStack = createStackNavigator();

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
  } = options;

  const builder = initialStateRamps();
  if (overrides) {
    builder.withOverrides(overrides);
  }
  const state = stateOverride ?? builder.build();

  const RootStack = createStackNavigator();
  const MainStack = createStackNavigator();
  const ModalsStack = createStackNavigator();

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
    </ModalsStack.Navigator>
  );

  const stackTree = (
    <QueryClientProvider client={createQueryClient()}>
      <RootStack.Navigator
        initialRouteName={Routes.RAMP.ID}
        screenOptions={{ headerShown: false }}
      >
        <RootStack.Screen name={Routes.RAMP.ID} component={MainRoutes} />
        <RootStack.Screen
          name={Routes.RAMP.MODALS.ID}
          component={RampModalsRoutes}
        />
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
export interface AggregatorQuotesPayload {
  quotes: (QuoteResponse | SellQuoteResponse)[];
  sorted: unknown[];
  customActions: unknown[];
}

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
