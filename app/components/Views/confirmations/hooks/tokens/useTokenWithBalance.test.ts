import { Hex } from '@metamask/utils';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { useTokenWithBalance } from './useTokenWithBalance';
import { merge } from 'lodash';
import {
  otherControllersMock,
  tokenAddress1Mock,
} from '../../__mocks__/controllers/other-controllers-mock';
import { NATIVE_TOKEN_ADDRESS } from '../../constants/tokens';

function runHook(tokenAddress: Hex, chainId: Hex) {
  return renderHookWithProvider(
    () => useTokenWithBalance(tokenAddress, chainId),
    {
      state: merge({}, otherControllersMock),
    },
  );
}

describe('useTokenWithBalance', () => {
  it('returns token and balance properties', () => {
    const { result } = runHook(tokenAddress1Mock, '0x1');

    expect(result.current).toStrictEqual({
      address: tokenAddress1Mock,
      aggregators: [],
      balance: '0.01',
      balanceFiat: '$100',
      balanceRaw: '100',
      chainId: '0x1',
      decimals: 4,
      rwaData: {
        address: tokenAddress1Mock,
        chainId: '0x1',
        decimals: 4,
        symbol: 'T1',
      },
      symbol: 'T1',
      tokenFiatAmount: 100,
    });
  });

  it('returns native token properties', () => {
    const { result } = runHook(NATIVE_TOKEN_ADDRESS, '0x1');

    expect(result.current).toStrictEqual({
      address: NATIVE_TOKEN_ADDRESS,
      aggregators: [],
      balance: '2',
      balanceFiat: '$20,000',
      balanceRaw: '2000000000000000000',
      chainId: '0x1',
      decimals: 18,
      rwaData: undefined,
      symbol: 'ETH',
      tokenFiatAmount: 20000,
    });
  });

  it('returns undefined if no token exists for the given address and chain ID', () => {
    const { result } = runHook('0x123', '0x1');
    expect(result.current).toBeUndefined();
  });
});
