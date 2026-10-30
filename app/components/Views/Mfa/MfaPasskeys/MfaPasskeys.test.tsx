import React from 'react';
import { act, fireEvent } from '@testing-library/react-native';
import type { EnrolledCredential } from '@metamask/profile-sync-controller/sdk';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../util/test/initial-root-state';
import Routes from '../../../../constants/navigation/Routes';
import { ToastContext } from '../../../../component-library/components/Toast';
import { startMfaFlow } from '../../../../util/identity/mfa/engine/activeFlow';
import { MfaPasskeysSelectorsIDs } from '../Mfa.testIds';
import MfaPasskeys from './MfaPasskeys';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ goBack: jest.fn(), navigate: mockNavigate }),
}));

jest.mock('../../../../util/identity/mfa/engine/activeFlow', () => ({
  startMfaFlow: jest.fn(),
}));

const mockStartMfaFlow = jest.mocked(startMfaFlow);
const mockShowToast = jest.fn();

const renderPasskeys = (enrolledCredentials: EnrolledCredential[]) =>
  renderWithProvider(
    <ToastContext.Provider
      value={{
        toastRef: {
          current: { showToast: mockShowToast, closeToast: jest.fn() },
        },
      }}
    >
      <MfaPasskeys />
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

describe('MfaPasskeys', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStartMfaFlow.mockResolvedValue({ credentials: [] });
  });

  it('lists the active passkeys and opens one', () => {
    const { getByText, getByTestId, queryByTestId } = renderPasskeys([
      {
        id: 'passkey',
        type: 'passkey',
        status: 'active',
        displayName: '1Password',
      },
      {
        id: 'email_otp',
        type: 'email_otp',
        status: 'active',
        email: 'a@b.co',
        verified: true,
      },
      {
        id: 'passkey',
        type: 'passkey',
        status: 'active',
        enrolledAt: new Date(2026, 8, 17, 11, 23).getTime(),
      },
    ]);

    expect(getByText('Passkey #1 - 1Password')).toBeOnTheScreen();
    expect(getByText('Passkey #2')).toBeOnTheScreen();
    expect(getByText('Added Sep 17, 2026 at 11:23 AM')).toBeOnTheScreen();
    expect(queryByTestId(`${MfaPasskeysSelectorsIDs.ROW}-2`)).toBeNull();

    fireEvent.press(getByTestId(`${MfaPasskeysSelectorsIDs.ROW}-1`));
    expect(mockNavigate).toHaveBeenCalledWith(Routes.MFA.METHOD_DETAILS, {
      method: 'passkey',
      index: 1,
    });
  });

  it('adds a passkey', async () => {
    const { getByTestId } = renderPasskeys([]);

    await act(async () => {
      fireEvent.press(getByTestId(MfaPasskeysSelectorsIDs.ADD_BUTTON));
    });

    expect(mockStartMfaFlow).toHaveBeenCalledWith(
      expect.objectContaining({
        request: { kind: 'enroll', method: 'passkey' },
        reason: { operation: 'settings.addPasskey' },
      }),
    );
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        labelOptions: [{ label: 'Passkey added' }],
      }),
    );
  });

  it('stays put when adding a passkey fails', async () => {
    mockStartMfaFlow.mockRejectedValue(new Error('cancelled'));
    const { getByTestId } = renderPasskeys([]);

    await act(async () => {
      fireEvent.press(getByTestId(MfaPasskeysSelectorsIDs.ADD_BUTTON));
    });

    expect(getByTestId(MfaPasskeysSelectorsIDs.CONTAINER)).toBeOnTheScreen();
  });
});
