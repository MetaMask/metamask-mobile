import { renderHook } from '@testing-library/react-hooks';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../../../../core/apiClient';
import { useTransactionQuery } from './useTransactionQuery';

jest.mock('react-native-i18n', () => ({
  I18n: {
    locale: 'en-US',
  },
}));

jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(),
}));

jest.mock('../../../../../core/apiClient', () => ({
  apiClient: {
    accounts: {
      getV1TransactionByHashQueryOptions: jest.fn(() => ({
        queryKey: ['accounts', 'transactions', 'v1ByHash'],
      })),
    },
  },
}));

const useQueryMock = jest.mocked(useQuery);

describe('useTransactionQuery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useQueryMock.mockReturnValue({
      data: undefined,
      isFetching: false,
    } as ReturnType<typeof useQuery>);
  });

  it('builds v1 query options and disables the query when inputs are missing', () => {
    renderHook(() =>
      useTransactionQuery({
        chainId: undefined,
        enabled: true,
        txHash: undefined,
      }),
    );

    expect(
      apiClient.accounts.getV1TransactionByHashQueryOptions,
    ).toHaveBeenCalledWith(1, '', {
      includeLogs: false,
      includeValueTransfers: true,
      includeTxMetadata: true,
      lang: expect.any(String),
    });
    expect(useQueryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: false,
        retry: false,
      }),
    );
  });

  it('enables the query for valid EVM chain and hash inputs', () => {
    renderHook(() =>
      useTransactionQuery({
        chainId: 'eip155:8453',
        enabled: true,
        txHash: '0xabc',
      }),
    );

    expect(
      apiClient.accounts.getV1TransactionByHashQueryOptions,
    ).toHaveBeenCalledWith(
      8453,
      '0xabc',
      expect.objectContaining({
        includeTxMetadata: true,
      }),
    );
    expect(useQueryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: true,
      }),
    );
  });
});
