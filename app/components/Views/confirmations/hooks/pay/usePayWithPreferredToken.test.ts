import { renderHook } from '@testing-library/react-hooks';
import { TransactionPaymentToken } from '@metamask/transaction-pay-controller';
import { Hex } from '@metamask/utils';
import { usePayWithPreferredToken } from './usePayWithPreferredToken';
import { useTransactionPayAvailableTokens } from './useTransactionPayAvailableTokens';
import { useTransactionPayToken } from './useTransactionPayToken';
import { usePayTokenAccountBalance } from './usePayTokenAccountBalance';
import { AssetType } from '../../types/token';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';

jest.mock('./useTransactionPayAvailableTokens');
jest.mock('./useTransactionPayToken');
jest.mock('./usePayTokenAccountBalance');
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

const HIGHER_BALANCE_AVAILABLE_TOKEN_MOCK: AssetType = {
  address: OTHER_TOKEN_MOCK.address,
  balance: '20',
  chainId: OTHER_TOKEN_MOCK.chainId,
  decimals: OTHER_TOKEN_MOCK.decimals,
  fiat: { balance: 20 },
  image: '',
  isETH: false,
  logo: undefined,
  name: 'Polygon',
  symbol: OTHER_TOKEN_MOCK.symbol,
};

describe('usePayWithPreferredToken', () => {
  const useTransactionPayAvailableTokensMock = jest.mocked(
    useTransactionPayAvailableTokens,
  );
  const useTransactionPayTokenMock = jest.mocked(useTransactionPayToken);
  const usePayTokenAccountBalanceMock = jest.mocked(usePayTokenAccountBalance);
  const useTransactionMetadataRequestMock = jest.mocked(
    useTransactionMetadataRequest,
  );
  const setPayTokenMock: jest.MockedFn<
    ReturnType<typeof useTransactionPayToken>['setPayToken']
  > = jest.fn();

  beforeEach(() => {
    jest.resetAllMocks();

    useTransactionPayAvailableTokensMock.mockReturnValue({
      availableTokens: [AVAILABLE_TOKEN_MOCK],
      hasTokens: true,
    });
    useTransactionMetadataRequestMock.mockReturnValue(undefined);

    useTransactionPayTokenMock.mockReturnValue({
      payToken: TOKEN_MOCK,
      setPayToken: setPayTokenMock,
    });

    usePayTokenAccountBalanceMock.mockReturnValue({
      balanceUsd: TOKEN_MOCK.balanceUsd,
      balanceRaw: TOKEN_MOCK.balanceRaw,
    });
  });

  it('returns the highest-balance held token as the preferred token', () => {
    useTransactionPayAvailableTokensMock.mockReturnValue({
      availableTokens: [
        AVAILABLE_TOKEN_MOCK,
        HIGHER_BALANCE_AVAILABLE_TOKEN_MOCK,
      ],
      hasTokens: true,
    });
    useTransactionPayTokenMock.mockReturnValue({
      payToken: undefined,
      setPayToken: setPayTokenMock,
    });

    const { result } = renderHook(() => usePayWithPreferredToken());

    expect(result.current.preferredToken).toEqual({
      address: OTHER_TOKEN_MOCK.address,
      balanceUsd: '20',
      chainId: OTHER_TOKEN_MOCK.chainId,
      symbol: OTHER_TOKEN_MOCK.symbol,
    });
  });

  it('ignores disabled tokens when selecting the highest-balance token', () => {
    useTransactionPayAvailableTokensMock.mockReturnValue({
      availableTokens: [
        { ...HIGHER_BALANCE_AVAILABLE_TOKEN_MOCK, disabled: true },
        AVAILABLE_TOKEN_MOCK,
      ],
      hasTokens: true,
    });
    useTransactionPayTokenMock.mockReturnValue({
      payToken: undefined,
      setPayToken: setPayTokenMock,
    });

    const { result } = renderHook(() => usePayWithPreferredToken());

    expect(result.current.preferredToken).toEqual({
      address: TOKEN_MOCK.address,
      balanceUsd: '12.34',
      chainId: TOKEN_MOCK.chainId,
      symbol: TOKEN_MOCK.symbol,
    });
  });

  it('uses the live account balance when the highest-balance token is the selected pay token', () => {
    const { result } = renderHook(() => usePayWithPreferredToken());

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

  it('honours an explicit preferred token override when the user holds it', () => {
    useTransactionPayAvailableTokensMock.mockReturnValue({
      availableTokens: [
        AVAILABLE_TOKEN_MOCK,
        HIGHER_BALANCE_AVAILABLE_TOKEN_MOCK,
      ],
      hasTokens: true,
    });
    useTransactionPayTokenMock.mockReturnValue({
      payToken: undefined,
      setPayToken: setPayTokenMock,
    });

    const { result } = renderHook(() =>
      usePayWithPreferredToken({
        preferredToken: {
          address: TOKEN_MOCK.address,
          chainId: TOKEN_MOCK.chainId,
        },
      }),
    );

    expect(result.current.preferredToken).toEqual({
      address: TOKEN_MOCK.address,
      balanceUsd: '12.34',
      chainId: TOKEN_MOCK.chainId,
      symbol: TOKEN_MOCK.symbol,
    });
  });

  it('falls back to the highest-balance token when the override is not held', () => {
    useTransactionPayAvailableTokensMock.mockReturnValue({
      availableTokens: [
        AVAILABLE_TOKEN_MOCK,
        HIGHER_BALANCE_AVAILABLE_TOKEN_MOCK,
      ],
      hasTokens: true,
    });
    useTransactionPayTokenMock.mockReturnValue({
      payToken: undefined,
      setPayToken: setPayTokenMock,
    });

    const { result } = renderHook(() =>
      usePayWithPreferredToken({
        preferredToken: {
          address: '0xnotheld000000000000000000000000000000000' as Hex,
          chainId: '0x1' as Hex,
        },
      }),
    );

    expect(result.current.preferredToken).toEqual({
      address: OTHER_TOKEN_MOCK.address,
      balanceUsd: '20',
      chainId: OTHER_TOKEN_MOCK.chainId,
      symbol: OTHER_TOKEN_MOCK.symbol,
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

  it('returns undefined when there are no available tokens', () => {
    useTransactionPayAvailableTokensMock.mockReturnValue({
      availableTokens: [],
      hasTokens: false,
    });

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
