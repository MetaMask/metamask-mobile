import {
  ProviderValues,
  renderHookWithProvider,
} from '../../../../../util/test/renderWithProvider';
import { evmSendStateMock } from '../../__mocks__/send.mock';
import { useMaxAmount } from './useMaxAmount';

jest.mock('../gas/useGasFeeEstimates', () => ({
  useGasFeeEstimates: () => ({
    gasFeeEstimates: { medium: { suggestedMaxFeePerGas: 1.5 } },
  }),
}));

const mockState = {
  state: evmSendStateMock,
};

describe('useMaxAmount', () => {
  it('return function getMaxAmount', () => {
    const { result } = renderHookWithProvider(
      () => useMaxAmount(),
      mockState as ProviderValues,
    );
    expect(result.current.getMaxAmount).toBeDefined();
  });
});
