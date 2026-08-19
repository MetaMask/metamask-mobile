import { Hex } from '@metamask/utils';
import { TransactionPaymentToken } from '@metamask/transaction-pay-controller';

import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { useTransactionPayToken } from './useTransactionPayToken';
import { useAccountTokens } from '../send/useAccountTokens';
import { useTokenFiatRate } from '../tokens/useTokenFiatRates';
import { usePayTokenAccountBalance } from './usePayTokenAccountBalance';
import { AssetType } from '../../types/token';

jest.mock('./useTransactionPayToken');
jest.mock('../send/useAccountTokens');
jest.mock('../tokens/useTokenFiatRates');

const PAY_TOKEN_MOCK = {
  address: '0xabc' as Hex,
  chainId: '0x1' as Hex,
  balanceUsd: '5.00',
  balanceRaw: '5000000000000000000',
  balanceHuman: '5',
  balanceFiat: '5.00',
  decimals: 18,
  symbol: 'ETH',
} as TransactionPaymentToken;

const ACCOUNT_TOKEN_MOCK = {
  address: '0xabc',
  chainId: '0x1',
  decimals: 18,
  rawBalance: '0x1bc16d674ec80000' as Hex, // 2e18 = 2 ETH
  balance: '2',
  symbol: 'ETH',
  fiat: { balance: 3400 },
} as unknown as AssetType;

function runHook() {
  return renderHookWithProvider(usePayTokenAccountBalance);
}

describe('usePayTokenAccountBalance', () => {
  const useTransactionPayTokenMock = jest.mocked(useTransactionPayToken);
  const useAccountTokensMock = jest.mocked(useAccountTokens);
  const useTokenFiatRateMock = jest.mocked(useTokenFiatRate);

  beforeEach(() => {
    jest.resetAllMocks();

    useTransactionPayTokenMock.mockReturnValue({
      payToken: PAY_TOKEN_MOCK,
      setPayToken: jest.fn(),
    });

    useAccountTokensMock.mockReturnValue([ACCOUNT_TOKEN_MOCK]);
    useTokenFiatRateMock.mockReturnValue(1700);
  });

  it('returns zero balances when no pay token is selected', () => {
    useTransactionPayTokenMock.mockReturnValue({
      payToken: undefined,
      setPayToken: jest.fn(),
    });

    const { result } = runHook();

    expect(result.current).toStrictEqual({
      balanceUsd: '0',
      balanceRaw: '0',
    });
  });

  it('computes balance from matching account token and USD rate', () => {
    const { result } = runHook();

    expect(result.current.balanceRaw).toBe('2000000000000000000');
    expect(result.current.balanceUsd).toBe('3400');
  });

  it('falls back to controller snapshot when no matching account token', () => {
    useAccountTokensMock.mockReturnValue([]);

    const { result } = runHook();

    expect(result.current).toStrictEqual({
      balanceUsd: PAY_TOKEN_MOCK.balanceUsd,
      balanceRaw: PAY_TOKEN_MOCK.balanceRaw,
    });
  });

  it('falls back to controller snapshot when matching token has no rawBalance', () => {
    useAccountTokensMock.mockReturnValue([
      { ...ACCOUNT_TOKEN_MOCK, rawBalance: undefined } as unknown as AssetType,
    ]);

    const { result } = runHook();

    expect(result.current).toStrictEqual({
      balanceUsd: PAY_TOKEN_MOCK.balanceUsd,
      balanceRaw: PAY_TOKEN_MOCK.balanceRaw,
    });
  });

  it('matches token by address case-insensitively', () => {
    useTransactionPayTokenMock.mockReturnValue({
      payToken: { ...PAY_TOKEN_MOCK, address: '0xABC' as Hex },
      setPayToken: jest.fn(),
    });

    const { result } = runHook();

    expect(result.current.balanceRaw).toBe('2000000000000000000');
  });

  it('does not match token with same address but different chainId', () => {
    useAccountTokensMock.mockReturnValue([
      { ...ACCOUNT_TOKEN_MOCK, chainId: '0x89' } as unknown as AssetType,
    ]);

    const { result } = runHook();

    expect(result.current).toStrictEqual({
      balanceUsd: PAY_TOKEN_MOCK.balanceUsd,
      balanceRaw: PAY_TOKEN_MOCK.balanceRaw,
    });
  });

  it('falls back to controller balanceUsd when USD rate is unavailable', () => {
    useTokenFiatRateMock.mockReturnValue(undefined);

    const { result } = runHook();

    expect(result.current.balanceRaw).toBe('2000000000000000000');
    expect(result.current.balanceUsd).toBe(PAY_TOKEN_MOCK.balanceUsd);
  });

  it('uses account token decimals over payToken decimals', () => {
    useAccountTokensMock.mockReturnValue([
      {
        ...ACCOUNT_TOKEN_MOCK,
        decimals: 6,
        rawBalance: '0xf4240' as Hex, // 1000000 = 1e6 = 1 token with 6 decimals
      } as unknown as AssetType,
    ]);

    const { result } = runHook();

    // 1000000 / 1e6 = 1, times rate 1700 = 1700
    expect(result.current.balanceUsd).toBe('1700');
    expect(result.current.balanceRaw).toBe('1000000');
  });

  it('uses payToken decimals when account token has no decimals', () => {
    useTransactionPayTokenMock.mockReturnValue({
      payToken: { ...PAY_TOKEN_MOCK, decimals: 8 },
      setPayToken: jest.fn(),
    });

    useAccountTokensMock.mockReturnValue([
      {
        ...ACCOUNT_TOKEN_MOCK,
        decimals: undefined,
        rawBalance: '0x5f5e100' as Hex, // 100000000 = 1e8
      } as unknown as AssetType,
    ]);

    const { result } = runHook();

    // 100000000 / 1e8 = 1, times rate 1700 = 1700
    expect(result.current.balanceUsd).toBe('1700');
  });

  it('handles zero rawBalance correctly', () => {
    useAccountTokensMock.mockReturnValue([
      {
        ...ACCOUNT_TOKEN_MOCK,
        rawBalance: '0x0' as Hex,
      } as unknown as AssetType,
    ]);

    const { result } = runHook();

    expect(result.current).toStrictEqual({
      balanceUsd: '0',
      balanceRaw: '0',
    });
  });

  it('falls back to controller defaults when payToken fields are undefined', () => {
    useTransactionPayTokenMock.mockReturnValue({
      payToken: {
        ...PAY_TOKEN_MOCK,
        balanceUsd: undefined,
        balanceRaw: undefined,
      } as unknown as TransactionPaymentToken,
      setPayToken: jest.fn(),
    });

    useAccountTokensMock.mockReturnValue([]);

    const { result } = runHook();

    expect(result.current).toStrictEqual({
      balanceUsd: '0',
      balanceRaw: '0',
    });
  });
});
