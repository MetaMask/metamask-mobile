import { renderHookWithProvider } from '../../../../../../util/test/renderWithProvider';
import { evmSendStateMock } from '../../../__mocks__/send.mock';
import { useSendExitMetrics } from './useSendExitMetrics';

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    goBack: jest.fn(),
    navigate: jest.fn(),
  }),
  useRoute: jest.fn().mockReturnValue({
    params: {
      asset: {
        chainId: '0x1',
      },
    },
    name: 'send_route',
  }),
}));

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
