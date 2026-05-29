import { renderHook } from '@testing-library/react-hooks';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { apiClient } from '../../../core/apiClient';
import { selectEvmAddress } from '../../../selectors/accountsController';
import { selectSelectedAccountGroupEvmInternalAccount } from '../../../selectors/multichainAccounts/accountTreeController';
import { selectEvmEnabledCaipNetworks } from '../../../selectors/networkEnablementController';
import { useTransactionsQuery } from './useTransactionsQuery';
import { MINUTE } from '../../../constants/time';
import { selectRequiredTransactionHashes } from '../../../selectors/transactionController';

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

jest.mock(
  '../../../selectors/multichainAccounts/accountTreeController',
  () => ({
    selectSelectedAccountGroupEvmInternalAccount: jest.fn(),
  }),
);

jest.mock('../../../selectors/networkEnablementController', () => ({
  selectEvmEnabledCaipNetworks: jest.fn(),
}));

jest.mock('../../../selectors/transactionController', () => ({
  selectRequiredTransactionHashes: jest.fn(),
}));

const ADDRESS_MOCK = '0x1234567890123456789012345678901234567890';
const GROUP_EVM_ADDRESS_MOCK = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';
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
    groupEvmAccount = null as { address: string } | null,
    networks = NETWORKS_MOCK,
  }: {
    evmAddress?: string;
    groupEvmAccount?: { address: string } | null;
    networks?: string[];
  } = {}) {
    useSelectorMock.mockImplementation((selector) => {
      if (selector === selectSelectedAccountGroupEvmInternalAccount) {
        return groupEvmAccount;
      }
      if (selector === selectEvmAddress) {
        return evmAddress;
      }
      if (selector === selectEvmEnabledCaipNetworks) {
        return networks;
      }
      if (selector === selectRequiredTransactionHashes) {
        return new Set<string>();
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
    setupSelectors({ evmAddress: '', groupEvmAccount: null });

    renderHook(() => useTransactionsQuery());

    expect(getQueryOptionsMock).toHaveBeenCalledWith(
      expect.objectContaining({ accountAddresses: [] }),
    );
    expect(useInfiniteQueryMock).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false }),
    );
  });

  it('uses account group EVM address when globally selected account has no EVM address', () => {
    setupSelectors({
      evmAddress: '',
      groupEvmAccount: { address: GROUP_EVM_ADDRESS_MOCK },
    });

    renderHook(() => useTransactionsQuery());

    expect(getQueryOptionsMock).toHaveBeenCalledWith({
      accountAddresses: [`eip155:0:${GROUP_EVM_ADDRESS_MOCK}`],
      networks: NETWORKS_MOCK,
      includeTxMetadata: true,
    });
    expect(useInfiniteQueryMock).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: true }),
    );
  });

  it('disables the query when there are no enabled networks', () => {
    setupSelectors({ networks: [] });

    renderHook(() => useTransactionsQuery());

    expect(useInfiniteQueryMock).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false }),
    );
  });

  it('prefers the account group EVM address over the global EVM address when both are set', () => {
    setupSelectors({
      evmAddress: ADDRESS_MOCK,
      groupEvmAccount: { address: GROUP_EVM_ADDRESS_MOCK },
    });

    renderHook(() => useTransactionsQuery());

    expect(getQueryOptionsMock).toHaveBeenCalledWith({
      accountAddresses: [`eip155:0:${GROUP_EVM_ADDRESS_MOCK}`],
      networks: NETWORKS_MOCK,
      includeTxMetadata: true,
    });
  });

  it('does not use global EVM address when group account has an empty string address', () => {
    setupSelectors({
      evmAddress: ADDRESS_MOCK,
      groupEvmAccount: { address: '' },
    });

    renderHook(() => useTransactionsQuery());

    expect(getQueryOptionsMock).toHaveBeenCalledWith(
      expect.objectContaining({ accountAddresses: [] }),
    );
    expect(useInfiniteQueryMock).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false }),
    );
  });
});
