import { renderHook } from '@testing-library/react-hooks';
import { TransactionPaymentToken } from '@metamask/transaction-pay-controller';
import { Hex } from '@metamask/utils';
import { useAutomaticTransactionPayToken } from './useAutomaticTransactionPayToken';
import { usePayWithPreferredToken } from './usePayWithPreferredToken';
import { useTransactionPayAvailableTokens } from './useTransactionPayAvailableTokens';
import { useTransactionPayToken } from './useTransactionPayToken';
import { AssetType } from '../../types/token';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';

jest.mock('./useAutomaticTransactionPayToken');
jest.mock('./useTransactionPayAvailableTokens');
jest.mock('./useTransactionPayToken');
jest.mock('../transactions/useTransactionMetadataRequest');

const TOKEN_MOCK: TransactionPaymentToken = {
  address: '0x1234567890abcdef1234567890abcdef12345678' as Hex,
  balanceFiat: '$12.34',
  balanceHuman: '12.34',
  balanceRaw: '12340000',
  balanceUsd: '12.34',
  chainId: '0x1' as Hex,
  decimals: 6,
  symbol: 'USDC',
};

const OTHER_TOKEN_MOCK: TransactionPaymentToken = {
  address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd' as Hex,
  balanceFiat: '$20.00',
  balanceHuman: '20',
  balanceRaw: '20000000',
  balanceUsd: '20',
  chainId: '0x1' as Hex,
  decimals: 6,
  symbol: 'POL',
};

const AVAILABLE_TOKEN_MOCK: AssetType = {
  address: TOKEN_MOCK.address,
  balance: '12.34',
  chainId: TOKEN_MOCK.chainId,
  decimals: TOKEN_MOCK.decimals,
  fiat: { balance: 12.34 },
  image: '',
  isETH: false,
  logo: undefined,
  name: 'USD Coin',
  symbol: TOKEN_MOCK.symbol,
};

describe('usePayWithPreferredToken', () => {
  const useAutomaticTransactionPayTokenMock = jest.mocked(
    useAutomaticTransactionPayToken,
  );
  const useTransactionPayAvailableTokensMock = jest.mocked(
    useTransactionPayAvailableTokens,
  );
  const useTransactionPayTokenMock = jest.mocked(useTransactionPayToken);
  const useTransactionMetadataRequestMock = jest.mocked(
    useTransactionMetadataRequest,
  );
  const setPayTokenMock: jest.MockedFn<
    ReturnType<typeof useTransactionPayToken>['setPayToken']
  > = jest.fn();

  beforeEach(() => {
    jest.resetAllMocks();

    useAutomaticTransactionPayTokenMock.mockReturnValue({
      address: TOKEN_MOCK.address,
      chainId: TOKEN_MOCK.chainId,
    });

    useTransactionPayAvailableTokensMock.mockReturnValue({
      availableTokens: [AVAILABLE_TOKEN_MOCK],
      hasTokens: true,
    });
    useTransactionMetadataRequestMock.mockReturnValue(undefined);

    useTransactionPayTokenMock.mockReturnValue({
      payToken: TOKEN_MOCK,
      setPayToken: setPayTokenMock,
    });
  });

  it('runs automatic token selection and returns the selected pay token', () => {
    const { result } = renderHook(() => usePayWithPreferredToken());

    expect(useAutomaticTransactionPayTokenMock).toHaveBeenCalledTimes(1);
    expect(useAutomaticTransactionPayTokenMock).toHaveBeenCalledWith({
      preferredToken: undefined,
    });
    expect(result.current).toEqual({
      hasTokens: true,
      preferredToken: {
        address: TOKEN_MOCK.address,
        balanceUsd: TOKEN_MOCK.balanceUsd,
        chainId: TOKEN_MOCK.chainId,
        symbol: TOKEN_MOCK.symbol,
      },
      selectedToken: TOKEN_MOCK,
    });
  });

  it('passes an explicit preferred token into automatic token selection', () => {
    const preferredToken = {
      address: TOKEN_MOCK.address,
      chainId: TOKEN_MOCK.chainId,
    };

    renderHook(() => usePayWithPreferredToken({ preferredToken }));

    expect(useAutomaticTransactionPayTokenMock).toHaveBeenCalledWith({
      preferredToken,
    });
  });

  it('returns the preferred token candidate when the selected token differs', () => {
    useTransactionPayTokenMock.mockReturnValue({
      payToken: OTHER_TOKEN_MOCK,
      setPayToken: setPayTokenMock,
    });

    const { result } = renderHook(() => usePayWithPreferredToken());

    expect(result.current.preferredToken).toEqual({
      address: TOKEN_MOCK.address,
      balanceUsd: '12.34',
      chainId: TOKEN_MOCK.chainId,
      symbol: TOKEN_MOCK.symbol,
    });
    expect(result.current.selectedToken).toBe(OTHER_TOKEN_MOCK);
  });

  it('returns undefined when automatic selection has not produced a token', () => {
    useAutomaticTransactionPayTokenMock.mockReturnValue(undefined);

    const { result } = renderHook(() => usePayWithPreferredToken());

    expect(result.current.preferredToken).toBeUndefined();
  });

  it('keeps the result reference stable when the preferred token does not change', () => {
    const { result, rerender } = renderHook(() => usePayWithPreferredToken());
    const firstResult = result.current;

    rerender();

    expect(result.current).toBe(firstResult);
  });
});
