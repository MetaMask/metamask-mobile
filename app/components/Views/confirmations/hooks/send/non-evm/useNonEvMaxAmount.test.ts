import { renderHookWithProvider } from '../../../../../../util/test/renderWithProvider';
import { evmSendStateMock } from '../../../__mocks__/send.mock';
import { useNonEvmMaxAmount } from './useNonEvMaxAmount';

const mockState = {
  state: evmSendStateMock,
};

describe('useNonEvmMaxAmount', () => {
  it('return function getNonEvmMaxAmount', () => {
    const { result } = renderHookWithProvider(
      () => useNonEvmMaxAmount(),
      mockState,
    );
    expect(result.current.getNonEvmMaxAmount).toBeDefined();
  });
});
