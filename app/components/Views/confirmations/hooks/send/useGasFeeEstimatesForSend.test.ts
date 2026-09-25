import Engine from '../../../../../core/Engine';
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

jest.mock('../../context/send-context', () => ({
  useSendContext: () => ({
    asset: {
      address: '0x935E73EDb9fF52E23BaC7F7e043A1ecD06d05477',
      chainId: '0x1',
    },
    chainId: '0x1',
  }),
}));

const mockState = {
  state: evmSendStateMock,
};

describe('useGasFeeEstimatesForSend', () => {
  it('returns gas estimates and the matching network client', () => {
    jest
      .spyOn(Engine.context.NetworkController, 'findNetworkClientIdByChainId')
      .mockReturnValue('mainnet');

    const { result } = renderHookWithProvider(
      () => useGasFeeEstimatesForSend(),
      mockState,
    );

    expect(result.current.gasFeeEstimates).toBeDefined();
    expect(result.current.networkClientId).toBeDefined();
  });
});
