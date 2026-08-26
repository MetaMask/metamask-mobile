import { toast } from '@metamask/design-system-react-native';
import { withBiometricAuth } from './withBiometricAuth';
import { ReauthenticateErrorType } from '../../../../core/Authentication/types';

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  return {
    ...actual,
    toast: Object.assign(jest.fn(), { dismiss: jest.fn() }),
  };
});

jest.mock('../components/PasswordBottomSheet', () => ({
  createPasswordBottomSheetNavigationDetails: jest.fn(
    (params: { onSuccess: () => void; description?: string }) => [
      'Card.PasswordBottomSheet',
      params,
    ],
  ),
}));

import { createPasswordBottomSheetNavigationDetails } from '../components/PasswordBottomSheet';

const mockCreatePasswordSheet =
  createPasswordBottomSheetNavigationDetails as jest.Mock;

function makeParams(overrides = {}) {
  return {
    reauthenticate: jest.fn(),
    navigation: { navigate: jest.fn() },
    onSuccess: jest.fn(),
    ...overrides,
  };
}

describe('withBiometricAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls onSuccess when reauthenticate resolves', async () => {
    const params = makeParams();
    (params.reauthenticate as jest.Mock).mockResolvedValue(undefined);

    await withBiometricAuth(params);

    expect(params.onSuccess).toHaveBeenCalledTimes(1);
    expect(params.navigation.navigate).not.toHaveBeenCalled();
  });

  it('navigates to password sheet on PASSWORD_NOT_SET_WITH_BIOMETRICS error', async () => {
    const params = makeParams();
    (params.reauthenticate as jest.Mock).mockRejectedValue(
      new Error(ReauthenticateErrorType.PASSWORD_NOT_SET_WITH_BIOMETRICS),
    );

    await withBiometricAuth(params);

    expect(params.navigation.navigate).toHaveBeenCalledTimes(1);
    expect(params.onSuccess).not.toHaveBeenCalled();
  });

  it('threads passwordDescription into the password sheet navigation details', async () => {
    const params = makeParams({
      passwordDescription: 'Please enter your password',
    });
    (params.reauthenticate as jest.Mock).mockRejectedValue(
      new Error(ReauthenticateErrorType.PASSWORD_NOT_SET_WITH_BIOMETRICS),
    );

    await withBiometricAuth(params);

    expect(mockCreatePasswordSheet).toHaveBeenCalledWith(
      expect.objectContaining({
        description: 'Please enter your password',
      }),
    );
  });

  it('returns silently on BIOMETRIC_ERROR without navigation or toast', async () => {
    const params = makeParams();
    (params.reauthenticate as jest.Mock).mockRejectedValue(
      new Error(ReauthenticateErrorType.BIOMETRIC_ERROR),
    );

    await withBiometricAuth(params);

    expect(params.navigation.navigate).not.toHaveBeenCalled();
    expect(toast).not.toHaveBeenCalled();
    expect(params.onSuccess).not.toHaveBeenCalled();
  });

  it('shows a warning toast on unknown errors', async () => {
    const params = makeParams();
    (params.reauthenticate as jest.Mock).mockRejectedValue(
      new Error('Some unexpected error'),
    );

    await withBiometricAuth(params);

    expect(toast).toHaveBeenCalledTimes(1);
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'warning',
        hasNoTimeout: false,
        showCloseButton: false,
      }),
    );
    expect(params.onSuccess).not.toHaveBeenCalled();
  });
});
