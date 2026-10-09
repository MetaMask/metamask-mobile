import React from 'react';
import { act } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import Routes from '../../../../constants/navigation/Routes';
import {
  getActiveMfaFlow,
  startMfaFlow,
} from '../../../../util/identity/mfa/engine/activeFlow';
import type {
  MfaControllerAdapter,
  MfaFlowRequest,
} from '../../../../util/identity/mfa/engine/types';
import MfaFlowLauncher from './MfaFlowLauncher';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate }),
}));

const controller = {
  refreshEnrolledCredentials: jest.fn(),
  getVerificationToken: jest.fn(async () => null),
  clearVerificationSession: jest.fn(),
} as unknown as jest.Mocked<MfaControllerAdapter>;

const start = (request: MfaFlowRequest) =>
  startMfaFlow({
    request,
    reason: { operation: 'test' },
    platform: 'mobile',
    controller,
  }).catch(() => undefined);

describe('MfaFlowLauncher', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await act(async () => getActiveMfaFlow()?.dispatch({ type: 'cancel' }));
  });

  it('opens the flow screen once when a flow shows a screen', async () => {
    controller.refreshEnrolledCredentials.mockResolvedValue([]);
    renderWithProvider(<MfaFlowLauncher />, { state: {} });

    await act(async () => {
      start({ kind: 'enroll', method: 'email_otp' });
    });

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith(Routes.MFA.FLOW, {
      flowId: expect.any(String),
    });
  });

  it('opens a separate modal for each flow', async () => {
    controller.refreshEnrolledCredentials.mockResolvedValue([]);
    renderWithProvider(<MfaFlowLauncher />, { state: {} });

    await act(async () => {
      start({ kind: 'enroll', method: 'email_otp' });
    });
    await act(async () => getActiveMfaFlow()?.dispatch({ type: 'cancel' }));
    await act(async () => {
      start({ kind: 'enroll', method: 'email_otp' });
    });

    expect(mockNavigate).toHaveBeenCalledTimes(2);
    const [[, firstParams], [, secondParams]] = mockNavigate.mock.calls;
    expect(firstParams.flowId).not.toBe(secondParams.flowId);
  });

  it('stays closed when the flow settles without a screen', async () => {
    controller.refreshEnrolledCredentials.mockResolvedValue([
      { type: 'email_otp', status: 'active', email: 'a@b.co', verified: true },
    ]);
    renderWithProvider(<MfaFlowLauncher />, { state: {} });

    await act(async () => {
      await start({ kind: 'verifyOrEnroll', methods: ['email_otp'] });
    });

    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
