import { renderHook } from '@testing-library/react-hooks';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { apiClient } from '../../../core/apiClient';
import { selectEvmAddress } from '../../../selectors/accountsController';
import { selectEvmEnabledCaipNetworks } from '../../../selectors/networkEnablementController';
import { useTransactionsQuery } from './useTransactionsQuery';
import { MINUTE } from '../../../constants/time';

jest.mock('@tanstack/react-query', () => ({
  useInfiniteQuery: jest.fn(),
}));

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../core/apiClient', () => ({
  apiClient: {
    accounts: {
      getV4MultiAccountTransactionsInfiniteQueryOptions: jest.fn(),
    },
  },
}));

jest.mock('../../../selectors/accountsController', () => ({
  selectEvmAddress: jest.fn(),
}));

jest.mock('../../../selectors/networkEnablementController', () => ({
  selectEvmEnabledCaipNetworks: jest.fn(),
}));

const ADDRESS_MOCK = '0x1234567890123456789012345678901234567890';
const NETWORKS_MOCK = ['eip155:1', 'eip155:137'];
const QUERY_OPTIONS_MOCK = {
  queryKey: ['transactions'],
  queryFn: jest.fn(),
  getNextPageParam: jest.fn(),
};

describe('useTransactionsQuery', () => {
  const useSelectorMock = jest.mocked(useSelector);
  const useInfiniteQueryMock = jest.mocked(useInfiniteQuery);
  const getQueryOptionsMock = jest.mocked(
    apiClient.accounts.getV4MultiAccountTransactionsInfiniteQueryOptions,
  );

  function setupSelectors({
    evmAddress = ADDRESS_MOCK,
    networks = NETWORKS_MOCK,
  }: {
    evmAddress?: string;
    networks?: string[];
  } = {}) {
    useSelectorMock.mockImplementation((selector) => {
      if (selector === selectEvmAddress) {
        return evmAddress;
      }
      if (selector === selectEvmEnabledCaipNetworks) {
        return networks;
      }
      return undefined;
    });
  }

  beforeEach(() => {
    jest.clearAllMocks();
    getQueryOptionsMock.mockReturnValue(
      QUERY_OPTIONS_MOCK as unknown as ReturnType<typeof getQueryOptionsMock>,
    );
    useInfiniteQueryMock.mockReturnValue({
      data: undefined,
    } as unknown as ReturnType<typeof useInfiniteQueryMock>);
  });

  it('composes query options from the selected EVM account and networks', () => {
    setupSelectors();

    renderHook(() => useTransactionsQuery());

    expect(getQueryOptionsMock).toHaveBeenCalledWith({
      accountAddresses: [`eip155:0:${ADDRESS_MOCK}`],
      networks: NETWORKS_MOCK,
      includeTxMetadata: true,
    });
  });

  it('delegates to useInfiniteQuery with selectFn, enabled, staleTime and retry', () => {
    setupSelectors();

    renderHook(() => useTransactionsQuery());

    expect(useInfiniteQueryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        ...QUERY_OPTIONS_MOCK,
        select: expect.any(Function),
        enabled: true,
        staleTime: 5 * MINUTE,
        retry: false,
      }),
    );
  });

  it('disables the query and sends no account addresses when there is no EVM address', () => {
    setupSelectors({ evmAddress: '' });

    renderHook(() => useTransactionsQuery());

    expect(getQueryOptionsMock).toHaveBeenCalledWith(
      expect.objectContaining({ accountAddresses: [] }),
    );
    expect(useInfiniteQueryMock).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false }),
    );
  });

  it('disables the query when there are no enabled networks', () => {
    setupSelectors({ networks: [] });

    renderHook(() => useTransactionsQuery());

    expect(useInfiniteQueryMock).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false }),
    );
  });
});
