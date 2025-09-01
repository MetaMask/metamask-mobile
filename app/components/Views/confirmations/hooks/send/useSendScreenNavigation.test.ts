import Routes from '../../../../../constants/navigation/Routes';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { evmSendStateMock } from '../../__mocks__/send.mock';
import { useSendScreenNavigation } from './useSendScreenNavigation';

const mockState = {
  state: evmSendStateMock,
};

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    goBack: jest.fn(),
    navigate: mockNavigate,
  }),
  useRoute: jest.fn().mockReturnValue({
    params: {
      asset: {
        chainId: '0x1',
        address: '0x935E73EDb9fF52E23BaC7F7e043A1ecD06d05477',
      },
    },
  }),
}));

describe('useSendScreenNavigation', () => {
  it('return function gotToSendScreen', () => {
    const { result } = renderHookWithProvider(
      () => useSendScreenNavigation(),
      mockState,
    );
    expect(result.current.gotToSendScreen).toBeDefined();
  });

  it('function gotToSendScreen when invoked navigate', () => {
    const { result } = renderHookWithProvider(
      () => useSendScreenNavigation(),
      mockState,
    );
    const { gotToSendScreen } = result.current;
    gotToSendScreen();
    expect(mockNavigate).toHaveBeenCalled();
  });

  it('function gotToSendScreen passed correct arguments to navigation function', () => {
    const { result } = renderHookWithProvider(
      () => useSendScreenNavigation(),
      mockState,
    );
    const { gotToSendScreen } = result.current;
    gotToSendScreen();
    expect(mockNavigate).toHaveBeenCalledWith('Send', {
      screen: Routes.SEND.AMOUNT,
    });
    gotToSendScreen(Routes.SEND.RECIPIENT);
    expect(mockNavigate).toHaveBeenCalledWith('Send', {
      screen: Routes.SEND.RECIPIENT,
    });
  });
});
