import { Alert } from 'react-native';
import { act, renderHook } from '@testing-library/react-native';
import Engine from '../../../../../../core/Engine';
import { useContinueIdentityVerification } from './useContinueIdentityVerification';

const mockOnSuccess = jest.fn();
const mockKycControllerState = {
  email: 'user@example.com' as string | null,
};

jest.mock('../../../../../../core/Engine', () => ({
  context: {
    KycController: {
      get state() {
        return mockKycControllerState;
      },
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

describe('useContinueIdentityVerification', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockKycControllerState.email = 'user@example.com';
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('reports that the identity module can continue', async () => {
    const { result } = renderHook(() =>
      useContinueIdentityVerification(mockOnSuccess),
    );

    await act(result.current.continueToProvider);

    expect(mockOnSuccess).toHaveBeenCalled();
  });

  it('alerts when no email is stored', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation();
    mockKycControllerState.email = null;
    const { result } = renderHook(() =>
      useContinueIdentityVerification(mockOnSuccess),
    );

    await act(result.current.continueToProvider);

    expect(alertSpy).toHaveBeenCalledWith(
      'Identity verification',
      'Email is missing. Go back and enter your email.',
    );
    expect(mockOnSuccess).not.toHaveBeenCalled();
  });

  it('alerts when the module transition rejects', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation();
    mockOnSuccess.mockRejectedValue(new Error('Unable to continue'));
    const { result } = renderHook(() =>
      useContinueIdentityVerification(mockOnSuccess),
    );

    await act(result.current.continueToProvider);

    expect(alertSpy).toHaveBeenCalledWith(
      'Identity verification',
      'Unable to continue',
    );
  });
});
