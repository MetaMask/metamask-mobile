import { renderHookWithProvider } from '../../../../../../util/test/renderWithProvider';
import { evmSendStateMock } from '../../../__mocks__/send.mock';
import { useNonEvmAmountValidation } from './useNonEvmAmountValidation';

const mockState = {
  state: evmSendStateMock,
};

describe('useNonEvmAmountValidation', () => {
  it('return function validateNonEvmAmount', () => {
    const { result } = renderHookWithProvider(
      () => useNonEvmAmountValidation(),
      mockState,
    );
    expect(result.current.validateNonEvmAmount).toBeDefined();
  });
});
