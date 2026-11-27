import React from 'react';
import { renderHook } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { V5TransactionRecord } from '@metamask/core-backend';
import { apiClient } from '../../../../../core/apiClient';
import { selectSelectedAccountGroupEvmInternalAccount } from '../../../../../selectors/multichainAccounts/accountTreeController';
import { useTransactionQuery } from './useTransactionQuery';

jest.mock('../../../../../../locales/i18n', () => ({
  __esModule: true,
  default: {
    locale: 'en-US',
  },
}));

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../../../core/apiClient', () => ({
  apiClient: {
    accounts: {
      getV5TransactionByIdQueryOptions: jest.fn(),
    },
  },
}));

const useSelectorMock = jest.mocked(useSelector);
const getV5TransactionByIdQueryOptionsMock = jest.mocked(
  apiClient.accounts.getV5TransactionByIdQueryOptions,
);

const mockTransaction: V5TransactionRecord = {
  accountId: 'eip155:8453:0x1234567890abcdef',
  tx: {
    id: '0xabc',
    chainId: 'eip155:8453',
    status: 'confirmed',
    timestamp: 1000000,
    date: '2026-01-01T00:00:00.000Z',
    from: '0x1234',
    to: '0x5678',
    blockNumber: '1',
    blockHash: '0xblock',
    value: '0',
  },
  valueTransfers: [],
  fee: null,
};

describe('useTransactionQuery', () => {
  let queryFnMock: jest.Mock;
  let queryClient: QueryClient;

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    queryFnMock = jest.fn();
    getV5TransactionByIdQueryOptionsMock.mockImplementation(
      (accountId, txHash, options) => ({
        queryKey: ['v5ById', accountId, txHash],
        queryFn: () => queryFnMock(accountId, txHash, options),
      }),
    );
  });

  function createWrapper() {
    return function Wrapper({ children }: { children: React.ReactNode }) {
      return React.createElement(
        QueryClientProvider,
        { client: queryClient },
        children,
      );
    };
  }

  it('disables the query when inputs are missing', () => {
    useSelectorMock.mockReturnValue(undefined);

    const { result } = renderHook(
      () =>
        useTransactionQuery({
          chainId: undefined,
          enabled: true,
          txHash: undefined,
        }),
      { wrapper: createWrapper() },
    );

    expect(queryFnMock).not.toHaveBeenCalled();
    expect(result.current.data).toBeUndefined();
  });

  it('disables the query when txHash is missing', () => {
    useSelectorMock.mockReturnValue({ address: '0x1234' });

    const { result } = renderHook(
      () =>
        useTransactionQuery({
          chainId: 'eip155:1',
          enabled: true,
          txHash: undefined,
        }),
      { wrapper: createWrapper() },
    );

    expect(queryFnMock).not.toHaveBeenCalled();
    expect(result.current.data).toBeUndefined();
  });

  it('disables the query when chain is not eip155', () => {
    useSelectorMock.mockReturnValue({ address: '0x1234' });

    const { result } = renderHook(
      () =>
        useTransactionQuery({
          chainId: 'solana:mainnet',
          enabled: true,
          txHash: '0xabc',
        }),
      { wrapper: createWrapper() },
    );

    expect(queryFnMock).not.toHaveBeenCalled();
    expect(result.current.data).toBeUndefined();
  });

  it('disables the query when explicitly disabled', () => {
    useSelectorMock.mockReturnValue({ address: '0x1234' });

    const { result } = renderHook(
      () =>
        useTransactionQuery({
          chainId: 'eip155:1',
          enabled: false,
          txHash: '0xabc',
        }),
      { wrapper: createWrapper() },
    );

    expect(queryFnMock).not.toHaveBeenCalled();
    expect(result.current.data).toBeUndefined();
  });

  it('enables the query and returns data for valid EVM inputs', async () => {
    useSelectorMock.mockReturnValue({
      address: '0x1234567890AbCdEf1234567890AbCdEf12345678',
    });
    queryFnMock.mockResolvedValue({ data: mockTransaction });

    const { result, waitForNextUpdate } = renderHook(
      () =>
        useTransactionQuery({
          chainId: 'eip155:8453',
          enabled: true,
          txHash: '0xabc',
        }),
      { wrapper: createWrapper() },
    );

    await waitForNextUpdate();

    expect(result.current.data).toEqual(mockTransaction);
    expect(queryFnMock).toHaveBeenCalledWith(
      'eip155:8453:0x1234567890abcdef1234567890abcdef12345678',
      '0xabc',
      expect.objectContaining({
        includeLogs: false,
        includeMiscOperations: false,
        includeTxMetadata: true,
      }),
    );
  });

  it('falls back to selectEvmAddress when group account is undefined', async () => {
    let selectorCallCount = 0;
    useSelectorMock.mockImplementation(() => {
      selectorCallCount += 1;
      if (selectorCallCount % 2 === 1) {
        return undefined;
      }
      return '0xAbCdEf1234567890AbCdEf1234567890AbCdEf12';
    });
    queryFnMock.mockResolvedValue({ data: mockTransaction });

    const { result, waitForNextUpdate } = renderHook(
      () =>
        useTransactionQuery({
          chainId: 'eip155:1',
          enabled: true,
          txHash: '0xdef',
        }),
      { wrapper: createWrapper() },
    );

    await waitForNextUpdate();

    expect(result.current.data).toEqual(mockTransaction);
    expect(queryFnMock).toHaveBeenCalledWith(
      'eip155:1:0xabcdef1234567890abcdef1234567890abcdef12',
      '0xdef',
      expect.objectContaining({
        includeLogs: false,
        includeMiscOperations: false,
        includeTxMetadata: true,
      }),
    );
  });
});
