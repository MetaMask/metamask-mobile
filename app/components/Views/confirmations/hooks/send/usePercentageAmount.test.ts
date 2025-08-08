import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { evmSendStateMock } from '../../__mocks__/send.mock';
import { usePercentageAmount } from './usePercentageAmount';

jest.mock('../gas/useGasFeeEstimates', () => ({
  useGasFeeEstimates: () => ({
    gasFeeEstimates: { medium: { suggestedMaxFeePerGas: 1.5 } },
  }),
}));

const mockState = {
  state: evmSendStateMock,
};

describe('usePercentageAmount', () => {
  it('return function getMaxAmount', () => {
    const { result } = renderHookWithProvider(
      () => usePercentageAmount(),
      mockState,
    );
    expect(result.current.isMaxAmountSupported).toBeDefined();
    expect(result.current.getPercentageAmount).toBeDefined();
  });
});
