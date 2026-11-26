import { renderHook } from '@testing-library/react-hooks';
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

describe('useTransactionQuery', () => {
  let queryFnMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    queryFnMock = jest.fn();
    getV5TransactionByIdQueryOptionsMock.mockImplementation(() => ({
      queryKey: ['accounts', 'transactions', 'v5ById'],
      queryFn: queryFnMock,
    }));
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

    expect(queryFnMock).not.toHaveBeenCalled();
  });

  it('disables the query when txHash is missing', () => {
    useSelectorMock.mockReturnValue({ address: '0x1234' });

    renderHook(() =>
      useTransactionQuery({
        chainId: 'eip155:1',
        enabled: true,
        txHash: undefined,
      }),
    );

    expect(queryFnMock).not.toHaveBeenCalled();
  });

  it('disables the query when chain is not eip155', () => {
    useSelectorMock.mockReturnValue({ address: '0x1234' });

    renderHook(() =>
      useTransactionQuery({
        chainId: 'solana:mainnet',
        enabled: true,
        txHash: '0xabc',
      }),
    );

    expect(queryFnMock).not.toHaveBeenCalled();
  });

  it('disables the query when explicitly disabled', () => {
    useSelectorMock.mockReturnValue({ address: '0x1234' });

    renderHook(() =>
      useTransactionQuery({
        chainId: 'eip155:1',
        enabled: false,
        txHash: '0xabc',
      }),
    );

    expect(queryFnMock).not.toHaveBeenCalled();
  });

  it('enables the query for valid EVM inputs', () => {
    useSelectorMock.mockReturnValue({ address: '0x1234567890abcdef' });

    renderHook(() =>
      useTransactionQuery({
        chainId: 'eip155:8453',
        enabled: true,
        txHash: '0xabc',
      }),
    );

    expect(getV5TransactionByIdQueryOptionsMock).toHaveBeenCalledWith(
      'eip155:8453:0x1234567890abcdef',
      '0xabc',
      expect.objectContaining({
        includeTxMetadata: true,
      }),
    );
  });
});
