import { renderHookWithProvider } from '../../../../../../util/test/renderWithProvider';
import { evmSendStateMock } from '../../../__mocks__/send.mock';
import { useAmountSelectionMetrics } from './useAmountSelectionMetrics';

const mockState = {
  state: evmSendStateMock,
};

describe('useAmountSelectionMetrics', () => {
  it('return field for capturing amount metrics related details', () => {
    const { result } = renderHookWithProvider(
      () => useAmountSelectionMetrics(),
      mockState,
    );
    expect(result.current.captureAmountSelected).toBeDefined();
    expect(result.current.setAmountInputMethodManual).toBeDefined();
    expect(result.current.setAmountInputMethodPressedMax).toBeDefined();
    expect(result.current.setAmountInputTypeFiat).toBeDefined();
    expect(result.current.setAmountInputTypeToken).toBeDefined();
  });
});
