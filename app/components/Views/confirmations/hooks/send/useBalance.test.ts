import BN from 'bnjs4';
import { Hex } from '@metamask/utils';

import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import {
  ACCOUNT_ADDRESS_MOCK_1,
  evmSendStateMock,
  TOKEN_ADDRESS_MOCK_1,
} from '../../__mocks__/send.mock';
import { getBalance, GetBalanceArgs, useBalance } from './useBalance';

const mockState = {
  state: evmSendStateMock,
};

const getBalanceFnArguments = (params: Record<string, unknown> = {}) => ({
  asset: { rawBalance: '0x3635C9ADC5DEA00000', decimals: 18 },
  contractBalances: { '0x111': '0x3B9ACA00' },
  from: TOKEN_ADDRESS_MOCK_1,
  ...params,
});

describe('getPercentageValueFn', () => {
  it('return default if no asset is passed', () => {
    expect(
      getBalance(
        getBalanceFnArguments({
          asset: undefined,
        }) as unknown as GetBalanceArgs,
      ),
    ).toStrictEqual({ balance: '0', decimals: 0, rawBalanceBN: new BN('0') });
  });

  it('use asset.rawBalance to get balance if available', () => {
    expect(
      getBalance(getBalanceFnArguments() as unknown as GetBalanceArgs),
    ).toStrictEqual({
      balance: '1000',
      decimals: 18,
      rawBalanceBN: new BN('3635c9adc5dea00000', 16),
    });
  });

  it('use value from accountsByChainId for native asset if asset.rawBalance is not available', () => {
    expect(
      getBalance(
        getBalanceFnArguments({
          asset: {
            address: '0x111',
            chainId: '0x1',
            decimals: 2,
            isNative: true,
          },
          chainId: '0x1',
          accountsByChainId: {
            ['0x1' as Hex]: {
              [ACCOUNT_ADDRESS_MOCK_1]: {
                balance: '0xDE0B6B3A7640000',
              },
            },
          },
          from: ACCOUNT_ADDRESS_MOCK_1,
          isEvmSendType: true,
        }) as unknown as GetBalanceArgs,
      ),
    ).toStrictEqual({
      balance: '10000000000000000',
      decimals: 2,
      rawBalanceBN: new BN('de0b6b3a7640000', 16),
    });
  });

  it('use value from contractBalances for ERC20 asset if asset.rawBalance is not available', () => {
    expect(
      getBalance(
        getBalanceFnArguments({
          asset: { address: '0x111', chainId: '0x1', decimals: 2 },
          isEvmSendType: true,
        }) as unknown as GetBalanceArgs,
      ),
    ).toStrictEqual({
      balance: '10000000',
      decimals: 2,
      rawBalanceBN: new BN('3B9ACA00', 16),
    });
  });

  it('use asset.balance by default if available', () => {
    expect(
      getBalance(
        getBalanceFnArguments({
          asset: { balance: '1.0005', decimals: 5 },
        }) as unknown as GetBalanceArgs,
      ),
    ).toStrictEqual({
      balance: '1.0005',
      decimals: 5,
      rawBalanceBN: new BN('186d2', 16),
    });
  });
});

describe('useBalance', () => {
  it('return balance of the user', () => {
    const { result } = renderHookWithProvider(() => useBalance(), mockState);
    expect(result.current).toEqual({
      balance: '0',
      decimals: 0,
      rawBalanceBN: new BN('0'),
    });
  });
});
