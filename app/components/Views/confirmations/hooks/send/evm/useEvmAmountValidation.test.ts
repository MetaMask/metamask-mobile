import { AccountInformation } from '@metamask/assets-controllers';
import { Hex } from '@metamask/utils';

import { renderHookWithProvider } from '../../../../../../util/test/renderWithProvider';
import { AssetType } from '../../../types/token';
import {
  TOKEN_ADDRESS_MOCK_1,
  evmSendStateMock,
} from '../../../__mocks__/send.mock';
import {
  useEvmAmountValidation,
  validateAmountFn,
} from './useEvmAmountValidation';

const mockState = {
  state: evmSendStateMock,
};

interface ValidateAmountArgs {
  accounts: Record<Hex, AccountInformation>;
  amount?: string;
  asset?: AssetType;
  contractBalances: Record<Hex, Hex>;
  from: Hex;
}

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
      ).toStrictEqual({});
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
      ).toStrictEqual({});
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
      ).toStrictEqual({ insufficientBalance: true });
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
      ).toStrictEqual({});
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
      ).toStrictEqual({});
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
      ).toStrictEqual({ insufficientBalance: true });
    });
  });
});

describe('useEvmAmountValidation', () => {
  it('return function validateEvmAmount', () => {
    const { result } = renderHookWithProvider(
      () => useEvmAmountValidation(),
      mockState,
    );
    expect(result.current.validateEvmAmount).toBeDefined();
  });
});
