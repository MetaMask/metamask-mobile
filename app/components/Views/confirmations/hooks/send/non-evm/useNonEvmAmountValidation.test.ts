import { renderHookWithProvider } from '../../../../../../util/test/renderWithProvider';
import { evmSendStateMock } from '../../../__mocks__/send.mock';
import { AssetType } from '../../../types/token';
import {
  useNonEvmAmountValidation,
  validateAmountFn,
} from './useNonEvmAmountValidation';

const mockState = {
  state: evmSendStateMock,
};

const getArguments = (params: Record<string, unknown>) => ({
  amount: '0',
  asset: { balance: '100' } as AssetType,
  ...params,
});

describe('validateAmountFn', () => {
  it('returns undefined if no value is passed', () => {
    expect(validateAmountFn(getArguments({ amount: undefined }))).toStrictEqual(
      { invalidAmount: true },
    );
    expect(validateAmountFn(getArguments({ amount: null }))).toStrictEqual({
      invalidAmount: true,
    });
    expect(validateAmountFn(getArguments({ amount: '' }))).toStrictEqual({
      invalidAmount: true,
    });
  });

  it('returns invalid value error if value passed is not correct positive decimal', () => {
    expect(validateAmountFn(getArguments({ amount: 'abc' }))).toStrictEqual({
      invalidAmount: true,
    });
    expect(validateAmountFn(getArguments({ amount: '-100' }))).toStrictEqual({
      invalidAmount: true,
    });
  });

  it('does not return error if amount is less than user balance', () => {
    expect(
      validateAmountFn(
        getArguments({
          amount: '50',
        }),
      ),
    ).toStrictEqual({});
  });

  it('does not return error if amount is equal to user balance', () => {
    expect(
      validateAmountFn(
        getArguments({
          amount: '100',
        }),
      ),
    ).toStrictEqual({});
  });

  it('return error if amount is greater than user balance', () => {
    expect(
      validateAmountFn(
        getArguments({
          amount: '200',
        }),
      ),
    ).toStrictEqual({ insufficientBalance: true });
  });
});

describe('useNonEvmAmountValidation', () => {
  it('return function validateNonEvmAmount', () => {
    const { result } = renderHookWithProvider(
      () => useNonEvmAmountValidation(),
      mockState,
    );
    expect(result.current.validateNonEvmAmount).toBeDefined();
  });
});
