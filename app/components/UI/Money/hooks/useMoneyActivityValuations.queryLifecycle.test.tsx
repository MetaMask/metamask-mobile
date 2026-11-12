import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import Engine from '../../../../core/Engine';
import { useNetworkTier } from '../../../../hooks/useNetworkTier';
import {
  MONEY_ACCOUNT_ADDRESS as ACCOUNT,
  VAULT_SHARE_TOKENS,
  cardActivity,
  cardValuation,
  vaultShareValuationResponse,
} from '../__fixtures__/vaultShareValuations';
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

function QueryWrapper({
  client,
  children,
}: {
  client: QueryClient;
  children: React.ReactNode;
}) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

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
});
