import { renderHook } from '@testing-library/react-hooks';
import { TransactionType } from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import { useSelector } from 'react-redux';
import { selectLastUsedPaymentMethod } from '../../../../../selectors/transactionController';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { useLastUsedPaymentMethod } from './useLastUsedPaymentMethod';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));
jest.mock('../transactions/useTransactionMetadataRequest');
jest.mock('../../../../../selectors/transactionController', () => ({
  selectLastUsedPaymentMethod: jest.fn(),
}));

const TOKEN_ADDRESS_MOCK = '0x1234567890abcdef1234567890abcdef12345678' as Hex;
const CHAIN_ID_MOCK = '0x1' as Hex;
const OTHER_TOKEN_ADDRESS_MOCK =
  '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd' as Hex;
const OTHER_CHAIN_ID_MOCK = '0x89' as Hex;

describe('useLastUsedPaymentMethod', () => {
  const useSelectorMock = jest.mocked(useSelector);
  const useTransactionMetadataRequestMock = jest.mocked(
    useTransactionMetadataRequest,
  );

  beforeEach(() => {
    jest.resetAllMocks();

    useTransactionMetadataRequestMock.mockReturnValue({
      id: 'tx-1',
      type: TransactionType.perpsDeposit,
      txParams: {},
    } as never);

    useSelectorMock.mockReturnValue({
      address: TOKEN_ADDRESS_MOCK,
      chainId: CHAIN_ID_MOCK,
    });
  });

  it('returns the last used token from the selector keyed by transaction type', () => {
    const { result } = renderHook(() => useLastUsedPaymentMethod());

    expect(result.current.lastUsedToken).toStrictEqual({
      address: TOKEN_ADDRESS_MOCK,
      chainId: CHAIN_ID_MOCK,
    });
  });

  it('returns undefined when no last used token exists', () => {
    useSelectorMock.mockReturnValue(undefined);

    const { result } = renderHook(() => useLastUsedPaymentMethod());

    expect(result.current.lastUsedToken).toBeUndefined();
  });

  it('isLastUsed returns true when address and chainId match the last used token (case-insensitive)', () => {
    const { result } = renderHook(() => useLastUsedPaymentMethod());

    expect(
      result.current.isLastUsed(
        TOKEN_ADDRESS_MOCK.toUpperCase() as Hex,
        CHAIN_ID_MOCK,
      ),
    ).toBe(true);
  });

  it('isLastUsed returns false when address does not match', () => {
    const { result } = renderHook(() => useLastUsedPaymentMethod());

    expect(
      result.current.isLastUsed(OTHER_TOKEN_ADDRESS_MOCK, CHAIN_ID_MOCK),
    ).toBe(false);
  });

  it('isLastUsed returns false when chainId does not match', () => {
    const { result } = renderHook(() => useLastUsedPaymentMethod());

    expect(
      result.current.isLastUsed(TOKEN_ADDRESS_MOCK, OTHER_CHAIN_ID_MOCK),
    ).toBe(false);
  });

  it('isLastUsed returns false when the last used token is undefined', () => {
    useSelectorMock.mockReturnValue(undefined);

    const { result } = renderHook(() => useLastUsedPaymentMethod());

    expect(result.current.isLastUsed(TOKEN_ADDRESS_MOCK, CHAIN_ID_MOCK)).toBe(
      false,
    );
  });

  it('invokes selectLastUsedPaymentMethod with the current transaction type and id so the current transaction is excluded', () => {
    renderHook(() => useLastUsedPaymentMethod());

    expect(useSelectorMock).toHaveBeenCalled();
    const selectorFn = useSelectorMock.mock.calls[0][0];
    selectorFn({} as never);
    expect(selectLastUsedPaymentMethod).toHaveBeenCalledWith(
      {},
      TransactionType.perpsDeposit,
      'tx-1',
    );
  });

  it('passes undefined transactionType and id when no transaction metadata is available', () => {
    useTransactionMetadataRequestMock.mockReturnValue(undefined);

    renderHook(() => useLastUsedPaymentMethod());

    const selectorFn = useSelectorMock.mock.calls[0][0];
    selectorFn({} as never);
    expect(selectLastUsedPaymentMethod).toHaveBeenCalledWith(
      {},
      undefined,
      undefined,
    );
  });

  it('keeps the result reference stable across renders when nothing changes', () => {
    const { result, rerender } = renderHook(() => useLastUsedPaymentMethod());
    const firstResult = result.current;

    rerender();

    expect(result.current).toBe(firstResult);
  });
});
