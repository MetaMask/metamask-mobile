import { Hex } from '@metamask/utils';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { useTokenWithBalance } from './useTokenWithBalance';
import { merge } from 'lodash';
import {
  otherControllersMock,
  tokenAddress1Mock,
} from '../../__mocks__/controllers/other-controllers-mock';

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
      balance: '0.01',
      balanceFiat: '$100',
      chainId: '0x1',
      decimals: 4,
      symbol: 'T1',
      tokenFiatAmount: 100,
    });
  });

  it('returns undefined if no token exists for the given address and chain ID', () => {
    const { result } = runHook('0x123', '0x1');
    expect(result.current).toBeUndefined();
  });
});
