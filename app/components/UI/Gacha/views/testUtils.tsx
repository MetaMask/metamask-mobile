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
import { backgroundState } from '../../../../util/test/initial-root-state';
import { createMockSnapInternalAccount } from '../../../../util/test/accountsControllerTestUtils';
import configureStore from '../../../../util/test/configureStore';
import renderWithProvider, {
  type DeepPartial,
} from '../../../../util/test/renderWithProvider';
import { SOLANA_USDC_ASSET_ID } from '../providers/collector-crypt/constants';
import type {
  CollectorCryptCard,
  CollectorCryptPack,
  PackOperation,
  SolanaAccountRef,
} from '../providers/collector-crypt/types';

/** Test helpers shared by the CollectorCrypt UI tests. */

export const MOCK_INTERNAL_ACCOUNT: InternalAccount =
  createMockSnapInternalAccount(
    '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
    'Solana Account',
    SolAccountType.DataAccount,
  );

export const MOCK_ACCOUNT: SolanaAccountRef = {
  id: MOCK_INTERNAL_ACCOUNT.id,
  address: MOCK_INTERNAL_ACCOUNT.address,
};

/** Pack fixture: 50 USDC, 85% buyback. */
export const createPack = (
  overrides: Partial<CollectorCryptPack> = {},
): CollectorCryptPack => ({
  code: 'pokemon_50',
  name: 'Elite Pokemon Pack',
  shortName: 'PKMN 50',
  category: 'Pokemon',
  price: 50,
  instantBuybackPercent: 85,
  odds: { common: 0.8, uncommon: 0.15, rare: 0.04, epic: 0.01 },
  maxValue: 1500,
  menuOrder: 1,
  ...overrides,
});

/** Card fixture, buyback unknown, no image (the image mock loads asynchronously). */
export const createCard = (
  overrides: Partial<CollectorCryptCard> = {},
): CollectorCryptCard => ({
  mint: 'MintAaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  name: 'Charizard Holo',
  grade: 'GEM-MT 10',
  gradingCompany: 'PSA',
  insuredValue: 120,
  rarity: 'rare',
  source: 'openPack',
  acquiredAt: 1_000,
  buyback: { status: 'unknown' },
  ...overrides,
});

/** Pack operation fixture, `generated`. */
export const createOperation = (
  overrides: Partial<PackOperation> = {},
): PackOperation => ({
  memo: 'memo-1',
  packCode: 'pokemon_50',
  packName: 'Elite Pokemon Pack',
  price: 50,
  status: 'generated',
  createdAt: 1_000,
  updatedAt: 1_000,
  ...overrides,
});

/** Redux state with CollectorCrypt cards/operations and a USDC balance for MOCK_ACCOUNT. */
export const createTestState = ({
  cards = [],
  operations = [],
  usdcAmount,
}: {
  cards?: CollectorCryptCard[];
  operations?: PackOperation[];
  /** Human-readable USDC amount, e.g. "100". Omitted means no balance entry. */
  usdcAmount?: string;
} = {}): DeepPartial<RootState> => ({
  engine: {
    backgroundState: {
      ...backgroundState,
      GachaController: {
        hasCompletedOnboarding: true,
        collectorCrypt: {
          operations: {
            [MOCK_ACCOUNT.address]: Object.fromEntries(
              operations.map((operation) => [operation.memo, operation]),
            ),
          },
          cards: {
            [MOCK_ACCOUNT.address]: Object.fromEntries(
              cards.map((card) => [card.mint, card]),
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

/** Query client without retries, so failures surface immediately. */
export const createTestQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });

/** renderHook with a Redux store and a fresh QueryClientProvider. */
export const renderHookWithQueryClient = <Result,>(
  hook: () => Result,
  {
    state = createTestState(),
    queryClient = createTestQueryClient(),
  }: { state?: DeepPartial<RootState>; queryClient?: QueryClient } = {},
) => {
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
) =>
  renderWithProvider(
    <QueryClientProvider client={queryClient}>{component}</QueryClientProvider>,
    { state },
  );

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
