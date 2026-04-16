import { renderHook, act } from '@testing-library/react-native';
import { TransactionType } from '@metamask/transaction-controller';

import { useMoneyAccountPayToken } from './useMoneyAccountPayToken';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { useTransactionPayToken } from './useTransactionPayToken';
import { useAccountTokens } from '../send/useAccountTokens';
import { hasTransactionType } from '../../utils/transaction';

jest.mock('../transactions/useTransactionMetadataRequest');
jest.mock('./useTransactionPayToken');
jest.mock('../send/useAccountTokens');
jest.mock('../../utils/transaction');

const useTransactionMetadataRequestMock = jest.mocked(
  useTransactionMetadataRequest,
);
const useTransactionPayTokenMock = jest.mocked(useTransactionPayToken);
const useAccountTokensMock = jest.mocked(useAccountTokens);
const hasTransactionTypeMock = jest.mocked(hasTransactionType);

const MUSD_TOKEN_ADDRESS = '0xaca92e438df0b2401ff60da7e4337b687a2435da';

const setPayTokenMock = jest.fn();

describe('useMoneyAccountPayToken', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    useTransactionMetadataRequestMock.mockReturnValue({
      id: 'tx-1',
      type: TransactionType.simpleSend,
      txParams: { from: '0xabc' },
    } as never);

    useTransactionPayTokenMock.mockReturnValue({
      payToken: undefined,
      setPayToken: setPayTokenMock,
    });

    useAccountTokensMock.mockReturnValue([]);

    hasTransactionTypeMock.mockReturnValue(false);
  });

  it('returns all flags as false for non-money-account transactions', () => {
    const { result } = renderHook(() => useMoneyAccountPayToken());

    expect(result.current.isMoneyAccountWithdraw).toBe(false);
    expect(result.current.isMoneyAccountDeposit).toBe(false);
    expect(result.current.isAwaitingAccountSelection).toBe(false);
    expect(result.current.displayToken).toBeUndefined();
  });

  it('returns isMoneyAccountWithdraw true for moneyAccountWithdraw type', () => {
    hasTransactionTypeMock.mockImplementation((_meta, types) =>
      (types as TransactionType[]).includes(
        TransactionType.moneyAccountWithdraw,
      ),
    );

    const { result } = renderHook(() => useMoneyAccountPayToken());

    expect(result.current.isMoneyAccountWithdraw).toBe(true);
  });

  it('returns isMoneyAccountDeposit true for moneyAccountDeposit type', () => {
    hasTransactionTypeMock.mockImplementation((_meta, types) =>
      (types as TransactionType[]).includes(
        TransactionType.moneyAccountDeposit,
      ),
    );

    const { result } = renderHook(() => useMoneyAccountPayToken());

    expect(result.current.isMoneyAccountDeposit).toBe(true);
  });

  it('returns isAwaitingAccountSelection true when money account type and no selectedAccount', () => {
    hasTransactionTypeMock.mockImplementation((_meta, types) =>
      (types as TransactionType[]).includes(
        TransactionType.moneyAccountDeposit,
      ),
    );

    const { result } = renderHook(() => useMoneyAccountPayToken());

    expect(result.current.isAwaitingAccountSelection).toBe(true);
  });

  it('returns isAwaitingAccountSelection false when selectedAccount is provided', () => {
    hasTransactionTypeMock.mockImplementation((_meta, types) =>
      (types as TransactionType[]).includes(
        TransactionType.moneyAccountDeposit,
      ),
    );

    const { result } = renderHook(() =>
      useMoneyAccountPayToken('0xSelectedAccount'),
    );

    expect(result.current.isAwaitingAccountSelection).toBe(false);
  });

  it('sets MUSD pay token on withdraw when selectedAccount is provided', () => {
    hasTransactionTypeMock.mockImplementation((_meta, types) =>
      (types as TransactionType[]).includes(
        TransactionType.moneyAccountWithdraw,
      ),
    );

    renderHook(() => useMoneyAccountPayToken('0xSelectedAccount'));

    expect(setPayTokenMock).toHaveBeenCalledWith({
      address: MUSD_TOKEN_ADDRESS,
      chainId: '0x1',
    });
  });

  it('sets first EVM token on deposit when selectedAccount is provided', () => {
    hasTransactionTypeMock.mockImplementation((_meta, types) =>
      (types as TransactionType[]).includes(
        TransactionType.moneyAccountDeposit,
      ),
    );

    useAccountTokensMock.mockReturnValue([
      {
        address: '0xTokenA',
        chainId: '0x1',
        symbol: 'USDC',
        decimals: 6,
      },
    ] as never);

    renderHook(() => useMoneyAccountPayToken('0xSelectedAccount'));

    expect(setPayTokenMock).toHaveBeenCalledWith({
      address: '0xTokenA',
      chainId: '0x1',
    });
  });

  it('skips testnet tokens for deposit token selection', () => {
    hasTransactionTypeMock.mockImplementation((_meta, types) =>
      (types as TransactionType[]).includes(
        TransactionType.moneyAccountDeposit,
      ),
    );

    useAccountTokensMock.mockReturnValue([
      {
        address: '0xTestToken',
        chainId: '0xaa36a7',
        symbol: 'TEST',
        decimals: 18,
      },
      {
        address: '0xMainnetToken',
        chainId: '0x1',
        symbol: 'USDC',
        decimals: 6,
      },
    ] as never);

    renderHook(() => useMoneyAccountPayToken('0xSelectedAccount'));

    expect(setPayTokenMock).toHaveBeenCalledWith({
      address: '0xMainnetToken',
      chainId: '0x1',
    });
  });

  it('does not call setPayToken when selectedAccount is undefined', () => {
    hasTransactionTypeMock.mockImplementation((_meta, types) =>
      (types as TransactionType[]).includes(
        TransactionType.moneyAccountWithdraw,
      ),
    );

    renderHook(() => useMoneyAccountPayToken());

    expect(setPayTokenMock).not.toHaveBeenCalled();
  });

  it('returns MUSD fallback as displayToken for withdraw when payToken is undefined', () => {
    hasTransactionTypeMock.mockImplementation((_meta, types) =>
      (types as TransactionType[]).includes(
        TransactionType.moneyAccountWithdraw,
      ),
    );

    const { result } = renderHook(() => useMoneyAccountPayToken());

    expect(result.current.displayToken).toEqual({
      address: MUSD_TOKEN_ADDRESS,
      chainId: '0x1',
      symbol: 'mUSD',
      decimals: 6,
    });
  });

  it('returns payToken as displayToken for withdraw when payToken is set', () => {
    const mockPayToken = {
      address: '0xPayToken' as const,
      chainId: '0x1' as const,
      symbol: 'PAY',
      decimals: 18,
    };

    hasTransactionTypeMock.mockImplementation((_meta, types) =>
      (types as TransactionType[]).includes(
        TransactionType.moneyAccountWithdraw,
      ),
    );

    useTransactionPayTokenMock.mockReturnValue({
      payToken: mockPayToken as never,
      setPayToken: setPayTokenMock,
    });

    const { result } = renderHook(() => useMoneyAccountPayToken());

    expect(result.current.displayToken).toBe(mockPayToken);
  });

  it('returns undefined displayToken for non-withdraw transactions', () => {
    hasTransactionTypeMock.mockImplementation((_meta, types) =>
      (types as TransactionType[]).includes(
        TransactionType.moneyAccountDeposit,
      ),
    );

    const { result } = renderHook(() =>
      useMoneyAccountPayToken('0xSelectedAccount'),
    );

    expect(result.current.displayToken).toBeUndefined();
  });
});
