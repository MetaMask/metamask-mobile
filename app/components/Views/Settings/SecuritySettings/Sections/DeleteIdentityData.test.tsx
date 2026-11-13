import React from 'react';
import { Alert } from 'react-native';
import { act, fireEvent, waitFor } from '@testing-library/react-native';
import type { KycSessionStatus } from '@metamask/kyc-controller';
import DeleteIdentityData from './DeleteIdentityData';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import Engine from '../../../../../core/Engine';
import Logger from '../../../../../util/Logger';
import { MfaFlowError } from '../../../../../util/identity/mfa/engine/errors';
import { selectKycSessionStatus } from '../../../../../selectors/kycController';
import { selectNeobankMarkets } from '../../../../../selectors/featureFlagController/moneyAccount';
import { strings } from '../../../../../../locales/i18n';
import { SECURITY_SETTINGS_DELETE_IDENTITY_DATA_BUTTON } from '../SecuritySettings.constants';

jest.mock('../../../../../core/Engine', () => ({
  context: {
    KycController: { deleteEncryptedStorage: jest.fn() },
  },
}));

const mockVerifyOrEnroll = jest.fn();

jest.mock('../../../../../util/identity/mfa', () => ({
  useMfa: () => ({
    credentials: [],
    verifyOrEnroll: mockVerifyOrEnroll,
    enroll: jest.fn(),
  }),
}));

jest.mock('../../../../../util/Logger', () => ({
  __esModule: true,
  default: { error: jest.fn() },
}));

jest.mock('../../../../../selectors/kycController', () => ({
  selectKycSessionStatus: jest.fn(),
}));

jest.mock(
  '../../../../../selectors/featureFlagController/moneyAccount',
  () => ({
    selectNeobankMarkets: jest.fn(),
  }),
);

const mockDeleteEncryptedStorage = jest.mocked(
  Engine.context.KycController.deleteEncryptedStorage,
);
const mockSelectKycSessionStatus = jest.mocked(selectKycSessionStatus);
const mockSelectNeobankMarkets = jest.mocked(selectNeobankMarkets);

const AAL2_TOKEN = 'aal2-token';

const SESSION_STATUS = {
  id: 'session-1',
  finalStatus: 'approved',
  externalUserId: 'external-user-1',
  kycStatus: 'approved',
  vendor: 'moonpay',
  vendorStatus: 'approved',
} as KycSessionStatus;

const arrange = ({
  isFlagEnabled = true,
  hasSession = true,
}: { isFlagEnabled?: boolean; hasSession?: boolean } = {}) => {
  mockSelectKycSessionStatus.mockReturnValue(
    hasSession ? SESSION_STATUS : null,
  );
  mockSelectNeobankMarkets.mockReturnValue(
    isFlagEnabled ? [{ currency: 'BRL', regions: ['BR'] }] : [],
  );

  return renderWithProvider(<DeleteIdentityData />);
};

describe('DeleteIdentityData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockVerifyOrEnroll.mockResolvedValue({
      token: { accessToken: AAL2_TOKEN },
    });
  });

  it('renders the delete section when verification has started', () => {
    const { getByText, getByTestId } = arrange();

    expect(
      getByText(strings('identity_verification.delete_section_title')),
    ).toBeOnTheScreen();
    expect(
      getByText(strings('identity_verification.delete_section_description')),
    ).toBeOnTheScreen();
    expect(
      getByTestId(SECURITY_SETTINGS_DELETE_IDENTITY_DATA_BUTTON),
    ).toBeOnTheScreen();
  });

  it('renders nothing when the customer has no KYC session', () => {
    const { queryByText } = arrange({ hasSession: false });

    expect(
      queryByText(strings('identity_verification.delete_section_title')),
    ).toBeNull();
  });

  it('renders nothing when the feature flag is off', () => {
    const { queryByText } = arrange({ isFlagEnabled: false });

    expect(
      queryByText(strings('identity_verification.delete_section_title')),
    ).toBeNull();
  });

  describe('deleting identity data', () => {
    const pressDelete = (
      getByTestId: ReturnType<typeof arrange>['getByTestId'],
    ) => {
      const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation();
      fireEvent.press(
        getByTestId(SECURITY_SETTINGS_DELETE_IDENTITY_DATA_BUTTON),
      );
      const buttons = alertSpy.mock.calls[0][2] ?? [];
      const confirm = buttons.find((button) => button.style === 'destructive');
      const cancel = buttons.find((button) => button.style === 'cancel');
      return { alertSpy, confirm, cancel };
    };

    it('asks for confirmation without deleting yet', () => {
      const { getByTestId } = arrange();

      const { alertSpy } = pressDelete(getByTestId);

      expect(alertSpy).toHaveBeenCalledWith(
        strings('identity_verification.delete_confirm_title'),
        strings('identity_verification.delete_confirm_message'),
        expect.any(Array),
      );
      expect(mockVerifyOrEnroll).not.toHaveBeenCalled();
      expect(mockDeleteEncryptedStorage).not.toHaveBeenCalled();
    });

    it('does not delete when the confirmation is cancelled', () => {
      const { getByTestId } = arrange();
      const { cancel } = pressDelete(getByTestId);

      act(() => {
        cancel?.onPress?.();
      });

      expect(mockDeleteEncryptedStorage).not.toHaveBeenCalled();
    });

    it('deletes the encrypted storage once confirmed and reports success', async () => {
      mockDeleteEncryptedStorage.mockResolvedValue(undefined);
      const { getByTestId } = arrange();
      const { alertSpy, confirm } = pressDelete(getByTestId);

      act(() => {
        confirm?.onPress?.();
      });

      await waitFor(() =>
        expect(alertSpy).toHaveBeenLastCalledWith(
          strings('identity_verification.delete_success_title'),
          strings('identity_verification.delete_success_message'),
        ),
      );
      expect(mockVerifyOrEnroll).toHaveBeenCalledWith({
        methods: ['email_otp'],
        verifyWith: 'email_otp',
        reason: { operation: 'ukyc.deleteData' },
      });
      expect(mockDeleteEncryptedStorage).toHaveBeenCalledWith({
        aal2Token: AAL2_TOKEN,
      });
    });

    it('does nothing when the customer cancels email verification', async () => {
      mockVerifyOrEnroll.mockRejectedValue(new MfaFlowError('flow_cancelled'));
      const { getByTestId } = arrange();
      const { alertSpy, confirm } = pressDelete(getByTestId);

      await act(async () => {
        await confirm?.onPress?.();
      });

      expect(alertSpy).toHaveBeenCalledTimes(1);
      expect(mockDeleteEncryptedStorage).not.toHaveBeenCalled();
      expect(Logger.error).not.toHaveBeenCalled();
    });

    it('reports the MFA error when email verification fails', async () => {
      const error = new MfaFlowError('too_many_attempts');
      mockVerifyOrEnroll.mockRejectedValue(error);
      const { getByTestId } = arrange();
      const { alertSpy, confirm } = pressDelete(getByTestId);

      act(() => {
        confirm?.onPress?.();
      });

      await waitFor(() =>
        expect(alertSpy).toHaveBeenLastCalledWith(
          strings('identity_verification.delete_error_title'),
          strings('identity_verification.delete_error_message'),
        ),
      );
      expect(mockDeleteEncryptedStorage).not.toHaveBeenCalled();
      expect(Logger.error).toHaveBeenCalledWith(error, expect.any(String));
    });

    it('does not delete when MFA returns no token', async () => {
      mockVerifyOrEnroll.mockResolvedValue({});
      const { getByTestId } = arrange();
      const { alertSpy, confirm } = pressDelete(getByTestId);

      act(() => {
        confirm?.onPress?.();
      });

      await waitFor(() =>
        expect(alertSpy).toHaveBeenLastCalledWith(
          strings('identity_verification.delete_error_title'),
          strings('identity_verification.delete_error_message'),
        ),
      );
      expect(mockDeleteEncryptedStorage).not.toHaveBeenCalled();
    });

    it('logs and reports an error when deletion fails', async () => {
      const error = new Error('boom');
      mockDeleteEncryptedStorage.mockRejectedValue(error);
      const { getByTestId } = arrange();
      const { alertSpy, confirm } = pressDelete(getByTestId);

      act(() => {
        confirm?.onPress?.();
      });

      await waitFor(() =>
        expect(alertSpy).toHaveBeenLastCalledWith(
          strings('identity_verification.delete_error_title'),
          strings('identity_verification.delete_error_message'),
        ),
      );
      expect(Logger.error).toHaveBeenCalledWith(error, expect.any(String));
    });
  });
});
