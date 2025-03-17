import React from 'react';
import { act, fireEvent, waitFor } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { ConfirmationFooterSelectorIDs } from '../../../../../../../e2e/selectors/Confirmation/ConfirmationView.selectors';
import AppConstants from '../../../../../../core/AppConstants';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { personalSignatureConfirmationState, stakingDepositConfirmationState } from '../../../../../../util/test/confirm-data-helpers';
// eslint-disable-next-line import/no-namespace
import * as QRHardwareHook from '../../../context/QRHardwareContext/QRHardwareContext';
// eslint-disable-next-line import/no-namespace
import * as LedgerContext from '../../../context/LedgerContext/LedgerContext';
import { Footer } from './Footer';
import { useAlerts } from '../../../AlertSystem/context';
import { useAlertsConfirmed } from '../../../../../hooks/useAlertsConfirmed';
import { Severity } from '../../../types/alerts';

const mockConfirmSpy = jest.fn();
const mockRejectSpy = jest.fn();
jest.mock('../../../hooks/useConfirmActions', () => ({
  useConfirmActions: () => ({
    onConfirm: mockConfirmSpy,
    onReject: mockRejectSpy,
  }),
}));

jest.mock('react-native/Libraries/Linking/Linking', () => ({
  openURL: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  canOpenURL: jest.fn(),
  getInitialURL: jest.fn(),
}));

jest.mock('../../../AlertSystem/context', () => ({
  useAlerts: jest.fn(),
}));

jest.mock('../../../../../hooks/useAlertsConfirmed', () => ({
  useAlertsConfirmed: jest.fn(),
}));

const ALERT_MESSAGE_MOCK = 'This is a test alert message.';
const ALERT_DETAILS_MOCK = ['Detail 1', 'Detail 2'];
const mockAlerts = [
  {
    key: 'alert1',
    title: 'Test Alert',
    message: ALERT_MESSAGE_MOCK,
    severity: Severity.Warning,
    alertDetails: ALERT_DETAILS_MOCK,
  }
];

describe('Footer', () => {
  beforeEach(() => {
    (useAlerts as jest.Mock).mockReturnValue({fieldAlerts: [], hasDangerAlerts: false,});
    (useAlertsConfirmed as jest.Mock).mockReturnValue({hasUnconfirmedDangerAlerts: false,});
    jest.clearAllMocks();
  });

  it('should render correctly', () => {
    const { getByText, getAllByRole } = renderWithProvider(<Footer />, {
      state: personalSignatureConfirmationState,
    });
    expect(getByText('Reject')).toBeDefined();
    expect(getByText('Confirm')).toBeDefined();
    expect(getAllByRole('button')).toHaveLength(2);
  });

  it('should call onConfirm when confirm button is clicked', async () => {
    const { getByText } = renderWithProvider(<Footer />, {
      state: personalSignatureConfirmationState,
    });
    fireEvent.press(getByText('Confirm'));
    await waitFor(() => {
      expect(mockConfirmSpy).toHaveBeenCalledTimes(1);
    });
  });

  it('should call onReject when reject button is clicked', async () => {
    const { getByText } = renderWithProvider(<Footer />, {
      state: personalSignatureConfirmationState,
    });
    fireEvent.press(getByText('Reject'));
    await waitFor(() => {
      expect(mockRejectSpy).toHaveBeenCalledTimes(1);
    });
  });

  it('renders confirm button text "Get Signature" if QR signing is in progress', () => {
    jest.spyOn(QRHardwareHook, 'useQRHardwareContext').mockReturnValue({
      isQRSigningInProgress: true,
    } as QRHardwareHook.QRHardwareContextType);
    const { getByText } = renderWithProvider(<Footer />, {
      state: personalSignatureConfirmationState,
    });
    expect(getByText('Get Signature')).toBeTruthy();
  });

  it('renders confirm button text "Sign with Ledger" if account used for signing is ledger account', () => {
    jest.spyOn(LedgerContext, 'useLedgerContext').mockReturnValue({
      isLedgerAccount: true,
    } as LedgerContext.LedgerContextType);
    const { getByText } = renderWithProvider(<Footer />, {
      state: personalSignatureConfirmationState,
    });
    expect(getByText('Sign with Ledger')).toBeTruthy();
  });

  it('confirm button is disabled if `needsCameraPermission` is true', () => {
    jest.spyOn(QRHardwareHook, 'useQRHardwareContext').mockReturnValue({
      needsCameraPermission: true,
    } as unknown as QRHardwareHook.QRHardwareContextType);
    const { getByTestId } = renderWithProvider(<Footer />, {
      state: personalSignatureConfirmationState,
    });
    expect(
      getByTestId(ConfirmationFooterSelectorIDs.CONFIRM_BUTTON).props.disabled,
    ).toBe(true);
  });

  it('should open Terms of Use URL when terms link is pressed', () => {
    const { getByText } = renderWithProvider(<Footer />, {
      state: stakingDepositConfirmationState,
    });

    fireEvent.press(getByText('Terms of Use'));
    expect(Linking.openURL).toHaveBeenCalledWith(AppConstants.URLS.TERMS_OF_USE);
  });

  it('should open Risk Disclosure URL when risk disclosure link is pressed', () => {
    const { getByText } = renderWithProvider(<Footer />, {
      state: stakingDepositConfirmationState,
    });

    fireEvent.press(getByText('Risk Disclosure'));
    expect(Linking.openURL).toHaveBeenCalledWith(AppConstants.URLS.STAKING_RISK_DISCLOSURE);
  });

  describe('Confirm Alert Modal', () => {
    const baseMockUseAlerts = {
      alertKey: '',
      alerts: mockAlerts,
      fieldAlerts: mockAlerts,
      hideAlertModal: jest.fn(),
      showAlertModal: jest.fn(),
      alertModalVisible: true,
      setAlertKey: jest.fn(),
      hasDangerAlerts: true,
    };

    const baseMockUseAlertsConfirmed = {
      isAlertConfirmed: jest.fn().mockReturnValue(false),
      setAlertConfirmed: jest.fn(),
      unconfirmedDangerAlerts: [],
      unconfirmedFieldDangerAlerts: [],
      hasUnconfirmedDangerAlerts: false,
      hasUnconfirmedFieldDangerAlerts: false,
    };

    beforeEach(() => {
      (useAlerts as jest.Mock).mockReturnValue(baseMockUseAlerts);
      (useAlertsConfirmed as jest.Mock).mockReturnValue(baseMockUseAlertsConfirmed);
      jest.clearAllMocks();
    });

    it('renders ConfirmAlertModal when there is a danger alert', async () => {
      const { getByText, getByTestId } = renderWithProvider(<Footer />, {
        state: personalSignatureConfirmationState,
      });

      await act(async () => {
        fireEvent.press(getByTestId(ConfirmationFooterSelectorIDs.CONFIRM_BUTTON));
      });

      expect(getByTestId('confirm-alert-checkbox')).toBeDefined();
      expect(getByText('High risk request')).toBeDefined();
      expect(getByText('We suggest you reject this request. If you continue, you might put your assets at risk.')).toBeDefined();
    });

    it('rejects approval request', async () => {
      const { getByTestId } = renderWithProvider(<Footer />, {
        state: personalSignatureConfirmationState,
      });

      await act(async () => {
        fireEvent.press(getByTestId(ConfirmationFooterSelectorIDs.CONFIRM_BUTTON));
      });

      expect(getByTestId('confirm-alert-checkbox')).toBeDefined();

      await act(async () => {
        fireEvent.press(getByTestId('confirm-alert-reject-button'));
      });

      expect(mockRejectSpy).toHaveBeenCalledTimes(1);
    });

    it('calls onHandleConfirm when confirm approval', async () => {
      const { getByTestId } = renderWithProvider(<Footer />, {
        state: personalSignatureConfirmationState,
      });

      await act(async () => {
        fireEvent.press(getByTestId(ConfirmationFooterSelectorIDs.CONFIRM_BUTTON));
      });

      await act(async () => {
        fireEvent.press(getByTestId('confirm-alert-checkbox'));
      });

      await act(async () => {
        fireEvent.press(getByTestId('confirm-alert-confirm-button'));
      });

      expect(mockConfirmSpy).toHaveBeenCalledTimes(1);
    });

    it.each([
      { fieldAlertsCount: 2, expectedText: 'Review alerts' },
      { fieldAlertsCount: 1, expectedText: 'Review alert' },
    ])('renders button label "$expectedText" when there are $fieldAlertsCount field alerts', async ({ fieldAlertsCount, expectedText }) => {
      const fieldAlerts = Array(fieldAlertsCount).fill(mockAlerts[0]);

      (useAlerts as jest.Mock).mockReturnValue({
        ...baseMockUseAlerts,
        fieldAlerts,
      });
      (useAlertsConfirmed as jest.Mock).mockReturnValue({
        ...baseMockUseAlertsConfirmed,
        hasUnconfirmedDangerAlerts: true,
      });

      const { getByText } = renderWithProvider(<Footer />, {
        state: personalSignatureConfirmationState,
      });

      expect(getByText(expectedText)).toBeDefined();
    });
  });
});
