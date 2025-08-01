import {
  ProviderValues,
  renderHookWithProvider,
} from '../../../../../../util/test/renderWithProvider';
import { evmSendStateMock } from '../../../__mocks__/send.mock';
import { useNonEVMAmountValidation } from './useNonEVMAmountValidation';

const mockState = {
  state: evmSendStateMock,
};

describe('useNonEVMAmountValidation', () => {
  it('return function validateNonEVMAmount', () => {
    const { result } = renderHookWithProvider(
      () => useNonEVMAmountValidation(),
      mockState as ProviderValues,
    );
    expect(result.current.validateNonEVMAmount).toBeDefined();
  });
});
