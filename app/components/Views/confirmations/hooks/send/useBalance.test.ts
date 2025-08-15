import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { AssetType } from '../../types/token';
import {
  evmSendStateMock,
  TOKEN_ADDRESS_MOCK_1,
} from '../../__mocks__/send.mock';
import {
  getEvmBalance,
  GetEvmBalanceArgs,
  getNonEvmBalance,
  useBalance,
} from './useBalance';

const mockState = {
  state: evmSendStateMock,
};

const getEvmbalanceFnArguments = (params: Record<string, unknown>) => ({
  accounts: { [TOKEN_ADDRESS_MOCK_1]: { balance: '0x3635C9ADC5DEA00000' } },
  asset: {},
  contractBalances: { '0x111': '0x3B9ACA00' },
  from: TOKEN_ADDRESS_MOCK_1,
  ...params,
});

describe('getPercentageValueFn', () => {
  it('return default if no asset is passed', () => {
    expect(
      getEvmBalance(
        getEvmbalanceFnArguments({
          asset: undefined,
        }) as unknown as GetEvmBalanceArgs,
      ),
    ).toStrictEqual('0');
  });

  it('return correct value for native token', () => {
    expect(
      getEvmBalance(
        getEvmbalanceFnArguments({
          asset: {
            isNative: true,
            chainId: '0x1',
          },
        }) as unknown as GetEvmBalanceArgs,
      ),
    ).toStrictEqual('1000');
  });

  it('return correct value for ERC20 token', () => {
    expect(
      getEvmBalance(
        getEvmbalanceFnArguments({
          asset: {
            address: '0x111',
            decimals: 2,
          },
        }) as unknown as GetEvmBalanceArgs,
      ),
    ).toStrictEqual('10000000');
  });
});

describe('getNonEvmBalance', () => {
  it('return default if no asset is passed', () => {
    expect(getNonEvmBalance(undefined)).toStrictEqual('0');
  });

  it('return correct value for native token', () => {
    expect(
      getNonEvmBalance({
        isNative: true,
        chainId: '0x1',
        balance: '0.0001',
      } as AssetType),
    ).toStrictEqual('0.0001');
  });

  it('return correct value for non-native token', () => {
    expect(
      getNonEvmBalance({
        address: '0x111',
        decimals: 2,
        balance: '10.05',
      } as AssetType),
    ).toStrictEqual('10.05');
  });
});

describe('useBalance', () => {
  it('return balance of the user', () => {
    const { result } = renderHookWithProvider(() => useBalance(), mockState);
    expect(result.current).toEqual({ balance: '0' });
  });
});
