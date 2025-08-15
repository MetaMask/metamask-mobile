import { renderHookWithProvider } from '../../../../../../util/test/renderWithProvider';
import { evmSendStateMock } from '../../../__mocks__/send.mock';
import { useRecipientSelectionMetrics } from './useRecipientSelectionMetrics';

const mockState = {
  state: evmSendStateMock,
};

describe('useRecipientSelectionMetrics', () => {
  it('return field getting recipient selection related details', () => {
    const { result } = renderHookWithProvider(
      () => useRecipientSelectionMetrics(),
      mockState,
    );
    expect(result.current.captureRecipientSelected).toBeDefined();
    expect(result.current.setRecipientInputMethod).toBeDefined();
  });
});
