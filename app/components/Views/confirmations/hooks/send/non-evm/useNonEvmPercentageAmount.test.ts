import { renderHookWithProvider } from '../../../../../../util/test/renderWithProvider';
import { AssetType } from '../../../types/token';
import { evmSendStateMock } from '../../../__mocks__/send.mock';
import {
  getPercentageValueFn,
  useNonEvmPercentageAmount,
} from './useNonEvmPercentageAmount';

const mockState = {
  state: evmSendStateMock,
};

describe('getPercentageValueFn', () => {
  it('return `0` if no asset is passed', () => {
    expect(getPercentageValueFn(100)).toStrictEqual('0');
  });

  it('return undefined if native asset is passed', () => {
    expect(
      getPercentageValueFn(100, {
        isNative: true,
        balance: '120',
      } as AssetType),
    ).toStrictEqual(undefined);
    expect(
      getPercentageValueFn(50, { isNative: true, balance: '120' } as AssetType),
    ).toStrictEqual('60');
  });

  it('return correct value for non-native token', () => {
    expect(
      getPercentageValueFn(100, {
        balance: '120',
      } as AssetType),
    ).toStrictEqual('120');
    expect(
      getPercentageValueFn(50, {
        balance: '120',
      } as AssetType),
    ).toStrictEqual('60');
  });
});

describe('useNonEvmPercentageAmount', () => {
  it('return function getNonEvmPercentageAmount', () => {
    const { result } = renderHookWithProvider(
      () => useNonEvmPercentageAmount(),
      mockState,
    );
    expect(result.current.getNonEvmPercentageAmount).toBeDefined();
  });
});
