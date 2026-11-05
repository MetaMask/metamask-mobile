import React from 'react';
import { Alert } from 'react-native';
import { act, fireEvent, waitFor } from '@testing-library/react-native';
import type { KycSessionStatus } from '@metamask/kyc-controller';
import DeleteIdentityData from './DeleteIdentityData';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import Engine from '../../../../../core/Engine';
import Logger from '../../../../../util/Logger';
import { selectKycSessionStatus } from '../../../../../selectors/kycController';
import { selectMoneyMovementNeobank } from '../../../../../selectors/featureFlagController/moneyAccount';
import { SECURITY_SETTINGS_DELETE_IDENTITY_DATA_BUTTON } from '../SecuritySettings.constants';

jest.mock('../../../../../core/Engine', () => ({
  context: {
    KycController: { deleteEncryptedStorage: jest.fn() },
  },
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
    selectMoneyMovementNeobank: jest.fn(),
  }),
);

const mockDeleteEncryptedStorage = jest.mocked(
  Engine.context.KycController.deleteEncryptedStorage,
);
const mockSelectKycSessionStatus = jest.mocked(selectKycSessionStatus);
const mockSelectMoneyMovementNeobank = jest.mocked(selectMoneyMovementNeobank);

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
  mockSelectMoneyMovementNeobank.mockReturnValue({
    isEnabled: isFlagEnabled,
    regions: [],
    regionCurrencies: {},
    defaultCurrency: undefined,
    chooseCurrency: false,
    regionOverride: undefined,
  } as ReturnType<typeof selectMoneyMovementNeobank>);

  return renderWithProvider(<DeleteIdentityData />);
};

describe('DeleteIdentityData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the delete section when verification has started', () => {
    const { getByText, getByTestId } = arrange();

    expect(getByText('Delete Identity Data')).toBeOnTheScreen();
    expect(
      getByText(
        'Your identity details will be permanently deleted from MetaMask. Partners you verified with keep their own copy. You may need to verify again later.',
      ),
    ).toBeOnTheScreen();
    expect(
      getByTestId(SECURITY_SETTINGS_DELETE_IDENTITY_DATA_BUTTON),
    ).toBeOnTheScreen();
  });

  it('renders nothing when the customer has no KYC session', () => {
    const { queryByText } = arrange({ hasSession: false });

    expect(queryByText('Delete Identity Data')).toBeNull();
  });

  it('renders nothing when the feature flag is off', () => {
    const { queryByText } = arrange({ isFlagEnabled: false });

    expect(queryByText('Delete Identity Data')).toBeNull();
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
        'Delete identity data?',
        'This cannot be undone.',
        expect.any(Array),
      );
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
          'Identity data deleted',
          'Your encrypted identity verification data has been deleted.',
        ),
      );
      expect(mockDeleteEncryptedStorage).toHaveBeenCalledTimes(1);
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
          "Couldn't delete identity data",
          'Something went wrong. Please try again.',
        ),
      );
      expect(Logger.error).toHaveBeenCalledWith(error, expect.any(String));
    });
  });
});
