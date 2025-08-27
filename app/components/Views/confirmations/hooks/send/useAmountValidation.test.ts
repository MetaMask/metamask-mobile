import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { Nft } from '../../types/token';
import { evmSendStateMock } from '../../__mocks__/send.mock';
import {
  useAmountValidation,
  validateERC1155Balance,
} from './useAmountValidation';

const mockState = {
  state: evmSendStateMock,
};

describe('validateERC1155Balance', () => {
  it('return error if amount is greater than balance and not otherwise', () => {
    expect(
      validateERC1155Balance({ balance: 5 } as unknown as Nft, '5'),
    ).toEqual(undefined);
    expect(
      validateERC1155Balance({ balance: 5 } as unknown as Nft, '1'),
    ).toEqual(undefined);
    expect(
      validateERC1155Balance({ balance: 5 } as unknown as Nft, '10'),
    ).toEqual('Insufficient funds');
  });
});

describe('useAmountValidation', () => {
  it('return field for amount error', () => {
    const { result } = renderHookWithProvider(
      () => useAmountValidation(),
      mockState,
    );
    expect(result.current).toEqual({ amountError: undefined });
  });
});
