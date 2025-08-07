import { renderHookWithProvider } from '../../../../../../util/test/renderWithProvider';
import { AssetType } from '../../../types/token';
import { evmSendStateMock } from '../../../__mocks__/send.mock';
import { getMaxValueFn, useNonEvmMaxAmount } from './useNonEvmMaxAmount';

const mockState = {
  state: evmSendStateMock,
};

describe('getMaxValueFn', () => {
  it('return undefined if no asset is passed', () => {
    expect(getMaxValueFn()).toStrictEqual({ balance: '0', maxAmount: '0' });
  });

  it('return undefined if native asset is passed', () => {
    expect(getMaxValueFn({ isNative: true } as AssetType)).toStrictEqual({
      balance: undefined,
      maxAmount: undefined,
    });
  });

  it('return correct value for non-native token', () => {
    expect(
      getMaxValueFn({
        balance: '120',
      } as AssetType),
    ).toStrictEqual({ balance: '120', maxAmount: '120' });
  });
});

describe('useNonEvmMaxAmount', () => {
  it('return function getNonEvmMaxAmount', () => {
    const { result } = renderHookWithProvider(
      () => useNonEvmMaxAmount(),
      mockState,
    );
    expect(result.current.getNonEvmMaxAmount).toBeDefined();
  });
});
