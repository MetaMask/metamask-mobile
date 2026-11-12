import { callCollectiblesFixture } from '../../../../../tests/component-view/fixtures/collectibles-data-services';
import { __setMockNetInfo } from '../../../../__mocks__/@react-native-community/netinfo';
import React from 'react';
import { Provider } from 'react-redux';
import { renderHook } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  NavigationContainer,
  createNavigationContainerRef,
  type ParamListBase,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SolAccountType } from '@metamask/keyring-api';
import type { InternalAccount } from '@metamask/keyring-internal-api';
import type { RootState } from '../../../../reducers';
import Engine from '../../../../core/Engine';
import { updateBgState } from '../../../../core/redux/slices/engine';
import { backgroundState } from '../../../../util/test/initial-root-state';
import { createMockSnapInternalAccount } from '../../../../util/test/accountsControllerTestUtils';
import configureStore from '../../../../util/test/configureStore';
import renderWithProvider, {
  type DeepPartial,
} from '../../../../util/test/renderWithProvider';
import { SOLANA_USDC_ASSET_ID } from '../providers/pack-partner/constants';
import { parseUsdcAmount } from '../providers/pack-partner/utils/format';
import type {
  CollectiblesBuybackOperation,
  CollectiblesCard,
  CollectiblesPack,
  CollectiblesPackOperation,
  CollectiblesWalletAccount,
} from '../types';

/** Test helpers shared by the PackPartner UI tests. */

export {
  packPartnerReads,
  serveBuybackOffers,
  serveOwnedCards,
  serveRecentOpenings,
  setCollectiblesFixtureClients,
} from '../../../../../tests/component-view/fixtures/collectibles-data-services';

export const MOCK_INTERNAL_ACCOUNT: InternalAccount =
  createMockSnapInternalAccount(
    '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
    'Solana Account',
    SolAccountType.DataAccount,
  );

export const MOCK_ACCOUNT: CollectiblesWalletAccount = {
  id: MOCK_INTERNAL_ACCOUNT.id,
  address: MOCK_INTERNAL_ACCOUNT.address,
};

/**
 * USDC base units of a whole-USDC catalogue price, as PackPartner maps it.
 *
 * @param price - Catalogue price in USDC.
 * @returns The exact price in base units.
 */
const toPriceAmount = (price: number): string =>
  parseUsdcAmount(price).toString();

/**
 * Pack fixture: 50 USDC, 85% buyback. `priceAmount` follows `price` unless
 * overridden.
 */
export const createPack = (
  overrides: Partial<CollectiblesPack> = {},
): CollectiblesPack => ({
  code: 'pokemon_50',
  name: 'Elite Pokemon Pack',
  shortName: 'PKMN 50',
  category: 'Pokemon',
  price: 50,
  priceAmount: toPriceAmount(overrides.price ?? 50),
  instantBuybackPercent: 85,
  odds: { common: 0.8, uncommon: 0.15, rare: 0.04, epic: 0.01 },
  maxValue: 1500,
  menuOrder: 1,
  ...overrides,
});

/** Owned card fixture, buyback unknown, no image (the image mock loads asynchronously). */
export const createCard = (
  overrides: Partial<CollectiblesCard> = {},
): CollectiblesCard => ({
  mint: 'MintAaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  name: 'Charizard Holo',
  set: 'Base Set',
  grade: 'GEM-MT 10',
  gradingCompany: 'PSA',
  insuredValue: 120,
  rarity: 'rare',
  acquiredAt: 1_000,
  buyback: { status: 'unknown' },
  ...overrides,
});

/**
 * Pack operation fixture, `generated`. `priceAmount` follows `price` unless
 * overridden.
 */
export const createOperation = (
  overrides: Partial<CollectiblesPackOperation> = {},
): CollectiblesPackOperation => ({
  memo: 'memo-1',
  packCode: 'pokemon_50',
  packName: 'Elite Pokemon Pack',
  price: 50,
  priceAmount: toPriceAmount(overrides.price ?? 50),
  status: 'generated',
  createdAt: 1_000,
  updatedAt: 1_000,
  ...overrides,
});

/** Buyback operation fixture: a submitted sale of the `createCard` mint, `pending`. */
export const createSale = (
  overrides: Partial<CollectiblesBuybackOperation> = {},
): CollectiblesBuybackOperation => ({
  mint: 'MintAaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  memo: 'buyback-memo-1',
  status: 'pending',
  amount: '42000000',
  submissionAttempted: true,
  createdAt: 1_000,
  updatedAt: 1_000,
  ...overrides,
});

/**
 * Redux state with the PackPartner operation journal (purchases and
 * buybacks) and a USDC balance for MOCK_ACCOUNT. Owned cards are not state:
 * serve them with `serveOwnedCards`.
 */
export const createTestState = ({
  operations = [],
  sales = [],
  usdcAmount,
}: {
  operations?: CollectiblesPackOperation[];
  sales?: CollectiblesBuybackOperation[];
  /** Human-readable USDC amount, e.g. "100". Omitted means no balance entry. */
  usdcAmount?: string;
} = {}): DeepPartial<RootState> => ({
  engine: {
    backgroundState: {
      ...backgroundState,
      CollectiblesController: {
        hasCompletedOnboarding: true,
        packPartner: {
          operations: {
            [MOCK_ACCOUNT.address]: Object.fromEntries(
              operations.map((operation) => [operation.memo, operation]),
            ),
          },
          sales: {
            [MOCK_ACCOUNT.address]: Object.fromEntries(
              sales.map((sale) => [sale.mint, sale]),
            ),
          },
        },
      },
      AssetsController: {
        ...backgroundState.AssetsController,
        assetsBalance:
          usdcAmount === undefined
            ? {}
            : {
                [MOCK_ACCOUNT.id]: {
                  [SOLANA_USDC_ASSET_ID]: { amount: usdcAmount },
                },
              },
      },
    },
  },
});

/** Store of a rendered screen, as returned by the render helpers. */
interface JournalStore {
  getState: () => RootState;
  dispatch: (action: ReturnType<typeof updateBgState>) => unknown;
}

/**
 * Publishes MOCK_ACCOUNT's PackPartner journal as the controller does after
 * a workflow transition. A part left out keeps its current value.
 *
 * @param store - Store of the rendered screen.
 * @param journal - New purchases and buybacks of MOCK_ACCOUNT.
 * @param journal.operations - Pack operations.
 * @param journal.sales - Buyback operations.
 */
export const publishPackPartnerJournal = (
  store: JournalStore,
  {
    operations,
    sales,
  }: {
    operations?: CollectiblesPackOperation[];
    sales?: CollectiblesBuybackOperation[];
  },
): void => {
  const current =
    store.getState().engine.backgroundState.CollectiblesController;
  const { packPartner } = current;
  Object.assign(Engine, {
    state: {
      CollectiblesController: {
        ...current,
        packPartner: {
          ...packPartner,
          ...(operations && {
            operations: {
              ...packPartner.operations,
              [MOCK_ACCOUNT.address]: Object.fromEntries(
                operations.map((operation) => [operation.memo, operation]),
              ),
            },
          }),
          ...(sales && {
            sales: {
              ...packPartner.sales,
              [MOCK_ACCOUNT.address]: Object.fromEntries(
                sales.map((sale) => [sale.mint, sale]),
              ),
            },
          }),
        },
      },
    },
  });
  store.dispatch(updateBgState({ key: 'CollectiblesController' }));
};

const queryClients = new Set<QueryClient>();
afterEach(() => {
  queryClients.forEach((client) => client.clear());
  queryClients.clear();
});

/** Query client without retries, so failures surface immediately. */
export const createTestQueryClient = (): QueryClient => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: Infinity,
        queryFn: (context) =>
          callCollectiblesFixture(
            String(context.queryKey[0]),
            ...context.queryKey.slice(1),
            'pageParam' in context ? context.pageParam : undefined,
          ),
      },
    },
  });
  queryClients.add(queryClient);
  return queryClient;
};

/** renderHook with a Redux store and a fresh QueryClientProvider. */
export const renderHookWithQueryClient = <Result,>(
  hook: () => Result,
  {
    state = createTestState(),
    queryClient = createTestQueryClient(),
  }: { state?: DeepPartial<RootState>; queryClient?: QueryClient } = {},
) => {
  queryClients.add(queryClient);
  const store = configureStore(state);
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </Provider>
  );
  return { ...renderHook(hook, { wrapper }), store, queryClient };
};

/** renderWithProvider + a fresh QueryClientProvider. */
export const renderWithQueryClient = (
  component: React.ReactElement,
  {
    state = createTestState(),
    queryClient = createTestQueryClient(),
  }: { state?: DeepPartial<RootState>; queryClient?: QueryClient } = {},
) => {
  queryClients.add(queryClient);
  return renderWithProvider(
    <QueryClientProvider client={queryClient}>{component}</QueryClientProvider>,
    { state },
  );
};

/**
 * Renders a screen in a real native stack (so `useRoute` params work) with a
 * QueryClientProvider. The returned `navigationRef` can change the params.
 */
export const renderScreenWithQueryClient = (
  Component: React.ComponentType,
  {
    name,
    params,
    state = createTestState(),
    queryClient = createTestQueryClient(),
  }: {
    name: string;
    params?: object;
    state?: DeepPartial<RootState>;
    queryClient?: QueryClient;
  },
) => {
  queryClients.add(queryClient);
  const Stack = createNativeStackNavigator();
  const navigationRef = createNavigationContainerRef<ParamListBase>();
  const result = renderWithProvider(
    <NavigationContainer ref={navigationRef}>
      <QueryClientProvider client={queryClient}>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen
            name={name}
            component={Component}
            initialParams={params}
          />
        </Stack.Navigator>
      </QueryClientProvider>
    </NavigationContainer>,
    { state },
    false,
  );
  return { ...result, navigationRef, queryClient };
};

// Native network boundary: feature tests start online unless a scenario says otherwise.
beforeEach(() =>
  __setMockNetInfo({ type: 'wifi', isInternetReachable: true, details: null }),
);
