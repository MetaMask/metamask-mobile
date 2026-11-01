import '../../../../../tests/component-view/mocks';
import { act, fireEvent } from '@testing-library/react-native';
import { MfaError } from '@metamask/profile-sync-controller/sdk';
import Engine from '../../../../core/Engine';
import { strings } from '../../../../../locales/i18n';
import { describeForPlatforms } from '../../../../../tests/component-view/platform';
import {
  renderVbaEmailVerification,
  restoreVbaReduxServiceStore,
} from '../../../../../tests/component-view/renderers/vba';
import { getActiveMfaFlow } from '../../../../util/identity/mfa/engine/activeFlow';
import { MfaFlowSelectorsIDs } from '../../../Views/Mfa/Mfa.testIds';

const EMAIL = 'ada@example.com';
const MASKED_EMAIL = 'a•••@example.com';
const WRONG_CODE = '000000';

const activeEmail = {
  id: 'email_otp',
  type: 'email_otp' as const,
  status: 'active' as const,
  email: EMAIL,
  verified: true,
};

const emailChallenge = (flowId: string) => ({
  type: 'email_otp' as const,
  flowId,
  expiresAt: Date.now() + 60_000,
});

const auth = Engine.context.AuthenticationController as unknown as {
  refreshEnrolledCredentials: jest.Mock;
  beginCredentialEnrollment: jest.Mock;
  completeCredentialEnrollment: jest.Mock;
  beginCredentialVerification: jest.Mock;
  completeCredentialVerification: jest.Mock;
  getVerificationToken: jest.Mock;
  clearVerificationSession: jest.Mock;
};

const kyc = Engine.context.KycController as unknown as {
  getSessionStatusForVendor: jest.Mock;
};

describeForPlatforms('VBA email verification view', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    kyc.getSessionStatusForVendor = jest.fn().mockResolvedValue(null);
    auth.refreshEnrolledCredentials = jest.fn().mockResolvedValue([]);
    auth.beginCredentialEnrollment = jest
      .fn()
      .mockResolvedValue(emailChallenge('enroll-1'));
    auth.completeCredentialEnrollment = jest
      .fn()
      .mockRejectedValue(new MfaError('invalid_code', 'wrong'));
    auth.beginCredentialVerification = jest
      .fn()
      .mockResolvedValue(emailChallenge('verify-1'));
    auth.completeCredentialVerification = jest
      .fn()
      .mockRejectedValue(new MfaError('invalid_code', 'wrong'));
    auth.getVerificationToken = jest.fn().mockResolvedValue(null);
    auth.clearVerificationSession = jest.fn().mockResolvedValue(undefined);
  });

  afterEach(async () => {
    const flow = getActiveMfaFlow();
    if (flow) {
      await act(async () => {
        flow.dispatch({ type: 'cancel' });
      });
    }
    restoreVbaReduxServiceStore();
  });

  it('sends an email code and shows an error for a wrong code', async () => {
    const { findByTestId, getByTestId, getByText } =
      renderVbaEmailVerification();

    fireEvent.press(await findByTestId(MfaFlowSelectorsIDs.PRIMARY_BUTTON));
    fireEvent.changeText(
      await findByTestId(MfaFlowSelectorsIDs.EMAIL_INPUT),
      EMAIL,
    );
    fireEvent.press(getByTestId(MfaFlowSelectorsIDs.PRIMARY_BUTTON));

    expect(
      await findByTestId(`${MfaFlowSelectorsIDs.CONTAINER}-otp`),
    ).toBeOnTheScreen();
    expect(auth.beginCredentialEnrollment).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'email_otp', email: EMAIL }),
    );
    expect(
      getByText(
        strings('mfa.otp.description_with_email', { email: MASKED_EMAIL }),
      ),
    ).toBeOnTheScreen();

    await act(async () => {
      fireEvent.changeText(
        getByTestId(MfaFlowSelectorsIDs.CODE_INPUT),
        WRONG_CODE,
      );
    });

    expect(await findByTestId(MfaFlowSelectorsIDs.ERROR)).toHaveTextContent(
      strings('mfa.errors.invalid_code'),
    );
    expect(auth.completeCredentialEnrollment).toHaveBeenCalledWith(
      expect.objectContaining({
        flowId: 'enroll-1',
        proof: { type: 'email_otp', code: WRONG_CODE },
      }),
    );
  });

  it('resends the code after the first send fails, then rejects a wrong code', async () => {
    auth.refreshEnrolledCredentials.mockResolvedValue([activeEmail]);
    auth.beginCredentialVerification
      .mockRejectedValueOnce(new MfaError('server_error', 'down'))
      .mockResolvedValue(emailChallenge('verify-1'));
    const { findByTestId, getByTestId } = renderVbaEmailVerification();

    expect(
      await findByTestId(MfaFlowSelectorsIDs.RESEND_BUTTON),
    ).toHaveTextContent(strings('mfa.otp.resend'));
    expect(auth.beginCredentialVerification).toHaveBeenCalledTimes(1);
    expect(auth.beginCredentialVerification).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'email_otp' }),
    );

    fireEvent.press(getByTestId(MfaFlowSelectorsIDs.RESEND_BUTTON));

    expect(
      await findByTestId(`${MfaFlowSelectorsIDs.CONTAINER}-otp`),
    ).toBeOnTheScreen();
    expect(auth.beginCredentialVerification).toHaveBeenCalledTimes(2);

    await act(async () => {
      fireEvent.changeText(
        getByTestId(MfaFlowSelectorsIDs.CODE_INPUT),
        WRONG_CODE,
      );
    });

    expect(await findByTestId(MfaFlowSelectorsIDs.ERROR)).toHaveTextContent(
      strings('mfa.errors.invalid_code'),
    );
    expect(auth.completeCredentialVerification).toHaveBeenCalledWith(
      expect.objectContaining({
        flowId: 'verify-1',
        proof: { type: 'email_otp', code: WRONG_CODE },
      }),
    );
  });
});
