import { Alert } from 'react-native';
import { act, renderHook } from '@testing-library/react-native';
import Engine from '../../../../../../core/Engine';
import { VBA_KYC_VENDOR } from '../constants';
import { useKycEmailVerification } from './useKycEmailVerification';

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: mockGoBack,
    navigate: mockNavigate,
  }),
}));

jest.mock('../../../../../../core/Engine', () => ({
  context: {
    KycController: {
      startSession: jest.fn(),
    },
  },
}));

jest.mock('../../../../../../util/Logger', () => ({
  __esModule: true,
  default: {
    log: jest.fn(),
    error: jest.fn(),
  },
}));

const mockKycController = Engine.context.KycController as unknown as {
  startSession: jest.Mock<Promise<unknown>, [unknown]>;
};

const enterEmailAndStart = async (
  result: { current: ReturnType<typeof useKycEmailVerification> },
  email = 'user@example.com',
) => {
  act(() => result.current.setEmail(email));
  await act(result.current.startVerification);
};

describe('useKycEmailVerification', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockKycController.startSession.mockResolvedValue({
      id: 'session-1',
      finalStatus: 'new',
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('disables continue until a non-empty email is set', () => {
    const { result } = renderHook(() => useKycEmailVerification());

    expect(result.current.isContinueDisabled).toBe(true);

    act(() => {
      result.current.setEmail('user@example.com');
    });

    expect(result.current.isContinueDisabled).toBe(false);
  });

  it('starts the session then navigates to Get Pix Key', async () => {
    const { result } = renderHook(() => useKycEmailVerification());

    await enterEmailAndStart(result, '  user@example.com  ');

    expect(mockKycController.startSession).toHaveBeenCalledWith({
      vendor: VBA_KYC_VENDOR,
      email: 'user@example.com',
    });
    expect(mockNavigate).toHaveBeenCalledWith('RampGetPixKey');
  });

  it('alerts without navigating when customer creation rejects', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation();
    mockKycController.startSession.mockRejectedValue(
      new Error('Session creation failed.'),
    );
    const { result } = renderHook(() => useKycEmailVerification());

    await enterEmailAndStart(result);

    expect(alertSpy).toHaveBeenCalledWith(
      'Identity verification',
      'Session creation failed.',
    );
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('does not start verification when the email is blank', async () => {
    const { result } = renderHook(() => useKycEmailVerification());

    await act(async () => {
      await result.current.startVerification();
    });

    expect(mockKycController.startSession).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('navigates back from goBack', () => {
    const { result } = renderHook(() => useKycEmailVerification());

    act(() => {
      result.current.goBack();
    });

    expect(mockGoBack).toHaveBeenCalled();
  });
});
