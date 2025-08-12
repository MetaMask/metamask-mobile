import { renderHookWithProvider } from '../../../../../../util/test/renderWithProvider';
import { evmSendStateMock } from '../../../__mocks__/send.mock';
import { useSendExitMetrics } from './useSendExitMetrics';

const mockState = {
  state: evmSendStateMock,
};

describe('useSendExitMetrics', () => {
  it('return field getting send edit related metrics', () => {
    const { result } = renderHookWithProvider(
      () => useSendExitMetrics(),
      mockState,
    );
    expect(result.current.captureSendExit).toBeDefined();
  });
});
