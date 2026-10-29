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

jest.mock('../../../../util/identity/mfa/removeMfaCredential', () => ({
  removeMfaCredential: jest.fn(),
}));

const mockStartMfaFlow = jest.mocked(startMfaFlow);
const mockRemove = jest.mocked(removeMfaCredential);
const mockShowToast = jest.fn();

const token = {
  accessToken: 'token',
  expiresIn: 3600,
  obtainedAt: 0,
  claims: { sub: 'profile', amr: ['email_otp'], exp: 0 },
};
const email: EnrolledCredential = {
  id: 'email_otp',
  type: 'email_otp',
  status: 'active',
  email: 'a@b.co',
  verified: true,
  enrolledAt: new Date(2026, 8, 17, 11, 23).getTime(),
};
const passkey: EnrolledCredential = {
  id: 'passkey-id',
  type: 'passkey',
  status: 'active',
  displayName: '1Password',
};
const totpCredential: EnrolledCredential = {
  id: 'totp',
  type: 'totp',
  status: 'active',
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

  it.each([
    ['passkey', passkey, email, 'Remove passkey'],
    ['email_otp', email, passkey, 'Remove email'],
    ['totp', totpCredential, email, 'Remove authenticator app'],
  ] as const)(
    'centers the %s removal confirmation title',
    (method, credential, otherCredential, title) => {
      const { getByTestId, getAllByText } = renderDetails(
        { method, index: 0 },
        [credential, otherCredential],
      );

      fireEvent.press(getByTestId(MfaMethodDetailsSelectorsIDs.REMOVE_BUTTON));

      expect(
        getAllByText(title).some((node) =>
          JSON.stringify(node.props.style).includes('"center"'),
        ),
      ).toBe(true);
    },
  );

  it.each([
    ['passkey', passkey, 'Passkey can’t be deleted'],
    ['email_otp', email, 'Email can’t be removed'],
    ['totp', totpCredential, 'Authenticator app can’t be removed'],
  ] as const)(
    'centers the last %s method title',
    (method, credential, title) => {
      const { getByTestId, getByText } = renderDetails({ method, index: 0 }, [
        credential,
      ]);

      fireEvent.press(getByTestId(MfaMethodDetailsSelectorsIDs.REMOVE_BUTTON));

      expect(JSON.stringify(getByText(title).props.style)).toContain(
        '"center"',
      );
    },
  );

  it('describes an authenticator app without an app name', () => {
    const { getAllByText, getByText } = renderDetails(
      { method: 'totp', index: 0 },
      [{ id: 'totp', type: 'totp', status: 'active' }],
    );

    // The header and the card both say what it is: the server cannot know
    // which app the user picked.
    expect(getAllByText('Authenticator app')).toHaveLength(2);
    expect(getByText('Verifying Money transactions')).toBeOnTheScreen();
  });

  it('removes an authenticator app after verifying with another method', async () => {
    const authenticatorApp: EnrolledCredential = {
      id: 'totp',
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
    expect(mockRemove).toHaveBeenCalledWith(authenticatorApp, {
      operation: 'settings.removeAuthenticatorApp',
    });
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        labelOptions: [{ label: 'Authenticator app removed' }],
      }),
    );
  });

  it('names the passkey by its position', () => {
    const { getByText } = renderDetails({ method: 'passkey', index: 1 }, [
      { id: 'first-passkey-id', type: 'passkey', status: 'active' },
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

  it('refuses to remove a passkey when only passkeys are left', () => {
    const other = { ...passkey, id: 'icloud-id', displayName: 'iCloud' };
    const { getByTestId, getByText } = renderDetails(
      { method: 'passkey', index: 0 },
      [passkey, other],
    );

    fireEvent.press(getByTestId(MfaMethodDetailsSelectorsIDs.REMOVE_BUTTON));

    expect(
      getByTestId(MfaMethodDetailsSelectorsIDs.LAST_METHOD_SHEET),
    ).toBeOnTheScreen();
    expect(
      getByText(
        'Passkeys can only be removed after verifying with another type of method. Add an email or authenticator app first.',
      ),
    ).toBeOnTheScreen();
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
      { ...passkey, id: 'other-passkey-id', displayName: undefined },
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
    expect(mockRemove).toHaveBeenCalledWith(email, {
      operation: 'settings.removeEmail',
    });
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        labelOptions: [{ label: 'Email verification removed' }],
      }),
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      StackActions.popTo(Routes.MFA.SETTINGS),
    );
  });

  it('verifies with another type of method to remove a passkey', async () => {
    const other = { ...passkey, id: 'icloud-id', displayName: 'iCloud' };
    const { getByTestId } = renderDetails({ method: 'passkey', index: 0 }, [
      passkey,
      other,
      email,
    ]);

    await confirmRemoval(getByTestId);

    expect(mockStartMfaFlow).toHaveBeenCalledWith(
      expect.objectContaining({
        request: expect.objectContaining({ verifyWith: ['email_otp'] }),
        reason: { operation: 'settings.removePasskey' },
      }),
    );
    expect(mockRemove).toHaveBeenCalledWith(passkey, {
      operation: 'settings.removePasskey',
    });
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
