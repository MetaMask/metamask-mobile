import { renderHook } from '@testing-library/react-hooks';
import type { TransactionPaymentToken } from '@metamask/transaction-pay-controller';
import { Hex } from '@metamask/utils';
import { useSelector } from 'react-redux';
import { useAutomaticTransactionPayToken } from './useAutomaticTransactionPayToken';
import { usePayWithSelectedToken } from './usePayWithSelectedToken';
import { useTransactionPayToken } from './useTransactionPayToken';
import {
  evmAssetId,
  resolveEvmAssetIdMock,
} from '../../__mocks__/pay-token.mock';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));
jest.mock('./useAutomaticTransactionPayToken');
jest.mock('./useTransactionPayToken');

const AUTOMATIC_TOKEN_MOCK = {
  address: '0x1234567890abcdef1234567890abcdef12345678' as Hex,
  chainId: '0x1' as Hex,
};

const SELECTED_TOKEN_ASSET_MOCK = {
  address: '0xABcdEFABcdEFabcdEfAbCdefabcdeFABcDEFabCD' as Hex,
  chainId: '0x1' as Hex,
};

const SELECTED_PAY_TOKEN_MOCK: TransactionPaymentToken = {
  assetId: evmAssetId(
    SELECTED_TOKEN_ASSET_MOCK.address,
    SELECTED_TOKEN_ASSET_MOCK.chainId,
  ),
  balanceFiat: '$20.00',
  balanceHuman: '20',
  balanceRaw: '20000000',
  balanceUsd: '20',
  decimals: 6,
  symbol: 'POL',
};

const MATCHING_PAY_TOKEN_MOCK: TransactionPaymentToken = {
  assetId: evmAssetId(
    AUTOMATIC_TOKEN_MOCK.address,
    AUTOMATIC_TOKEN_MOCK.chainId,
  ),
  balanceFiat: '$12.34',
  balanceHuman: '12.34',
  balanceRaw: '12340000',
  balanceUsd: '12.34',
  decimals: 6,
  symbol: 'USDC',
};

describe('usePayWithSelectedToken', () => {
  const useAutomaticTransactionPayTokenMock = jest.mocked(
    useAutomaticTransactionPayToken,
  );
  const useTransactionPayTokenMock = jest.mocked(useTransactionPayToken);
  const setPayTokenMock: jest.MockedFn<
    ReturnType<typeof useTransactionPayToken>['setPayToken']
  > = jest.fn();

  beforeEach(() => {
    jest.resetAllMocks();

    jest.mocked(useSelector).mockReturnValue(resolveEvmAssetIdMock);
    useAutomaticTransactionPayTokenMock.mockReturnValue(AUTOMATIC_TOKEN_MOCK);

    useTransactionPayTokenMock.mockReturnValue({
      payToken: SELECTED_PAY_TOKEN_MOCK,
      setPayToken: setPayTokenMock,
    });
  });

  it('flags the selected token as distinct when it does not match the automatic candidate', () => {
    const { result } = renderHook(() => usePayWithSelectedToken());

    expect(result.current.isSelectedDistinctFromAutomatic).toBe(true);
    expect(result.current.selectedToken).toEqual({
      ...SELECTED_TOKEN_ASSET_MOCK,
      balanceUsd: SELECTED_PAY_TOKEN_MOCK.balanceUsd,
      symbol: SELECTED_PAY_TOKEN_MOCK.symbol,
    });
  });

  it('does not flag the selected token as distinct when it matches the automatic candidate', () => {
    useTransactionPayTokenMock.mockReturnValue({
      payToken: MATCHING_PAY_TOKEN_MOCK,
      setPayToken: setPayTokenMock,
    });

    const { result } = renderHook(() => usePayWithSelectedToken());

    expect(result.current.isSelectedDistinctFromAutomatic).toBe(false);
  });

  it('returns undefined selected token when no pay token is set', () => {
    useTransactionPayTokenMock.mockReturnValue({
      payToken: undefined,
      setPayToken: setPayTokenMock,
    });

    const { result } = renderHook(() => usePayWithSelectedToken());

    expect(result.current.selectedToken).toBeUndefined();
    expect(result.current.isSelectedDistinctFromAutomatic).toBe(false);
  });

  it('returns false for isSelectedDistinctFromAutomatic when there is no automatic candidate', () => {
    useAutomaticTransactionPayTokenMock.mockReturnValue(undefined);

    const { result } = renderHook(() => usePayWithSelectedToken());

    expect(result.current.isSelectedDistinctFromAutomatic).toBe(false);
  });

  it('forwards the explicit preferred token unchanged and disables the underlying side-effects', () => {
    const preferredToken = {
      address: AUTOMATIC_TOKEN_MOCK.address,
      chainId: AUTOMATIC_TOKEN_MOCK.chainId,
    };

    renderHook(() => usePayWithSelectedToken({ preferredToken }));

    expect(useAutomaticTransactionPayTokenMock).toHaveBeenCalledWith({
      preferredToken,
      disable: true,
    });
  });

  it('selectToken calls setPayToken with the asset ID of the requested target', () => {
    const target = {
      address: '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef' as Hex,
      chainId: '0x89' as Hex,
    };

    const { result } = renderHook(() => usePayWithSelectedToken());

    result.current.selectToken(target);

    expect(setPayTokenMock).toHaveBeenCalledWith({
      assetId: evmAssetId(target.address, target.chainId),
    });
  });

  it('selectToken is a no-op when the target already matches the current pay token', () => {
    const target = {
      address: SELECTED_TOKEN_ASSET_MOCK.address.toLowerCase() as Hex,
      chainId: SELECTED_TOKEN_ASSET_MOCK.chainId,
    };

    const { result } = renderHook(() => usePayWithSelectedToken());

    result.current.selectToken(target);

    expect(setPayTokenMock).not.toHaveBeenCalled();
  });

  it('keeps the result reference stable across renders when nothing changes', () => {
    const { result, rerender } = renderHook(() => usePayWithSelectedToken());
    const firstResult = result.current;

    rerender();

    expect(result.current).toBe(firstResult);
  });
});
