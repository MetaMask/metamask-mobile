import { renderHook } from '@testing-library/react-hooks';
import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { apiClient } from '../../../../../core/apiClient';
import { selectEvmAddress } from '../../../../../selectors/accountsController';
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
    useSelectorMock.mockImplementation((selector) => {
      if (selector === selectSelectedAccountGroupEvmInternalAccount) {
        return undefined;
      }
      if (selector === selectEvmAddress) {
        return undefined;
      }
      return undefined;
    });

    renderHook(() =>
      useTransactionQuery({
        chainId: undefined,
        enabled: true,
        txHash: undefined,
      }),
    );

    expect(
      apiClient.accounts.getV5TransactionByIdQueryOptions,
    ).not.toHaveBeenCalled();
    expect(useQueryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: false,
        retry: false,
        select: expect.any(Function),
      }),
    );
  });

  it('enables the query for valid EVM chain, address, and hash inputs', () => {
    useSelectorMock.mockImplementation((selector) => {
      if (selector === selectSelectedAccountGroupEvmInternalAccount) {
        return { address: '0x1234567890abcdef' };
      }
      if (selector === selectEvmAddress) {
        return '0x9999999999999999';
      }
      return undefined;
    });

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

  it('uses global EVM address when group account is not available', () => {
    useSelectorMock.mockImplementation((selector) => {
      if (selector === selectSelectedAccountGroupEvmInternalAccount) {
        return undefined;
      }
      if (selector === selectEvmAddress) {
        return '0xglobaladdress';
      }
      return undefined;
    });

    renderHook(() =>
      useTransactionQuery({
        chainId: 'eip155:1',
        enabled: true,
        txHash: '0xdef',
      }),
    );

    expect(
      apiClient.accounts.getV5TransactionByIdQueryOptions,
    ).toHaveBeenCalledWith(
      'eip155:1:0xglobaladdress',
      '0xdef',
      expect.any(Object),
    );
  });
});
