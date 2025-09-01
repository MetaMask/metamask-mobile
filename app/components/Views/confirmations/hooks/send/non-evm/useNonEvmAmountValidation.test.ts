import { renderHookWithProvider } from '../../../../../../util/test/renderWithProvider';
import { evmSendStateMock, SOLANA_ASSET } from '../../../__mocks__/send.mock';
import { AssetType } from '../../../types/token';
// eslint-disable-next-line import/no-namespace
import * as MultichainSnapsUtils from '../../../utils/multichain-snaps';
import {
  useNonEvmAmountValidation,
  validateAmountFn,
  ValidateAmountFnArgs,
} from './useNonEvmAmountValidation';

const mockState = {
  state: evmSendStateMock,
};

const getArguments = (params: Record<string, unknown>) =>
  ({
    amount: '0',
    asset: { balance: '100' } as AssetType,
    ...params,
  } as unknown as ValidateAmountFnArgs);

describe('validateAmountFn', () => {
  it('returns undefined if no value is passed', async () => {
    expect(
      await validateAmountFn(getArguments({ amount: undefined })),
    ).toStrictEqual(undefined);
    expect(
      await validateAmountFn(getArguments({ amount: null })),
    ).toStrictEqual(undefined);
    expect(await validateAmountFn(getArguments({ amount: '' }))).toStrictEqual(
      undefined,
    );
  });

  it('does not return error if validateAmountMultichain return no error', async () => {
    jest
      .spyOn(MultichainSnapsUtils, 'validateAmountMultichain')
      .mockImplementation(() => Promise.resolve({ valid: true }));
    expect(
      await validateAmountFn(
        getArguments({
          amount: '50',
          fromAccount: { id: '123' },
          asset: SOLANA_ASSET,
        }),
      ),
    ).toStrictEqual(undefined);
  });

  it('return error if amount is greater than user balance', async () => {
    jest
      .spyOn(MultichainSnapsUtils, 'validateAmountMultichain')
      .mockImplementation(() =>
        Promise.resolve({
          valid: false,
          errors: [{ code: 'InsufficientBalance' }],
        }),
      );
    expect(
      await validateAmountFn(
        getArguments({
          amount: '200',
          fromAccount: { id: '123' },
          asset: SOLANA_ASSET,
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
