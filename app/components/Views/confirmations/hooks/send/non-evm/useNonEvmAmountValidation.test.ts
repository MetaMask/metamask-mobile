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
      undefined,
    );
    expect(validateAmountFn(getArguments({ amount: null }))).toStrictEqual(
      undefined,
    );
    expect(validateAmountFn(getArguments({ amount: '' }))).toStrictEqual(
      undefined,
    );
  });

  it('returns invalid value error if value passed is not correct positive decimal', () => {
    expect(validateAmountFn(getArguments({ amount: 'abc' }))).toStrictEqual(
      'Invalid value',
    );
    expect(validateAmountFn(getArguments({ amount: '-100' }))).toStrictEqual(
      'Invalid value',
    );
  });

  it('does not return error if amount is less than user balance', () => {
    expect(
      validateAmountFn(
        getArguments({
          amount: '50',
        }),
      ),
    ).toStrictEqual(undefined);
  });

  it('does not return error if amount is equal to user balance', () => {
    expect(
      validateAmountFn(
        getArguments({
          amount: '100',
        }),
      ),
    ).toStrictEqual(undefined);
  });

  it('return error if amount is greater than user balance', () => {
    expect(
      validateAmountFn(
        getArguments({
          amount: '200',
        }),
      ),
    ).toStrictEqual('Insufficient funds');
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
