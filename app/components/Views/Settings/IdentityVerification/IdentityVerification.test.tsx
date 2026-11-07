import React from 'react';
import { Alert } from 'react-native';
import { act, fireEvent, waitFor, within } from '@testing-library/react-native';
import type { KycDataShare } from '@metamask/kyc-controller';
import IdentityVerification from './IdentityVerification';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { CommonSelectorsIDs } from '../../../../util/Common.testIds';
import { strings } from '../../../../../locales/i18n';
import { formatTimestampToDateTime } from '../../../../util/date';
import { IdentityVerificationSelectorsIDs } from './IdentityVerification.testIds';
import { useIdentityDataShares } from './useIdentityDataShares';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';

jest.mock('../../../../core/Engine', () => ({
  context: {
    KycController: { deleteEncryptedStorage: jest.fn() },
  },
}));

jest.mock('../../../../util/Logger', () => ({
  __esModule: true,
  default: { error: jest.fn() },
}));

const mockDeleteEncryptedStorage = jest.mocked(
  Engine.context.KycController.deleteEncryptedStorage,
);

const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: jest.fn(), goBack: mockGoBack }),
}));

jest.mock('./useIdentityDataShares', () => ({
  useIdentityDataShares: jest.fn(),
}));

const mockUseIdentityDataShares = jest.mocked(useIdentityDataShares);

const MOONPAY_SHARE: KycDataShare = {
  kycSessionId: '123e4567-e89b-12d3-a456-426614174000',
  vendor: 'moonpay',
  sharedAt: '2026-09-17T11:23:00.000Z',
};

const IRON_SHARE: KycDataShare = {
  kycSessionId: '223e4567-e89b-12d3-a456-426614174001',
  vendor: 'iron',
  sharedAt: '2026-08-02T09:05:00.000Z',
};

const arrange = (shares: KycDataShare[] = [MOONPAY_SHARE]) => {
  mockUseIdentityDataShares.mockReturnValue({ shares, isLoading: false });
  return renderWithProvider(<IdentityVerification />);
};

describe('IdentityVerification', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the screen header', () => {
    const { getByTestId } = arrange();

    const header = getByTestId(IdentityVerificationSelectorsIDs.HEADER);
    expect(
      within(header).getByText(strings('identity_verification.title')),
    ).toBeOnTheScreen();
  });

  it('navigates back when the back button is pressed', () => {
    const { getByTestId } = arrange();

    fireEvent.press(getByTestId(CommonSelectorsIDs.BACK_ARROW_BUTTON));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('names the provider each verification was for', () => {
    const { getByText } = arrange();

    expect(
      getByText(
        strings('identity_verification.verification_for', {
          provider: 'MoonPay',
        }),
      ),
    ).toBeOnTheScreen();
  });

  it('shows the date beneath each verification', () => {
    const { getByText } = arrange();

    expect(
      getByText(
        formatTimestampToDateTime(Date.parse(MOONPAY_SHARE.sharedAt)) as string,
      ),
    ).toBeOnTheScreen();
  });

  it('renders one row per provider', () => {
    const { getByTestId } = arrange([MOONPAY_SHARE, IRON_SHARE]);

    expect(
      getByTestId(`${IdentityVerificationSelectorsIDs.SHARE_ROW}-moonpay`),
    ).toBeOnTheScreen();
    expect(
      getByTestId(`${IdentityVerificationSelectorsIDs.SHARE_ROW}-iron`),
    ).toBeOnTheScreen();
  });

  it('hides the card entirely when there are no verifications', () => {
    const { queryByTestId } = arrange([]);

    expect(
      queryByTestId(IdentityVerificationSelectorsIDs.VERIFICATION_CARD),
    ).toBeNull();
  });

  it('renders the delete identity data button', () => {
    const { getByTestId } = arrange();

    expect(
      getByTestId(IdentityVerificationSelectorsIDs.DELETE_BUTTON),
    ).toBeOnTheScreen();
  });

  describe('deleting identity data', () => {
    const pressDeleteAndConfirm = (
      getByTestId: ReturnType<typeof arrange>['getByTestId'],
    ) => {
      const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation();
      fireEvent.press(
        getByTestId(IdentityVerificationSelectorsIDs.DELETE_BUTTON),
      );
      const buttons = alertSpy.mock.calls[0][2] ?? [];
      const confirm = buttons.find((b) => b.style === 'destructive');
      return { alertSpy, confirm };
    };

    it('asks for confirmation without deleting yet', () => {
      const { getByTestId } = arrange();

      const { alertSpy } = pressDeleteAndConfirm(getByTestId);

      expect(alertSpy).toHaveBeenCalledWith(
        strings('identity_verification.delete_confirm_title'),
        strings('identity_verification.delete_confirm_message'),
        expect.any(Array),
      );
      expect(mockDeleteEncryptedStorage).not.toHaveBeenCalled();
    });

    it('deletes the encrypted storage once confirmed and reports success', async () => {
      mockDeleteEncryptedStorage.mockResolvedValue(undefined);
      const { getByTestId } = arrange();
      const { alertSpy, confirm } = pressDeleteAndConfirm(getByTestId);

      act(() => {
        confirm?.onPress?.();
      });

      await waitFor(() =>
        expect(alertSpy).toHaveBeenLastCalledWith(
          strings('identity_verification.delete_success_title'),
          strings('identity_verification.delete_success_message'),
        ),
      );
      expect(mockDeleteEncryptedStorage).toHaveBeenCalledTimes(1);
    });

    it('logs and reports an error when deletion fails', async () => {
      const error = new Error('boom');
      mockDeleteEncryptedStorage.mockRejectedValue(error);
      const { getByTestId } = arrange();
      const { alertSpy, confirm } = pressDeleteAndConfirm(getByTestId);

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
