import { renderHook } from '@testing-library/react-hooks';
import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { apiClient } from '../../../../../core/apiClient';
import { selectSelectedAccountGroupEvmInternalAccount } from '../../../../../selectors/multichainAccounts/accountTreeController';
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
  });

  it('disables the query when inputs are missing', () => {
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
    ).toHaveBeenCalledWith(
      'eip155:0:0x0',
      '',
      expect.objectContaining({
        includeTxMetadata: true,
      }),
    );
    expect(useQueryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        retry: false,
        select: expect.any(Function),
      }),
    );
  });

  it('enables the query for valid EVM chain, address, and hash inputs', () => {
    useSelectorMock.mockReturnValue({ address: '0x1234567890abcdef' });

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
        retry: false,
        select: expect.any(Function),
      }),
    );
  });
});
