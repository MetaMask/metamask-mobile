import { renderHook } from '@testing-library/react-hooks';
import type { TransactionPaymentToken } from '@metamask/transaction-pay-controller';
import { toChecksumHexAddress } from '@metamask/controller-utils';
import { Hex } from '@metamask/utils';
import { useSelector } from 'react-redux';
import { useAutomaticTransactionPayToken } from './useAutomaticTransactionPayToken';
import { usePayWithPreferredToken } from './usePayWithPreferredToken';
import { useTransactionPayAvailableTokens } from './useTransactionPayAvailableTokens';
import { useTransactionPayToken } from './useTransactionPayToken';
import { usePayTokenAccountBalance } from './usePayTokenAccountBalance';
import { AssetType } from '../../types/token';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import {
  evmAssetId,
  encodeEvmAssetIdMock,
} from '../../__mocks__/pay-token.mock';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));
jest.mock('./useAutomaticTransactionPayToken');
jest.mock('./useTransactionPayAvailableTokens');
jest.mock('./useTransactionPayToken');
jest.mock('./usePayTokenAccountBalance');
jest.mock('../transactions/useTransactionMetadataRequest');

const TOKEN_ASSET_MOCK = {
  address: toChecksumHexAddress(
    '0x1234567890abcdef1234567890abcdef12345678',
  ) as Hex,
  chainId: '0x1' as Hex,
};

const TOKEN_MOCK: TransactionPaymentToken = {
  assetId: evmAssetId(TOKEN_ASSET_MOCK.address, TOKEN_ASSET_MOCK.chainId),
  balanceFiat: '$12.34',
  balanceHuman: '12.34',
  balanceRaw: '12340000',
  balanceUsd: '12.34',
  decimals: 6,
  symbol: 'USDC',
};

const OTHER_TOKEN_MOCK: TransactionPaymentToken = {
  assetId: evmAssetId('0xabcdefabcdefabcdefabcdefabcdefabcdefabcd', '0x1'),
  balanceFiat: '$20.00',
  balanceHuman: '20',
  balanceRaw: '20000000',
  balanceUsd: '20',
  decimals: 6,
  symbol: 'POL',
};

const AVAILABLE_TOKEN_MOCK: AssetType = {
  address: TOKEN_ASSET_MOCK.address,
  balance: '12.34',
  chainId: TOKEN_ASSET_MOCK.chainId,
  decimals: TOKEN_MOCK.decimals,
  balanceInSelectedCurrencyAmount: 12.34,
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
  const usePayTokenAccountBalanceMock = jest.mocked(usePayTokenAccountBalance);
  const useTransactionMetadataRequestMock = jest.mocked(
    useTransactionMetadataRequest,
  );
  const setPayTokenMock: jest.MockedFn<
    ReturnType<typeof useTransactionPayToken>['setPayToken']
  > = jest.fn();

  beforeEach(() => {
    jest.resetAllMocks();

    jest.mocked(useSelector).mockReturnValue(encodeEvmAssetIdMock);
    useAutomaticTransactionPayTokenMock.mockReturnValue(TOKEN_ASSET_MOCK);

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

  it('runs automatic token selection and returns the selected pay token', () => {
    const { result } = renderHook(() => usePayWithPreferredToken());

    expect(useAutomaticTransactionPayTokenMock).toHaveBeenCalledTimes(1);
    expect(useAutomaticTransactionPayTokenMock).toHaveBeenCalledWith({
      preferredToken: undefined,
    });
    expect(result.current).toEqual({
      hasTokens: true,
      preferredToken: {
        ...TOKEN_ASSET_MOCK,
        balanceUsd: TOKEN_MOCK.balanceUsd,
        symbol: TOKEN_MOCK.symbol,
      },
      selectedToken: TOKEN_MOCK,
    });
  });

  it('passes an explicit preferred token into automatic token selection', () => {
    const preferredToken = TOKEN_ASSET_MOCK;

    renderHook(() => usePayWithPreferredToken({ preferredToken }));

    expect(useAutomaticTransactionPayTokenMock).toHaveBeenCalledWith({
      preferredToken,
    });
  });

  it('returns the preferred token candidate when the selected token differs', () => {
    useTransactionPayAvailableTokensMock.mockReturnValue({
      availableTokens: [
        {
          ...AVAILABLE_TOKEN_MOCK,
          balance: '2',
          balanceInSelectedCurrencyAmount: 12.34,
          fiat: { balance: 99 },
        },
      ],
      hasTokens: true,
    });
    useTransactionPayTokenMock.mockReturnValue({
      payToken: OTHER_TOKEN_MOCK,
      setPayToken: setPayTokenMock,
    });

    const { result } = renderHook(() => usePayWithPreferredToken());

    expect(result.current.preferredToken).toEqual({
      ...TOKEN_ASSET_MOCK,
      balanceUsd: '12.34',
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
