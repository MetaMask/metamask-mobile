import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import Engine from '../../../../core/Engine';
import { useNetworkTier } from '../../../../hooks/useNetworkTier';
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

const ACCOUNT = '0xabcdef0123456789012345678901234567890123';
const VAULT = '0x1111111111111111111111111111111111111111' as const;
const TX_HASH =
  '0x8b6975a5d81b44bbe4487b5e5237e25be7ffc71e38d48146e8a501299fddc9f1' as const;
const activity: AccountsApiActivity = {
  kind: 'card',
  hash: TX_HASH,
  time: 1_700_000_000_000,
  chainId: '0x8f',
  blockNumber: 108974623,
  token: { address: VAULT, symbol: 'vmUSD', decimals: 6 },
  amount: '951755696',
  paidTo: '0x4444444444444444444444444444444444444444',
};
const vaultShareTokens = [{ chainId: '0x8f' as const, address: VAULT }];

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
      resolveValuation({
        address: ACCOUNT.toLowerCase(),
        chain_id: 143,
        results: [
          {
            tx_hash: TX_HASH,
            found: true,
            valuations: [
              {
                vault_address: VAULT,
                vault_key: 'standard',
                asset_symbol: 'mUSD',
                asset_decimals: 6,
                type: 'transfer_out',
                log_index: 1,
                block_number: 108974623,
                timestamp: '2026-09-29T07:17:22Z',
                shares_wei: '951755696',
                assets_wei: '968399999',
                rate: '1.017488',
                source: 'erc20_transfer',
              },
            ],
          },
        ],
        as_of_block: 1,
        as_of_timestamp: '2026-11-10T12:34:56Z',
        data_freshness: 'live',
        indexer_lag_seconds: 4,
      });
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
