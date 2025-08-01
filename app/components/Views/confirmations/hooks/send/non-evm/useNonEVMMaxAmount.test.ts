import {
  ProviderValues,
  renderHookWithProvider,
} from '../../../../../../util/test/renderWithProvider';
import { evmSendStateMock } from '../../../__mocks__/send.mock';
import { useNonEVMMaxAmount } from './useNonEVMMaxAmount';

const mockState = {
  state: evmSendStateMock,
};

describe('useNonEVMMaxAmount', () => {
  it('return function getNonEVMMaxAmount', () => {
    const { result } = renderHookWithProvider(
      () => useNonEVMMaxAmount(),
      mockState as ProviderValues,
    );
    expect(result.current.getNonEVMMaxAmount).toBeDefined();
  });
});
