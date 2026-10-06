import React from 'react';
import { act, fireEvent, waitFor } from '@testing-library/react-native';
import type {
  EnrolledCredential,
  VerificationToken,
} from '@metamask/profile-sync-controller/sdk';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import {
  getActiveMfaFlow,
  startMfaFlow,
} from '../../../../util/identity/mfa/engine/activeFlow';
import type {
  MfaControllerAdapter,
  MfaFlowRequest,
} from '../../../../util/identity/mfa/engine/types';
import { MfaFlowSelectorsIDs } from '../Mfa.testIds';
import MfaFlowHost from './MfaFlowHost';

const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ goBack: mockGoBack }),
}));

const activeEmail: EnrolledCredential = {
  type: 'email_otp',
  status: 'active',
  email: 'a@b.co',
  verified: true,
};

const createController = (
  initialCredentials: EnrolledCredential[] = [],
): MfaControllerAdapter => {
  let credentials = initialCredentials;
  let session: VerificationToken | null = null;
  return {
    refreshEnrolledCredentials: jest.fn(async () => credentials),
    beginCredentialEnrollment: jest.fn(async () => ({
      type: 'email_otp' as const,
      flowId: 'enroll-1',
      expiresAt: Date.now(),
    })),
    completeCredentialEnrollment: jest.fn(async () => {
      credentials = [activeEmail];
      return credentials;
    }),
    beginCredentialVerification: jest.fn(async () => ({
      type: 'email_otp' as const,
      flowId: 'verify-1',
      expiresAt: Date.now(),
    })),
    completeCredentialVerification: jest.fn(async () => {
      session = {
        accessToken: 'token',
        expiresIn: 900,
        obtainedAt: Date.now(),
        claims: { sub: 'profile', amr: ['email_otp'], exp: 0 },
      };
      return session;
    }),
    getVerificationToken: jest.fn(async () => session),
    clearVerificationSession: jest.fn(async () => {
      session = null;
    }),
  };
};

const start = async (
  request: MfaFlowRequest,
  controller: MfaControllerAdapter,
) => {
  const outcome = startMfaFlow({
    request,
    reason: { operation: 'test', description: 'Why we ask' },
    platform: 'mobile',
    controller,
  }).then(
    (value) => ({ ok: true as const, value }),
    (error) => ({ ok: false as const, code: error.mfaCode }),
  );
  await act(async () => undefined);
  return { outcome };
};

const renderHost = () => renderWithProvider(<MfaFlowHost />, { state: {} });

describe('MfaFlowHost', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await act(async () => getActiveMfaFlow()?.dispatch({ type: 'cancel' }));
  });

  it('runs email setup from entry to success and resolves', async () => {
    const controller = createController();
    const { outcome } = await start(
      { kind: 'enroll', method: 'email_otp' },
      controller,
    );
    const { getByTestId } = renderHost();

    expect(
      getByTestId(`${MfaFlowSelectorsIDs.CONTAINER}-emailEntry`),
    ).toBeOnTheScreen();
    fireEvent.changeText(
      getByTestId(MfaFlowSelectorsIDs.EMAIL_INPUT),
      ' new@b.co ',
    );
    await act(async () => {
      fireEvent.press(getByTestId(MfaFlowSelectorsIDs.PRIMARY_BUTTON));
    });

    expect(controller.beginCredentialEnrollment).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'email_otp', email: 'new@b.co' }),
    );
    expect(
      getByTestId(`${MfaFlowSelectorsIDs.CONTAINER}-otp`),
    ).toBeOnTheScreen();

    await act(async () => {
      fireEvent.changeText(
        getByTestId(MfaFlowSelectorsIDs.CODE_INPUT),
        '123456',
      );
    });

    expect(controller.completeCredentialEnrollment).toHaveBeenCalledWith(
      expect.objectContaining({
        flowId: 'enroll-1',
        proof: { type: 'email_otp', code: '123456' },
      }),
    );
    expect(
      getByTestId(`${MfaFlowSelectorsIDs.CONTAINER}-success`),
    ).toBeOnTheScreen();

    await act(async () => {
      fireEvent.press(getByTestId(MfaFlowSelectorsIDs.PRIMARY_BUTTON));
    });

    expect(await outcome).toEqual({
      ok: true,
      value: { credentials: [activeEmail] },
    });
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('shows the intro, sets up email, then verifies it and returns the token', async () => {
    const controller = createController();
    const { outcome } = await start(
      {
        kind: 'verifyOrEnroll',
        methods: ['email_otp'],
        verifyWith: 'email_otp',
      },
      controller,
    );
    const { getByTestId, getByText } = renderHost();

    expect(getByText('Why we ask')).toBeOnTheScreen();
    await act(async () => {
      fireEvent.press(getByTestId(MfaFlowSelectorsIDs.PRIMARY_BUTTON));
    });
    fireEvent.changeText(
      getByTestId(MfaFlowSelectorsIDs.EMAIL_INPUT),
      'a@b.co',
    );
    await act(async () => {
      fireEvent.press(getByTestId(MfaFlowSelectorsIDs.PRIMARY_BUTTON));
    });
    await act(async () => {
      fireEvent.changeText(
        getByTestId(MfaFlowSelectorsIDs.CODE_INPUT),
        '111111',
      );
    });

    expect(getByTestId(MfaFlowSelectorsIDs.CODE_INPUT).props.value).toBe('');
    await act(async () => {
      fireEvent.changeText(
        getByTestId(MfaFlowSelectorsIDs.CODE_INPUT),
        '222222',
      );
    });

    expect(controller.completeCredentialVerification).toHaveBeenCalledWith(
      expect.objectContaining({
        flowId: 'verify-1',
        proof: { type: 'email_otp', code: '222222' },
      }),
    );
    expect(
      getByTestId(`${MfaFlowSelectorsIDs.CONTAINER}-success`),
    ).toBeOnTheScreen();
    await act(async () => {
      fireEvent.press(getByTestId(MfaFlowSelectorsIDs.PRIMARY_BUTTON));
    });

    const result = await outcome;
    expect(result.ok && result.value.token?.claims.amr).toEqual(['email_otp']);
  });

  it('rejects with flow_cancelled when the user closes it', async () => {
    const { outcome } = await start(
      { kind: 'enroll', method: 'email_otp' },
      createController(),
    );
    const { getByTestId } = renderHost();

    await act(async () => {
      fireEvent.press(getByTestId(MfaFlowSelectorsIDs.CLOSE_BUTTON));
    });

    expect(await outcome).toEqual({ ok: false, code: 'flow_cancelled' });
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('cancels the flow when the screen goes away', async () => {
    const { outcome } = await start(
      { kind: 'enroll', method: 'email_otp' },
      createController(),
    );
    const { unmount } = renderHost();

    await act(async () => unmount());

    expect(await outcome).toEqual({ ok: false, code: 'flow_cancelled' });
  });

  it('closes itself when no flow is running', async () => {
    renderHost();

    await waitFor(() => expect(mockGoBack).toHaveBeenCalledTimes(1));
  });
});
