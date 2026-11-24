import React from 'react';
import {
  QueryClient,
  QueryClientProvider,
  type Query,
} from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import Engine from '../../../../core/Engine';
import { useNetworkTier } from '../../../../hooks/useNetworkTier';
import {
  MONEY_ACCOUNT_ADDRESS as ACCOUNT,
  OTHER_TX_HASH,
  PREMIUM_VAULT,
  VAULT_SHARE_TOKENS,
  cardActivity,
  cardValuation,
  vaultShareValuationResponse,
} from '../__fixtures__/vaultShareValuations';
import { MoneyAccountApiDataServiceQueryKeys } from '../queryKeys';
import type { AccountsApiActivity } from '../types/moneyActivity';
import {
  readCachedVaultShareValuations,
  writeCachedVaultShareValuations,
} from '../utils/moneyVaultShareValuationCache';
import { useMoneyActivityValuations } from './useMoneyActivityValuations';

jest.mock('../../../../core/Engine', () => ({
  controllerMessenger: { call: jest.fn() },
}));

jest.mock('../../../../hooks/useNetworkTier', () => ({
  useNetworkTier: jest.fn(),
}));

jest.mock('../utils/moneyVaultShareValuationCache', () => ({
  readCachedVaultShareValuations: jest.fn(),
  writeCachedVaultShareValuations: jest.fn(),
}));

const mockEngineCall = Engine.controllerMessenger.call as unknown as jest.Mock;
const mockNetworkTier = jest.mocked(useNetworkTier);
const mockReadCache = jest.mocked(readCachedVaultShareValuations);
const mockWriteCache = jest.mocked(writeCachedVaultShareValuations);

const activity = cardActivity();
const vaultShareTokens = [VAULT_SHARE_TOKENS[0]];

const QueryWrapper = ({
  client,
  children,
}: {
  client: QueryClient;
  children: React.ReactNode;
}): React.JSX.Element => (
  <QueryClientProvider client={client}>{children}</QueryClientProvider>
);

describe('useMoneyActivityValuations query lifecycle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNetworkTier.mockReturnValue('WIFI');
    mockReadCache.mockReturnValue([]);
    mockWriteCache.mockResolvedValue(undefined);
  });

  it('stays settling until the seeded historical query finishes fetching', async () => {
    let resolveValuation: (value: unknown) => void = () => undefined;
    const pending = new Promise<unknown>((resolve) => {
      resolveValuation = resolve;
    });
    mockEngineCall.mockImplementation((action: string) => {
      if (action === 'MoneyAccountApiDataService:fetchVaultShareValuations') {
        return pending;
      }
      return Promise.resolve({ rate: '1.017488' });
    });
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    const { result, unmount } = renderHook(
      () =>
        useMoneyActivityValuations({
          pageActivities: [[activity]],
          moneyAddress: ACCOUNT,
          vaultShareTokens,
          enabled: true,
        }),
      {
        wrapper: ({ children }) => (
          <QueryWrapper client={client}>{children}</QueryWrapper>
        ),
      },
    );

    await waitFor(() => expect(result.current.isSettling).toBe(true));

    await act(async () => {
      resolveValuation(vaultShareValuationResponse([cardValuation()], ACCOUNT));
      await pending;
    });

    await waitFor(() => expect(result.current.isSettling).toBe(false));
    expect(result.current.getDisplayAmount(activity)).toEqual({
      type: 'historical',
      value: '968399999',
      decimals: 6,
    });

    unmount();
    client.clear();
  });

  it('changes valuation query identity for a new hash and vault target pair', async () => {
    const premiumActivity = {
      ...activity,
      token: {
        ...activity.token,
        address: PREMIUM_VAULT,
        symbol: 'pvmUSD',
      },
    };
    const existingPremiumActivity = {
      ...premiumActivity,
      hash: OTHER_TX_HASH,
    };
    const valuationResponse = vaultShareValuationResponse(
      [
        cardValuation(),
        {
          ...cardValuation('968399997', PREMIUM_VAULT),
          hash: OTHER_TX_HASH,
        },
        cardValuation('968399998', PREMIUM_VAULT),
      ],
      ACCOUNT,
    );
    mockEngineCall.mockImplementation(async (action: string) => {
      if (action === 'MoneyAccountApiDataService:fetchVaultShareValuations') {
        return valuationResponse;
      }
      return { rate: '1.017488' };
    });
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    const { result, rerender, unmount } = renderHook(
      ({ pages }: { pages: AccountsApiActivity[][] }) =>
        useMoneyActivityValuations({
          pageActivities: pages,
          moneyAddress: ACCOUNT,
          vaultShareTokens: VAULT_SHARE_TOKENS,
          enabled: true,
        }),
      {
        initialProps: { pages: [[activity, existingPremiumActivity]] },
        wrapper: ({ children }) => (
          <QueryWrapper client={client}>{children}</QueryWrapper>
        ),
      },
    );

    const getValuationQueries = (): Query[] =>
      client
        .getQueryCache()
        .getAll()
        .filter(
          ({ queryKey }) =>
            queryKey[0] ===
            MoneyAccountApiDataServiceQueryKeys.FETCH_VAULT_SHARE_VALUATIONS,
        );

    await waitFor(() =>
      expect(
        mockEngineCall.mock.calls.filter(
          ([action]) =>
            action === 'MoneyAccountApiDataService:fetchVaultShareValuations',
        ),
      ).toHaveLength(1),
    );
    const initialQueryKey = JSON.stringify(getValuationQueries()[0].queryKey);

    rerender({
      pages: [[activity, existingPremiumActivity], [premiumActivity]],
    });

    await waitFor(() =>
      expect(
        mockEngineCall.mock.calls.filter(
          ([action]) =>
            action === 'MoneyAccountApiDataService:fetchVaultShareValuations',
        ),
      ).toHaveLength(2),
    );
    await waitFor(() =>
      expect(result.current.getDisplayAmount(premiumActivity)).toEqual({
        type: 'historical',
        value: '968399998',
        decimals: 6,
      }),
    );

    const valuationQueries = getValuationQueries();
    expect(valuationQueries).toHaveLength(2);
    expect(valuationQueries[1].queryKey[2]).toEqual(
      valuationQueries[0].queryKey[2],
    );
    expect(JSON.stringify(valuationQueries[1].queryKey)).not.toBe(
      initialQueryKey,
    );
    expect(valuationQueries[0].queryKey[3]).toHaveLength(2);
    expect(valuationQueries[1].queryKey[3]).toHaveLength(3);

    unmount();
    client.clear();
  });
});
