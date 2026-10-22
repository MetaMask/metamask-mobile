import React from 'react';
import { act, fireEvent } from '@testing-library/react-native';
import { StackActions } from '@react-navigation/native';
import type { EnrolledCredential } from '@metamask/profile-sync-controller/sdk';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../util/test/initial-root-state';
import Routes from '../../../../constants/navigation/Routes';
import { ToastContext } from '../../../../component-library/components/Toast';
import { MfaFlowError } from '../../../../util/identity/mfa/engine/errors';
import { startMfaFlow } from '../../../../util/identity/mfa/engine/activeFlow';
import { mobileMfaControllerAdapter } from '../../../../util/identity/mfa/bindings';
import { removeMfaCredential } from '../../../../util/identity/mfa/removeMfaCredential';
import type { MfaMethod } from '../../../../util/identity/mfa/engine/types';
import { MfaMethodDetailsSelectorsIDs } from '../Mfa.testIds';
import MfaMethodDetails from './MfaMethodDetails';

const mockDispatch = jest.fn();
let mockParams: { method: MfaMethod; index: number };
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ goBack: jest.fn(), dispatch: mockDispatch }),
  useRoute: () => ({ params: mockParams }),
}));

jest.mock('@metamask/design-system-react-native', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    ...jest.requireActual('@metamask/design-system-react-native'),
    BottomSheet: ReactActual.forwardRef(
      (
        {
          children,
          testID,
          onClose,
        }: {
          children?: React.ReactNode;
          testID?: string;
          onClose?: () => void;
        },
        ref: React.ForwardedRef<unknown>,
      ) => {
        ReactActual.useImperativeHandle(ref, () => ({
          onCloseBottomSheet: (callback?: () => void) => {
            onClose?.();
            callback?.();
          },
        }));
        return <View testID={testID}>{children}</View>;
      },
    ),
  };
});

jest.mock('../../../../util/identity/mfa/engine/activeFlow', () => ({
  startMfaFlow: jest.fn(),
}));

jest.mock('../../../../util/identity/mfa/bindings', () => ({
  mobileMfaControllerAdapter: { refreshEnrolledCredentials: jest.fn() },
}));

jest.mock('../../../../util/identity/mfa/removeMfaCredential', () => ({
  removeMfaCredential: jest.fn(),
}));

const mockStartMfaFlow = jest.mocked(startMfaFlow);
const mockRefresh = jest.mocked(
  mobileMfaControllerAdapter.refreshEnrolledCredentials,
);
const mockRemove = jest.mocked(removeMfaCredential);
const mockShowToast = jest.fn();

const token = {
  accessToken: 'token',
  expiresIn: 3600,
  obtainedAt: 0,
  claims: { sub: 'profile', amr: ['email_otp'], exp: 0 },
};
const email: EnrolledCredential = {
  type: 'email_otp',
  status: 'active',
  email: 'a@b.co',
  verified: true,
  enrolledAt: new Date(2026, 8, 17, 11, 23).getTime(),
};
const passkey: EnrolledCredential = {
  type: 'passkey',
  status: 'active',
  displayName: '1Password',
};

const renderDetails = (
  params: { method: MfaMethod; index: number },
  enrolledCredentials: EnrolledCredential[],
) => {
  mockParams = params;
  return renderWithProvider(
    <ToastContext.Provider
      value={{
        toastRef: {
          current: { showToast: mockShowToast, closeToast: jest.fn() },
        },
      }}
    >
      <MfaMethodDetails />
    </ToastContext.Provider>,
    {
      state: {
        engine: {
          backgroundState: {
            ...backgroundState,
            AuthenticationController: {
              ...backgroundState.AuthenticationController,
              enrolledCredentials,
            },
          },
        },
      },
    },
  );
};

const confirmRemoval = async (
  getByTestId: ReturnType<typeof renderDetails>['getByTestId'],
) => {
  fireEvent.press(getByTestId(MfaMethodDetailsSelectorsIDs.REMOVE_BUTTON));
  await act(async () => {
    fireEvent.press(getByTestId(MfaMethodDetailsSelectorsIDs.CONFIRM_BUTTON));
  });
};

describe('MfaMethodDetails', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStartMfaFlow.mockResolvedValue({ credentials: [], token });
    mockRefresh.mockResolvedValue([]);
    mockRemove.mockResolvedValue();
  });

  it('describes the email and what it protects', () => {
    const { getByText } = renderDetails({ method: 'email_otp', index: 0 }, [
      email,
    ]);

    expect(getByText('a•••@b.co')).toBeOnTheScreen();
    expect(getByText('Added Sep 17, 2026 at 11:23 AM')).toBeOnTheScreen();
    expect(getByText('Verifying Money transactions')).toBeOnTheScreen();
  });

  it('describes an authenticator app without an app name', () => {
    const { getAllByText, getByText } = renderDetails(
      { method: 'totp', index: 0 },
      [{ type: 'totp', status: 'active' }],
    );

    // The header and the card both say what it is: the server cannot know
    // which app the user picked.
    expect(getAllByText('Authenticator app')).toHaveLength(2);
    expect(getByText('Verifying Money transactions')).toBeOnTheScreen();
  });

  it('removes an authenticator app after verifying with another method', async () => {
    const authenticatorApp: EnrolledCredential = {
      type: 'totp',
      status: 'active',
    };
    const { getByTestId } = renderDetails({ method: 'totp', index: 0 }, [
      email,
      authenticatorApp,
    ]);

    await confirmRemoval(getByTestId);

    expect(mockStartMfaFlow).toHaveBeenCalledWith(
      expect.objectContaining({
        request: expect.objectContaining({ verifyWith: ['email_otp'] }),
        reason: { operation: 'settings.removeAuthenticatorApp' },
      }),
    );
    expect(mockRemove).toHaveBeenCalledWith(authenticatorApp, token);
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        labelOptions: [{ label: 'Authenticator app removed' }],
      }),
    );
  });

  it('names the passkey by its position', () => {
    const { getByText } = renderDetails({ method: 'passkey', index: 1 }, [
      { type: 'passkey', status: 'active' },
      passkey,
    ]);

    expect(getByText('Passkey #2 - 1Password')).toBeOnTheScreen();
  });

  it('renders nothing once the method is gone', () => {
    const { queryByTestId } = renderDetails(
      { method: 'passkey', index: 0 },
      [],
    );

    expect(queryByTestId(MfaMethodDetailsSelectorsIDs.CONTAINER)).toBeNull();
  });

  it('refuses to remove the last method', () => {
    const { getByTestId, getByText, queryByTestId } = renderDetails(
      { method: 'passkey', index: 0 },
      [passkey],
    );

    fireEvent.press(getByTestId(MfaMethodDetailsSelectorsIDs.REMOVE_BUTTON));
    expect(getByText('Passkey can’t be deleted')).toBeOnTheScreen();

    fireEvent.press(getByText('Got it'));
    expect(
      queryByTestId(MfaMethodDetailsSelectorsIDs.LAST_METHOD_SHEET),
    ).toBeNull();
    expect(mockStartMfaFlow).not.toHaveBeenCalled();
  });

  it('closes the confirmation on cancel', () => {
    const { getByTestId, getByText, queryByTestId } = renderDetails(
      { method: 'email_otp', index: 0 },
      [email, passkey],
    );

    fireEvent.press(getByTestId(MfaMethodDetailsSelectorsIDs.REMOVE_BUTTON));
    fireEvent.press(getByText('Cancel'));

    expect(
      queryByTestId(MfaMethodDetailsSelectorsIDs.CONFIRM_SHEET),
    ).toBeNull();
    expect(mockStartMfaFlow).not.toHaveBeenCalled();
  });

  it('removes the email after a fresh verification with the other methods', async () => {
    const { getByTestId } = renderDetails({ method: 'email_otp', index: 0 }, [
      email,
      passkey,
      { ...passkey, displayName: undefined },
    ]);

    await confirmRemoval(getByTestId);

    expect(mockStartMfaFlow).toHaveBeenCalledWith(
      expect.objectContaining({
        request: expect.objectContaining({
          kind: 'verifyOrEnroll',
          methods: ['passkey'],
          verifyWith: ['passkey'],
        }),
        reason: { operation: 'settings.removeEmail' },
      }),
    );
    expect(mockRemove).toHaveBeenCalledWith(email, token);
    expect(mockRefresh).toHaveBeenCalledTimes(1);
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        labelOptions: [{ label: 'Email verification removed' }],
      }),
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      StackActions.popTo(Routes.MFA.SETTINGS),
    );
  });

  it('verifies with another passkey to remove one', async () => {
    const other = { ...passkey, displayName: 'iCloud' };
    const { getByTestId } = renderDetails({ method: 'passkey', index: 0 }, [
      passkey,
      other,
    ]);

    await confirmRemoval(getByTestId);

    expect(mockStartMfaFlow).toHaveBeenCalledWith(
      expect.objectContaining({
        request: expect.objectContaining({ verifyWith: ['passkey'] }),
        reason: { operation: 'settings.removePasskey' },
      }),
    );
    expect(mockRemove).toHaveBeenCalledWith(passkey, token);
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        labelOptions: [{ label: 'Passkey removed' }],
      }),
    );
  });

  it('stays quiet when the verification is cancelled', async () => {
    mockStartMfaFlow.mockRejectedValue(new MfaFlowError('flow_cancelled'));
    const { getByTestId } = renderDetails({ method: 'email_otp', index: 0 }, [
      email,
      passkey,
    ]);

    await confirmRemoval(getByTestId);

    expect(mockRemove).not.toHaveBeenCalled();
    expect(mockShowToast).not.toHaveBeenCalled();
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('says so when the removal fails', async () => {
    mockRemove.mockRejectedValue(new Error('not supported'));
    const { getByTestId } = renderDetails({ method: 'email_otp', index: 0 }, [
      email,
      passkey,
    ]);

    await confirmRemoval(getByTestId);

    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        labelOptions: [
          { label: 'Couldn’t remove this method. Try again later.' },
        ],
      }),
    );
    expect(mockDispatch).not.toHaveBeenCalled();
    expect(
      getByTestId(MfaMethodDetailsSelectorsIDs.REMOVE_BUTTON),
    ).toBeOnTheScreen();
  });
});
