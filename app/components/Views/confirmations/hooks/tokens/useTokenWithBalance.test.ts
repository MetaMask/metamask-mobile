import { Hex } from '@metamask/utils';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { useTokenWithBalance } from './useTokenWithBalance';
import { merge } from 'lodash';
import {
  otherControllersMock,
  tokenAddress1Mock,
} from '../../__mocks__/controllers/other-controllers-mock';
import { NATIVE_TOKEN_ADDRESS } from '../../constants/tokens';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';

jest.mock('../transactions/useTransactionMetadataRequest');
const useTransactionMetadataRequestMock = jest.mocked(
  useTransactionMetadataRequest,
);

const marketDataMock = {
  engine: {
    backgroundState: {
      TokenRatesController: {
        marketData: {
          '0x1': {
            '0x1234567890AbcdEF1234567890aBcdef12345678': { price: 1 },
          },
        },
      },
    },
  },
};

function runHook(tokenAddress: Hex, chainId: Hex, extraState = {}) {
  return renderHookWithProvider(
    () => useTokenWithBalance(tokenAddress, chainId),
    {
      state: merge({}, otherControllersMock, marketDataMock, extraState),
    },
  );
}

describe('useTokenWithBalance', () => {
  beforeEach(() => {
    useTransactionMetadataRequestMock.mockReturnValue(undefined);
  });

  it('returns token and balance properties', () => {
    const { result } = runHook(tokenAddress1Mock, '0x1');

    expect(result.current).toStrictEqual({
      address: tokenAddress1Mock,
      balance: '0.01',
      balanceFiat: '$100',
      balanceRaw: '100',
      chainId: '0x1',
      decimals: 4,
      symbol: 'T1',
      tokenFiatAmount: 100,
    });
  });

  it('returns native token properties', () => {
    const { result } = runHook(NATIVE_TOKEN_ADDRESS, '0x1');

    expect(result.current).toStrictEqual({
      address: NATIVE_TOKEN_ADDRESS,
      balance: '2',
      balanceFiat: '$20,000',
      balanceRaw: '2000000000000000000',
      chainId: '0x1',
      decimals: 18,
      symbol: 'ETH',
      tokenFiatAmount: 20000,
    });
  });

  it('returns undefined if no token exists for the given address and chain ID', () => {
    const { result } = runHook('0x123', '0x1');

    expect(result.current).toBeUndefined();
  });

  it('uses txParams.from address for balance lookup when transaction metadata is available', () => {
    useTransactionMetadataRequestMock.mockReturnValue({
      txParams: { from: '0xDifferentAddress' },
    } as ReturnType<typeof useTransactionMetadataRequest>);

    const { result } = runHook(NATIVE_TOKEN_ADDRESS, '0x1');

    expect(result.current?.balanceRaw).toBe('0');
  });

  it('falls back to global account when txParams.from is not set', () => {
    useTransactionMetadataRequestMock.mockReturnValue({
      txParams: {},
    } as ReturnType<typeof useTransactionMetadataRequest>);

    const { result } = runHook(NATIVE_TOKEN_ADDRESS, '0x1');

    expect(result.current?.balance).toBe('2');
  });
});
