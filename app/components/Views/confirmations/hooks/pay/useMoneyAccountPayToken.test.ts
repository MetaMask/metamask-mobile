import { renderHook } from '@testing-library/react-native';
import { TransactionType } from '@metamask/transaction-controller';

import { useMoneyAccountPayToken } from './useMoneyAccountPayToken';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { useTransactionAccountOverride } from '../transactions/useTransactionAccountOverride';
import { useTransactionPayToken } from './useTransactionPayToken';
import { useAccountTokens } from '../send/useAccountTokens';
import { hasTransactionType } from '../../utils/transaction';

jest.mock('../transactions/useTransactionMetadataRequest');
jest.mock('../transactions/useTransactionAccountOverride');
jest.mock('./useTransactionPayToken');
jest.mock('../send/useAccountTokens');
jest.mock('../../utils/transaction');

const useTransactionMetadataRequestMock = jest.mocked(
  useTransactionMetadataRequest,
);
const useTransactionAccountOverrideMock = jest.mocked(
  useTransactionAccountOverride,
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

    useTransactionAccountOverrideMock.mockReturnValue(undefined);

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

  it('returns isAwaitingAccountSelection true when money account type and no accountOverride', () => {
    hasTransactionTypeMock.mockImplementation((_meta, types) =>
      (types as TransactionType[]).includes(
        TransactionType.moneyAccountDeposit,
      ),
    );

    const { result } = renderHook(() => useMoneyAccountPayToken());

    expect(result.current.isAwaitingAccountSelection).toBe(true);
  });

  it('returns isAwaitingAccountSelection false when accountOverride is set', () => {
    hasTransactionTypeMock.mockImplementation((_meta, types) =>
      (types as TransactionType[]).includes(
        TransactionType.moneyAccountDeposit,
      ),
    );
    useTransactionAccountOverrideMock.mockReturnValue(
      '0xSelectedAccount' as never,
    );

    const { result } = renderHook(() => useMoneyAccountPayToken());

    expect(result.current.isAwaitingAccountSelection).toBe(false);
  });

  it('sets MUSD pay token on withdraw when accountOverride is set', () => {
    hasTransactionTypeMock.mockImplementation((_meta, types) =>
      (types as TransactionType[]).includes(
        TransactionType.moneyAccountWithdraw,
      ),
    );
    useTransactionAccountOverrideMock.mockReturnValue(
      '0xSelectedAccount' as never,
    );

    renderHook(() => useMoneyAccountPayToken());

    expect(setPayTokenMock).toHaveBeenCalledWith({
      address: MUSD_TOKEN_ADDRESS,
      chainId: '0x1',
    });
  });

  it('sets first EVM token on deposit when accountOverride is set', () => {
    hasTransactionTypeMock.mockImplementation((_meta, types) =>
      (types as TransactionType[]).includes(
        TransactionType.moneyAccountDeposit,
      ),
    );
    useTransactionAccountOverrideMock.mockReturnValue(
      '0xSelectedAccount' as never,
    );

    useAccountTokensMock.mockReturnValue([
      {
        address: '0xTokenA',
        chainId: '0x1',
        symbol: 'USDC',
        decimals: 6,
      },
    ] as never);

    renderHook(() => useMoneyAccountPayToken());

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
    useTransactionAccountOverrideMock.mockReturnValue(
      '0xSelectedAccount' as never,
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

    renderHook(() => useMoneyAccountPayToken());

    expect(setPayTokenMock).toHaveBeenCalledWith({
      address: '0xMainnetToken',
      chainId: '0x1',
    });
  });

  it('does not call setPayToken again on deposit when accountTokens refreshes after initial selection', () => {
    hasTransactionTypeMock.mockImplementation((_meta, types) =>
      (types as TransactionType[]).includes(
        TransactionType.moneyAccountDeposit,
      ),
    );
    useTransactionAccountOverrideMock.mockReturnValue(
      '0xSelectedAccount' as never,
    );
    useAccountTokensMock.mockReturnValue([
      { address: '0xTokenA', chainId: '0x1', symbol: 'USDC', decimals: 6 },
    ] as never);

    const { rerender } = renderHook(() => useMoneyAccountPayToken());

    expect(setPayTokenMock).toHaveBeenCalledTimes(1);

    useAccountTokensMock.mockReturnValue([
      { address: '0xTokenA', chainId: '0x1', symbol: 'USDC', decimals: 6 },
      { address: '0xTokenB', chainId: '0x1', symbol: 'DAI', decimals: 18 },
    ] as never);

    rerender({});

    expect(setPayTokenMock).toHaveBeenCalledTimes(1);
  });

  it('does not call setPayToken again on withdraw when accountTokens refreshes after initial selection', () => {
    hasTransactionTypeMock.mockImplementation((_meta, types) =>
      (types as TransactionType[]).includes(
        TransactionType.moneyAccountWithdraw,
      ),
    );
    useTransactionAccountOverrideMock.mockReturnValue(
      '0xSelectedAccount' as never,
    );

    const { rerender } = renderHook(() => useMoneyAccountPayToken());

    expect(setPayTokenMock).toHaveBeenCalledTimes(1);

    rerender({});

    expect(setPayTokenMock).toHaveBeenCalledTimes(1);
  });

  it('calls setPayToken again when accountOverride changes to a new account', () => {
    hasTransactionTypeMock.mockImplementation((_meta, types) =>
      (types as TransactionType[]).includes(
        TransactionType.moneyAccountDeposit,
      ),
    );
    useTransactionAccountOverrideMock.mockReturnValue('0xAccountA' as never);
    useAccountTokensMock.mockReturnValue([
      { address: '0xTokenA', chainId: '0x1', symbol: 'USDC', decimals: 6 },
    ] as never);

    const { rerender } = renderHook(() => useMoneyAccountPayToken());

    expect(setPayTokenMock).toHaveBeenCalledTimes(1);

    useTransactionAccountOverrideMock.mockReturnValue('0xAccountB' as never);

    rerender({});

    expect(setPayTokenMock).toHaveBeenCalledTimes(2);
  });

  it('does not call setPayToken when accountOverride is undefined', () => {
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
    useTransactionAccountOverrideMock.mockReturnValue(
      '0xSelectedAccount' as never,
    );

    const { result } = renderHook(() => useMoneyAccountPayToken());

    expect(result.current.displayToken).toBeUndefined();
  });
});
