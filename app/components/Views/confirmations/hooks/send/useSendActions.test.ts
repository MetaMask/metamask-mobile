import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import {
  ACCOUNT_ADDRESS_MOCK_1,
  evmSendStateMock,
} from '../../__mocks__/send.mock';
import { useSendContext } from '../../context/send-context';
// eslint-disable-next-line import/no-namespace
import * as SendUtils from '../../utils/send';
// eslint-disable-next-line import/no-namespace
import * as SendExitMetrics from './metrics/useSendExitMetrics';
import { useSendActions } from './useSendActions';

jest.mock('../../context/send-context', () => ({
  useSendContext: jest.fn(),
}));

const mockUseSendContext = useSendContext as jest.MockedFunction<
  typeof useSendContext
>;

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
    name: 'send_route',
  }),
}));

const mockState = {
  state: evmSendStateMock,
};

describe('useSendActions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSendContext.mockReturnValue({
      asset: {
        chainId: '0x1',
        address: '0x935E73EDb9fF52E23BaC7F7e043A1ecD06d05477',
        decimals: 2,
        isNative: true,
      },
      chainId: '0x1',
      from: ACCOUNT_ADDRESS_MOCK_1,
    } as unknown as ReturnType<typeof useSendContext>);
  });

  it('return function submitSend, cancelSend', () => {
    const { result } = renderHookWithProvider(
      () => useSendActions(),
      mockState,
    );
    expect(result.current.handleSubmitPress).toBeDefined();
    expect(result.current.handleCancelPress).toBeDefined();
  });

  it('calls navigation.navigate with correct params when evm ', () => {
    const { result } = renderHookWithProvider(
      () => useSendActions(),
      mockState,
    );
    jest.spyOn(SendUtils, 'submitEvmTransaction').mockImplementation(jest.fn());
    result.current.handleSubmitPress();
    expect(mockNavigate).toHaveBeenCalledWith('RedesignedConfirmations', {
      params: { maxValueMode: undefined },
      loader: 'transfer',
    });
  });

  it('calls navigation.goBack when handleBackPress is invoked', () => {
    const { result } = renderHookWithProvider(
      () => useSendActions(),
      mockState,
    );
    result.current.handleBackPress();
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('calls navigation.goBack when handleCancelPress is invoked', () => {
    const { result } = renderHookWithProvider(
      () => useSendActions(),
      mockState,
    );
    result.current.handleCancelPress();
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('capture metrics when handleCancelPress is invoked', () => {
    const mockCaptureSendExit = jest.fn();
    jest
      .spyOn(SendExitMetrics, 'useSendExitMetrics')
      .mockReturnValue({ captureSendExit: mockCaptureSendExit });
    const { result } = renderHookWithProvider(
      () => useSendActions(),
      mockState,
    );
    result.current.handleCancelPress();
    expect(mockCaptureSendExit).toHaveBeenCalled();
  });
});
