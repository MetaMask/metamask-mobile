import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { evmSendStateMock } from '../../__mocks__/send.mock';
import { useGasFeeEstimatesForSend } from './useGasFeeEstimatesForSend';

jest.mock('../gas/useGasFeeEstimates', () => ({
  useGasFeeEstimates: () => ({
    gasFeeEstimates: { medium: { suggestedMaxFeePerGas: 1.5 } },
  }),
}));

jest.mock('../../../../../util/navigation/navUtils', () => ({
  useParams: () => ({}),
}));

const mockState = {
  state: evmSendStateMock,
};

describe('useGasFeeEstimatesForSend', () => {
  it('returns gas estimates', () => {
    const { result } = renderHookWithProvider(
      () => useGasFeeEstimatesForSend(),
      mockState,
    );

    expect(result.current.gasFeeEstimates).toBeDefined();
  });
});
