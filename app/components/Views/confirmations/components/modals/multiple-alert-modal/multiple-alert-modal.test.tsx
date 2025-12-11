import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { useAlerts } from '../../../context/alert-system-context';
import MultipleAlertModal from './multiple-alert-modal';
import { Severity } from '../../../types/alerts';
import { useConfirmationAlertMetrics } from '../../../hooks/metrics/useConfirmationAlertMetrics';

jest.mock('../../../context/alert-system-context', () => ({
  useAlerts: jest.fn(),
}));

jest.mock('../../../hooks/metrics/useConfirmationAlertMetrics', () => ({
  useConfirmationAlertMetrics: jest.fn(),
}));

const ALERT_MESSAGE_MOCK = 'This is a test alert message.';
const ALERT_DETAILS_MOCK = ['Detail 1', 'Detail 2'];
const ALERT_ACTION_MOCK = { label: 'Action 1', callback: jest.fn() };

const mockAlerts = [
  {
    key: 'alert1',
    title: 'Test Alert',
    message: ALERT_MESSAGE_MOCK,
    severity: Severity.Warning,
    alertDetails: ALERT_DETAILS_MOCK,
    action: ALERT_ACTION_MOCK,
    field: 'To',
  },
  {
    key: 'alert2',
    title: 'Test Alert 2',
    message: ALERT_MESSAGE_MOCK,
    severity: Severity.Danger,
    alertDetails: ALERT_DETAILS_MOCK,
    action: ALERT_ACTION_MOCK,
    field: 'From',
  },
  {
    key: 'alert3',
    title: 'Test Alert 3',
    message: ALERT_MESSAGE_MOCK,
    severity: Severity.Info,
    alertDetails: ALERT_DETAILS_MOCK,
    field: 'Subject',
  },
];

describe('MultipleAlertModal', () => {
  const baseMockUseAlerts = {
    fieldAlerts: mockAlerts,
    alertKey: 'alert1',
    setAlertKey: jest.fn(),
    hideAlertModal: jest.fn(),
    alertModalVisible: true,
    isAlertConfirmed: jest.fn().mockReturnValue(false),
    setAlertConfirmed: jest.fn(),
    unconfirmedDangerAlerts: [],
    unconfirmedFieldDangerAlerts: [],
    hasUnconfirmedDangerAlerts: false,
    hasUnconfirmedFieldDangerAlerts: false,
  };
  const trackAlertRendered = jest.fn();

  beforeEach(() => {
    (useAlerts as jest.Mock).mockReturnValue(baseMockUseAlerts);
    (useConfirmationAlertMetrics as jest.Mock).mockReturnValue({
      trackAlertRendered,
    });
    jest.clearAllMocks();
  });

  it('renders the MultipleAlertModal correctly', () => {
    const { getByText } = render(<MultipleAlertModal />);
    expect(getByText('Test Alert')).toBeDefined();
    expect(getByText(ALERT_MESSAGE_MOCK)).toBeDefined();
  });

  it('handles back button click correctly', async () => {
    const setAlertKey = jest.fn();
    (useAlerts as jest.Mock).mockReturnValue({
      ...baseMockUseAlerts,
      setAlertKey,
      alertKey: 'alert2',
    });

    const { getByTestId } = render(<MultipleAlertModal />);
    const backButton = getByTestId('alert-button-icon-arrow-left');

    await act(async () => {
      fireEvent.press(backButton);
    });

    expect(setAlertKey).toHaveBeenCalledWith('alert1');
  });

  it('handles next button click correctly', async () => {
    const setAlertKey = jest.fn();
    (useAlerts as jest.Mock).mockReturnValue({
      ...baseMockUseAlerts,
      setAlertKey,
    });

    const { getByTestId } = render(<MultipleAlertModal />);
    const nextButton = getByTestId('alert-button-icon-arrow-right');

    await act(async () => {
      fireEvent.press(nextButton);
    });

    expect(setAlertKey).toHaveBeenCalledWith('alert2');
  });

  it('handles acknowledge click correctly', async () => {
    const hideAlertModal = jest.fn();
    (useAlerts as jest.Mock).mockReturnValue({
      ...baseMockUseAlerts,
      hideAlertModal,
      alertKey: 'alert3',
    });

    const { getByText } = render(<MultipleAlertModal />);
    const gotItButton = getByText('Got it');

    await act(async () => {
      fireEvent.press(gotItButton);
    });

    expect(hideAlertModal).toHaveBeenCalled();
  });

  it('renders AlertModal when there is only one alert', () => {
    (useAlerts as jest.Mock).mockReturnValue({
      ...baseMockUseAlerts,
      fieldAlerts: [mockAlerts[0]],
    });

    const { getByText } = render(<MultipleAlertModal />);
    expect(getByText('Test Alert')).toBeDefined();
  });

  it('renders PageNavigation when there are multiple alerts', () => {
    const { getByTestId } = render(<MultipleAlertModal />);
    expect(getByTestId('multiple-alert-modal-icon')).toBeDefined();
  });

  it('returns null when no alert is selected', () => {
    (useAlerts as jest.Mock).mockReturnValue({
      ...baseMockUseAlerts,
      fieldAlerts: [],
    });

    const { queryByText } = render(<MultipleAlertModal />);
    expect(queryByText('Test Alert')).toBeNull();
  });

  it('syncs selectedIndex with alertKey when alertKey changes', () => {
    const setAlertKey = jest.fn();
    (useAlerts as jest.Mock).mockReturnValue({
      ...baseMockUseAlerts,
      setAlertKey,
      alertKey: 'alert2',
    });

    const { getByText, rerender } = render(<MultipleAlertModal />);

    expect(getByText('Test Alert 2')).toBeOnTheScreen();

    (useAlerts as jest.Mock).mockReturnValue({
      ...baseMockUseAlerts,
      setAlertKey,
      alertKey: 'alert1',
    });

    rerender(<MultipleAlertModal />);

    expect(getByText('Test Alert')).toBeOnTheScreen();
  });
});
