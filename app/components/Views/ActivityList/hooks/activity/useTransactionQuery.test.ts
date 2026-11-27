import React from 'react';
import { renderHook } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { V5TransactionRecord } from '@metamask/core-backend';
import { buildV5TransactionRecord } from '#app/util/test/v5TransactionFixtures';
import { selectEvmAddress } from '#app/selectors/accountsController';
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

const mockTransaction: V5TransactionRecord = buildV5TransactionRecord({
  accountId: 'eip155:8453:0x1234567890abcdef',
  id: '0xabc',
  chainId: 'eip155:8453',
  timestamp: 1000000,
  date: '2026-01-01T00:00:00.000Z',
  from: '0x1234',
  to: '0x5678',
});

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

  it.each([
    {
      name: 'inputs are missing',
      selectorValue: undefined,
      chainId: undefined,
      enabled: true,
      txHash: undefined,
    },
    {
      name: 'txHash is missing',
      selectorValue: { address: '0x1234' },
      chainId: 'eip155:1',
      enabled: true,
      txHash: undefined,
    },
    {
      name: 'chain is not eip155',
      selectorValue: { address: '0x1234' },
      chainId: 'solana:mainnet',
      enabled: true,
      txHash: '0xabc',
    },
    {
      name: 'explicitly disabled',
      selectorValue: { address: '0x1234' },
      chainId: 'eip155:1',
      enabled: false,
      txHash: '0xabc',
    },
  ])(
    'disables the query when $name',
    ({ selectorValue, chainId, enabled, txHash }) => {
      useSelectorMock.mockReturnValue(selectorValue);

      const { result } = renderHook(
        () =>
          useTransactionQuery({
            chainId,
            enabled,
            txHash,
          }),
        { wrapper: createWrapper() },
      );

      expect(queryFnMock).not.toHaveBeenCalled();
      expect(result.current.data).toBeUndefined();
    },
  );

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
    useSelectorMock.mockImplementation((selector) =>
      selector === selectEvmAddress
        ? '0xAbCdEf1234567890AbCdEf1234567890AbCdEf12'
        : undefined,
    );
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
