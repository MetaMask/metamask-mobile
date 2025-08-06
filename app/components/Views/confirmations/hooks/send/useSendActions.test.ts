import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { evmSendStateMock } from '../../__mocks__/send.mock';
import { useSendActions } from './useSendActions';

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    goBack: mockGoBack,
    navigate: mockNavigate,
  }),
  useRoute: jest.fn().mockReturnValue({
    params: {
      asset: {
        chainId: '0x1',
      },
    },
  }),
}));

const mockState = {
  state: evmSendStateMock,
};

describe('useSendActions', () => {
  it('return function submitSend, cancelSend', () => {
    const { result } = renderHookWithProvider(
      () => useSendActions(),
      mockState,
    );
    expect(result.current.handleSubmitPress).toBeDefined();
    expect(result.current.handleCancelPress).toBeDefined();
  });

  it('call navigation.goBack when cancelSend is invoked', () => {
    const { result } = renderHookWithProvider(
      () => useSendActions(),
      mockState,
    );
    result.current.handleCancelPress();
    expect(mockGoBack).toHaveBeenCalled();
  });
});
