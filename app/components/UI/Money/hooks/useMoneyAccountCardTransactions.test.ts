import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import { useMoneyAccountCardTransactions } from './useMoneyAccountCardTransactions';
import { selectPrimaryMoneyAccount } from '../../../../selectors/moneyAccountController';
import { selectIsMoneyAccountDelegatedForCard } from '../../../../selectors/cardController';
import { selectCardFeatureFlag } from '../../../../selectors/featureFlagController/card';
import {
  fetchAccountTransactions,
  parseCardTransactions,
} from '../utils/accountsApi';
import Logger from '../../../../util/Logger';
import type { CardTransaction } from '../types/moneyActivity';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

// Run the focus callback like an effect: on mount, and re-run (with cleanup in
// between) whenever the memoized callback changes — i.e. when `load` changes.
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn(),
}));

jest.mock('../../../../selectors/moneyAccountController', () => ({
  selectPrimaryMoneyAccount: jest.fn(),
}));
jest.mock('../../../../selectors/cardController', () => ({
  selectIsMoneyAccountDelegatedForCard: jest.fn(),
}));
jest.mock('../../../../selectors/featureFlagController/card', () => ({
  selectCardFeatureFlag: jest.fn(),
}));
jest.mock('../utils/accountsApi', () => ({
  fetchAccountTransactions: jest.fn(),
  parseCardTransactions: jest.fn(),
}));
jest.mock('../../../../util/Logger', () => ({
  __esModule: true,
  default: { error: jest.fn() },
}));

const mockUseSelector = jest.mocked(useSelector);
const mockUseFocusEffect = jest.mocked(useFocusEffect);
const mockFetch = jest.mocked(fetchAccountTransactions);
const mockParse = jest.mocked(parseCardTransactions);
const mockLoggerError = jest.mocked(Logger.error);

const ADDR_A = '0xbF4bC559f929cE3994Ba12D71d564737357bC8C2';
const ADDR_B = '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B';
const FLAG_URL = 'https://accounts.api.staging.test';

const CARD: CardTransaction = {
  hash: '0xabc',
  time: 1,
  chainId: '0x8f',
  token: { address: '0xtoken', symbol: 'USDC', decimals: 6 },
  amount: '5381986',
  to: '0xdef',
};

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (error: unknown) => void;
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

let isLinked: boolean;
let account: { address: string } | undefined;

beforeEach(() => {
  jest.clearAllMocks();
  isLinked = true;
  account = { address: ADDR_A };

  mockUseSelector.mockImplementation((selector) => {
    if (selector === selectIsMoneyAccountDelegatedForCard) {
      return isLinked;
    }
    if (selector === selectPrimaryMoneyAccount) {
      return account;
    }
    if (selector === selectCardFeatureFlag) {
      return { constants: { accountsApiUrl: FLAG_URL } };
    }
    return undefined;
  });

  // Mimic React Navigation's focus lifecycle with a plain effect.
  mockUseFocusEffect.mockImplementation((cb) => {
    React.useEffect(() => cb(), [cb]);
  });

  // Parse echoes whatever the (mocked) fetch yielded so we can trace it.
  mockParse.mockImplementation(
    (response) => (response as { cards?: CardTransaction[] }).cards ?? [],
  );
});

describe('useMoneyAccountCardTransactions', () => {
  it('fetches and parses card transactions for a linked account', async () => {
    // Arrange
    mockFetch.mockResolvedValue({ cards: [CARD] } as never);

    // Act
    const { result } = renderHook(() => useMoneyAccountCardTransactions());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Assert
    expect(mockFetch).toHaveBeenCalledWith(
      expect.objectContaining({
        address: ADDR_A,
        signal: expect.any(AbortSignal),
      }),
    );
    expect(result.current.cardTransactions).toEqual([CARD]);
    expect(result.current.error).toBe(false);
  });

  it('fetches against the card feature flag accountsApiUrl', async () => {
    // Arrange
    mockFetch.mockResolvedValue({ cards: [] } as never);

    // Act
    const { result } = renderHook(() => useMoneyAccountCardTransactions());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Assert
    expect(mockFetch).toHaveBeenCalledWith(
      expect.objectContaining({ baseUrl: FLAG_URL }),
    );
  });

  it('does not fetch for an unlinked account and never reports loading', async () => {
    // Arrange
    isLinked = false;

    // Act
    const { result } = renderHook(() => useMoneyAccountCardTransactions());

    // Assert
    expect(mockFetch).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.cardTransactions).toEqual([]);
  });

  it('reports loading until the first fetch settles', async () => {
    // Arrange — fetch stays pending.
    const d = deferred<unknown>();
    mockFetch.mockReturnValue(d.promise as never);

    // Act
    const { result } = renderHook(() => useMoneyAccountCardTransactions());

    // Assert — linked + not yet loaded.
    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      d.resolve({ cards: [CARD] });
      await d.promise;
    });
    expect(result.current.isLoading).toBe(false);
  });

  it('does not flash loading on a background refetch (stale-while-revalidate)', async () => {
    // Arrange — first focus load settles.
    mockFetch.mockResolvedValueOnce({ cards: [CARD] } as never);
    const { result } = renderHook(() => useMoneyAccountCardTransactions());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Act — a refocus refetch is in flight.
    const d = deferred<unknown>();
    mockFetch.mockReturnValueOnce(d.promise as never);
    act(() => {
      result.current.refetch();
    });

    // Assert — list keeps showing, no spinner.
    expect(result.current.isLoading).toBe(false);
    expect(result.current.cardTransactions).toEqual([CARD]);

    await act(async () => {
      d.resolve({ cards: [] });
      await d.promise;
    });
  });

  it('surfaces an error and clears rows when the fetch fails', async () => {
    // Arrange
    mockFetch.mockRejectedValue(new Error('boom'));

    // Act
    const { result } = renderHook(() => useMoneyAccountCardTransactions());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Assert
    expect(result.current.error).toBe(true);
    expect(result.current.cardTransactions).toEqual([]);
    expect(mockLoggerError).toHaveBeenCalled();
  });

  it('ignores a stale fetch that resolves after the address changed', async () => {
    // Arrange — first account's fetch never resolves until after the switch.
    const first = deferred<unknown>();
    const second = deferred<unknown>();
    mockFetch.mockReturnValueOnce(first.promise as never);
    mockFetch.mockReturnValueOnce(second.promise as never);

    const { rerender } = renderHook(() => useMoneyAccountCardTransactions());

    // Act — switch to a different money account (load identity changes → the
    // focus effect cleans up the first request and starts a second).
    account = { address: ADDR_B };
    rerender({});

    await act(async () => {
      first.resolve({ cards: [CARD] }); // stale — belongs to ADDR_A
      await first.promise;
    });

    // Assert — the stale response was not adopted.
    expect(mockParse).not.toHaveBeenCalledWith(
      { cards: [CARD] },
      expect.anything(),
    );

    await act(async () => {
      second.resolve({ cards: [] });
      await second.promise;
    });
  });
});
