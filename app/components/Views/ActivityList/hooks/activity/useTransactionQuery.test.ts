import { renderHook } from '@testing-library/react-hooks';
import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import type { CaipAccountId } from '@metamask/utils';
import { apiClient } from '../../../../../core/apiClient';
import { useTransactionQuery } from './useTransactionQuery';

jest.mock('../../../../../../locales/i18n', () => ({
  __esModule: true,
  default: {
    locale: 'en-US',
  },
}));

jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(),
}));

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../../../core/apiClient', () => ({
  apiClient: {
    accounts: {
      getV5TransactionByIdQueryOptions: jest.fn(() => ({
        queryKey: ['accounts', 'transactions', 'v5ById'],
      })),
    },
  },
}));

const useQueryMock = jest.mocked(useQuery);
const useSelectorMock = jest.mocked(useSelector);

describe('useTransactionQuery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useQueryMock.mockReturnValue({
      data: undefined,
      isFetching: false,
    } as ReturnType<typeof useQuery>);
    useSelectorMock.mockReturnValue('0x1234567890abcdef');
  });

  it('builds v5 query options and disables the query when inputs are missing', () => {
    useSelectorMock.mockReturnValue(undefined);

    renderHook(() =>
      useTransactionQuery({
        chainId: undefined,
        enabled: true,
        txHash: undefined,
      }),
    );

    expect(
      apiClient.accounts.getV5TransactionByIdQueryOptions,
    ).toHaveBeenCalledWith('' as CaipAccountId, '', {
      includeLogs: false,
      includeMiscOperations: false,
      includeTxMetadata: true,
      lang: expect.any(String),
    });
    expect(useQueryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: false,
        retry: false,
        select: expect.any(Function),
      }),
    );
  });

  it('enables the query for valid EVM chain, address, and hash inputs', () => {
    renderHook(() =>
      useTransactionQuery({
        chainId: 'eip155:8453',
        enabled: true,
        txHash: '0xabc',
      }),
    );

    expect(
      apiClient.accounts.getV5TransactionByIdQueryOptions,
    ).toHaveBeenCalledWith(
      'eip155:8453:0x1234567890abcdef',
      '0xabc',
      expect.objectContaining({
        includeTxMetadata: true,
      }),
    );
    expect(useQueryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: true,
        select: expect.any(Function),
      }),
    );
  });
});
