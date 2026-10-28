import { renderHook, act } from '@testing-library/react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { apiClient } from '../../../../../../core/apiClient';
import Engine from '../../../../../../core/Engine';
import useAssetVisibility from '../../../../../UI/TokenDetails/components/useAssetVisibility';
import {
  selectCurrentCurrency,
  selectCurrencyRates,
} from '../../../../../../selectors/currencyRateController';
import { selectEnabledNetworks } from '../../../../../../selectors/networkEnablementController';
import {
  selectSelectedAccountGroupId,
  selectSelectedAccountGroupInternalAccounts,
} from '../../../../../../selectors/multichainAccounts/accountTreeController';
import {
  getAssetPreferences,
  getAssetsBalance,
  getAssetsInfo,
  getCustomAssets,
} from '../../../../../../selectors/assets/assets-controller';
import { selectMultichainAssetsAllIgnoredAssets } from '../../../../../../selectors/multichain/multichain';
import type { OwnedTokenBalanceItem } from '../model/types';
import { useOwnedTokens } from './useOwnedTokens';

jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(),
  useQueryClient: jest.fn(),
}));

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      AssetsController: {
        unhideAsset: jest.fn(),
      },
    },
  },
}));

jest.mock('../../../../../../core/NotificationManager', () => ({
  __esModule: true,
  default: {
    showSimpleNotification: jest.fn(),
  },
}));

jest.mock('../../../../../../util/trace', () => ({
  trace: jest.fn(),
  endTrace: jest.fn(),
  TraceName: { ImportTokens: 'Import Tokens' },
}));

jest.mock(
  '../../../../../UI/TokenDetails/components/useAssetVisibility',
  () => {
    const handleAddCustomAsset = jest.fn();
    return {
      __esModule: true,
      default: () => ({ handleAddCustomAsset }),
    };
  },
);

const HIDDEN_ID = 'eip155:1/erc20:0x0000000000000000000000000000000000000001';
const HELD_ID = 'eip155:1/erc20:0x0000000000000000000000000000000000000002';

const balance = (assetId: string, symbol: string): OwnedTokenBalanceItem => ({
  accountId: 'eip155:1:0xabc',
  object: 'token',
  type: 'erc20',
  assetId,
  name: symbol,
  symbol,
  decimals: 18,
  balance: '2',
  price: '3',
});

const account = {
  id: 'account-1',
  address: '0xABC',
  scopes: ['eip155:0'],
  metadata: { name: 'Main' },
};

describe('useOwnedTokens', () => {
  const invalidateQueries = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useQueryClient as jest.Mock).mockReturnValue({ invalidateQueries });
    (useQuery as jest.Mock).mockReturnValue({
      data: {
        balances: [balance(HIDDEN_ID, 'HIDE'), balance(HELD_ID, 'HELD')],
        unprocessedNetworks: ['eip155:137'],
      },
      isError: false,
      isSuccess: true,
      isPending: false,
      refetch: jest.fn(),
    });
    jest
      .spyOn(apiClient.accounts, 'getV6MultiAccountBalancesQueryOptions')
      .mockImplementation(((ids: string[]) => ({
        queryKey: ['v6', ids],
        queryFn: jest.fn().mockResolvedValue({
          balances: [],
          unprocessedNetworks: ids.length > 10 ? ['eip155:1'] : ['eip155:10'],
          unprocessedIncludeAssetIds: [],
        }),
      })) as unknown as typeof apiClient.accounts.getV6MultiAccountBalancesQueryOptions);
    (
      Engine.context.AssetsController.unhideAsset as jest.Mock
    ).mockResolvedValue(undefined);
    (useSelector as jest.Mock).mockImplementation((selector: unknown) => {
      if (selector === selectSelectedAccountGroupId) {
        return 'group-1';
      }
      if (selector === selectSelectedAccountGroupInternalAccounts) {
        return [account];
      }
      if (selector === selectEnabledNetworks) {
        return ['eip155:1'];
      }
      if (selector === selectCurrentCurrency) {
        return 'usd';
      }
      if (selector === selectCurrencyRates) {
        return { ETH: { conversionRate: 1, usdConversionRate: 1 } };
      }
      if (selector === getAssetsInfo) {
        return {};
      }
      if (selector === getCustomAssets) {
        return {};
      }
      if (selector === getAssetsBalance) {
        return {};
      }
      if (selector === getAssetPreferences) {
        return { [HIDDEN_ID]: { hidden: true } };
      }
      if (selector === selectMultichainAssetsAllIgnoredAssets) {
        return {};
      }
      return undefined;
    });
  });

  it('requests unfiltered v6 balances and exposes networks the API could not load', () => {
    const { result } = renderHook(() =>
      useOwnedTokens({ hardwareTier: null, networkTier: 'WIFI' }),
    );

    const options = (useQuery as jest.Mock).mock.calls[0][0];

    expect(options.queryKey).toEqual([
      'owned-tokens',
      'group-1',
      ['eip155:1'],
      'usd',
    ]);
    expect(options.staleTime).toBe(60_000);
    expect(options.enabled).toBe(true);
    expect(result.current.unprocessedNetworks).toEqual(['eip155:137']);
    expect(result.current.tokens.map((row) => row.symbol).sort()).toEqual([
      'HELD',
      'HIDE',
    ]);
  });

  it('chunks account ids and merges unprocessed networks from each request', async () => {
    (useSelector as jest.Mock).mockImplementation((selector: unknown) => {
      if (selector === selectSelectedAccountGroupId) {
        return 'group-1';
      }
      if (selector === selectSelectedAccountGroupInternalAccounts) {
        return [account];
      }
      if (selector === selectEnabledNetworks) {
        return Array.from(
          { length: 21 },
          (_item, index) => `eip155:${index + 1}`,
        );
      }
      if (selector === selectCurrentCurrency) {
        return 'usd';
      }
      if (selector === selectCurrencyRates) {
        return {};
      }
      if (
        selector === getAssetsInfo ||
        selector === getCustomAssets ||
        selector === getAssetsBalance ||
        selector === getAssetPreferences ||
        selector === selectMultichainAssetsAllIgnoredAssets
      ) {
        return {};
      }
      return undefined;
    });

    renderHook(() =>
      useOwnedTokens({ hardwareTier: 'LOW', networkTier: 'WIFI' }),
    );

    const options = (useQuery as jest.Mock).mock.calls.at(-1)?.[0];
    const loaded = await options.queryFn({
      signal: new AbortController().signal,
    });
    const balanceSpy = apiClient.accounts
      .getV6MultiAccountBalancesQueryOptions as jest.Mock;
    const requestedIds = balanceSpy.mock.calls.map(
      (call) => call[0] as string[],
    );
    const requestedOptions = balanceSpy.mock.calls.map((call) => call[1]);

    expect(requestedIds.map((ids) => ids.length)).toEqual([20, 1]);
    expect(requestedOptions[0]).toEqual(
      expect.objectContaining({
        filterSupportedTokens: false,
        includeDeFiBalances: false,
        includePrices: true,
        includeLabels: true,
        includeCanonicalHead: true,
        vsCurrency: 'usd',
      }),
    );
    expect(loaded.unprocessedNetworks.sort()).toEqual([
      'eip155:1',
      'eip155:10',
    ]);
  });

  it('unhides on the stored id and adds an undetected token to the holding account', async () => {
    const { result } = renderHook(() =>
      useOwnedTokens({ hardwareTier: null, networkTier: null }),
    );
    const hidden = result.current.tokens.find((row) => row.symbol === 'HIDE');
    const held = result.current.tokens.find((row) => row.symbol === 'HELD');
    const { handleAddCustomAsset } = useAssetVisibility();
    if (!hidden || !held) {
      throw new Error('Expected a hidden row and an undetected row');
    }

    const summary = await act(async () =>
      result.current.addTokens([hidden, held]),
    );

    expect(Engine.context.AssetsController.unhideAsset).toHaveBeenCalledWith(
      HIDDEN_ID,
    );
    expect(handleAddCustomAsset).toHaveBeenCalledWith(
      HELD_ID,
      expect.objectContaining({ symbol: 'HELD', decimals: 18 }),
      'account-1',
    );
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['owned-tokens', 'group-1'],
    });
    expect(summary.successCount).toBe(2);
    expect(result.current.tokens).toEqual([]);
  });

  it('keeps a failed import selected in the result and still listed', async () => {
    (
      Engine.context.AssetsController.unhideAsset as jest.Mock
    ).mockRejectedValue(new Error('unhide failed'));
    const { result } = renderHook(() =>
      useOwnedTokens({ hardwareTier: null, networkTier: 'WIFI' }),
    );
    const hidden = result.current.tokens.find((row) => row.symbol === 'HIDE');
    const held = result.current.tokens.find((row) => row.symbol === 'HELD');
    if (!hidden || !held) {
      throw new Error('Expected a hidden row and an undetected row');
    }

    const summary = await act(async () =>
      result.current.addTokens([hidden, held]),
    );

    expect(summary.failureCount).toBe(1);
    expect(summary.failedKeys).toEqual([hidden?.rowKey]);
    expect(result.current.tokens.map((row) => row.symbol)).toEqual(['HIDE']);
  });

  it('reports offline and skips the query when the network tier is none', () => {
    const { result } = renderHook(() =>
      useOwnedTokens({ hardwareTier: null, networkTier: 'NONE' }),
    );
    const options = (useQuery as jest.Mock).mock.calls[0][0];

    expect(options.enabled).toBe(false);
    expect(result.current.status).toBe('offline');
  });
});
