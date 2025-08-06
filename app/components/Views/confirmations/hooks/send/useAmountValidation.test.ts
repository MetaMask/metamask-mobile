import {
  ProviderValues,
  renderHookWithProvider,
} from '../../../../../util/test/renderWithProvider';
import {
  evmSendStateMock,
  TOKEN_ADDRESS_MOCK_1,
} from '../../__mocks__/send.mock';
import {
  useAmountValidation,
  validateAmountFn,
  ValidateAmountArgs,
} from './useAmountValidation';

const mockState = {
  state: evmSendStateMock,
};

const getArguments = (params: Record<string, unknown>) =>
  ({
    from: TOKEN_ADDRESS_MOCK_1,
    asset: {},
    accounts: { [TOKEN_ADDRESS_MOCK_1]: { balance: '0x3635C9ADC5DEA00000' } },
    contractBalances: { '0x111': '0x3B9ACA00' },
    ...params,
  } as unknown as ValidateAmountArgs);

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
      'Invalid amount',
    );
    expect(validateAmountFn(getArguments({ amount: '-100' }))).toStrictEqual(
      'Invalid amount',
    );
  });

  describe('for native token', () => {
    it('does not return error if amount is less than user balance', () => {
      expect(
        validateAmountFn(
          getArguments({
            amount: '999',
            asset: {
              isNative: true,
            },
          }),
        ),
      ).toStrictEqual(undefined);
    });

    it('does not return error if amount is equal to user balance', () => {
      expect(
        validateAmountFn(
          getArguments({
            amount: '1000',
            asset: {
              isNative: true,
            },
          }),
        ),
      ).toStrictEqual(undefined);
    });

    it('return error if amount is greater than user balance', () => {
      expect(
        validateAmountFn(
          getArguments({
            amount: '1001',
            asset: {
              isNative: true,
            },
          }),
        ),
      ).toStrictEqual('Insufficient funds');
    });
  });

  describe('for ERC20 token', () => {
    it('does not return error if amount is less than user balance', () => {
      expect(
        validateAmountFn(
          getArguments({
            amount: '999',
            asset: {
              isNative: false,
              address: '0x111',
              decimals: 6,
            },
          }),
        ),
      ).toStrictEqual(undefined);
    });

    it('does not return error if amount is equal to user balance', () => {
      expect(
        validateAmountFn(
          getArguments({
            amount: '1000',
            asset: {
              isNative: false,
              address: '0x111',
              decimals: 6,
            },
          }),
        ),
      ).toStrictEqual(undefined);
    });

    it('return error if amount is greater than user balance', () => {
      expect(
        validateAmountFn(
          getArguments({
            amount: '1001',
            asset: {
              isNative: false,
              address: '0x111',
              decimals: 6,
            },
          }),
        ),
      ).toStrictEqual('Insufficient funds');
    });
  });
});

describe('useAmountValidation', () => {
  it('return field for amount error', () => {
    const { result } = renderHookWithProvider(
      () => useAmountValidation(),
      mockState as ProviderValues,
    );
    expect(result.current).toStrictEqual({ amountError: undefined });
  });
});
