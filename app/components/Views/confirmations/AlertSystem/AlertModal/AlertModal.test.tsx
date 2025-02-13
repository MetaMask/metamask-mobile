import React from 'react';

import { render, fireEvent } from '@testing-library/react-native';

import { useAlerts } from '../context';
import AlertModal from './AlertModal';
import { Severity } from '../../types/confirm-alerts';

jest.mock('../../../../../util/theme', () => ({
  useTheme: jest.fn(),
}));

jest.mock('../context', () => ({
  useAlerts: jest.fn(),
}));

const mockAlerts = [
  {
    key: 'alert1',
    title: 'Test Alert',
    message: 'This is a test alert message.',
    severity: Severity.Warning,
    alertDetails: ['Detail 1', 'Detail 2'],
    actions: [
      { label: 'Action 1', callback: jest.fn() },
      { label: 'Action 2', callback: jest.fn() },
    ],
  },
];

describe('AlertModal', () => {
  beforeEach(() => {
    (useAlerts as jest.Mock).mockReturnValue({
      isAlertConfirmed: jest.fn().mockReturnValue(false),
      setAlertConfirmed: jest.fn(),
      alerts: mockAlerts,
      hideAlertModal: jest.fn(),
      alertKey: 'alert1',
      alertModalVisible: true,
    });
  });

  it('renders the AlertModal correctly', () => {
    const { getByText } = render(<AlertModal />);
    expect(getByText('Test Alert')).toBeDefined();
    expect(getByText('This is a test alert message.')).toBeDefined();
    expect(getByText('Alert Details')).toBeDefined();
    expect(getByText('• Detail 1')).toBeDefined();
    expect(getByText('• Detail 2')).toBeDefined();
  });

  it('renders the correct icon based on severity', () => {
    const { getByTestId } = render(<AlertModal />);
    expect(getByTestId('alert-modal-icon')).toBeDefined();
  });

  it('handles checkbox click correctly', () => {
    const setAlertConfirmed = jest.fn();
    (useAlerts as jest.Mock).mockReturnValue({
      ...useAlerts(),
      setAlertConfirmed,
    });

    const { getByText } = render(<AlertModal />);
    const checkbox = getByText('I have acknowledged the risk and still want to proceed');
    fireEvent.press(checkbox);
    expect(setAlertConfirmed).toHaveBeenCalledWith('alert1', true);
  });

  it('handles action button clicks correctly', () => {
    const hideAlertModal = jest.fn();
    const actionCallback = jest.fn();
    (useAlerts as jest.Mock).mockReturnValue({
      ...useAlerts(),
      hideAlertModal,
    });

    const { getByText } = render(<AlertModal />);
    const actionButton = getByText('Action 1');
    fireEvent.press(actionButton);
    expect(actionCallback).toHaveBeenCalled();
    expect(hideAlertModal).toHaveBeenCalled();
  });

  it('disables the primary button if the checkbox is not checked', () => {
    const { getByText } = render(<AlertModal />);
    const primaryButton = getByText('Got it');
    expect(primaryButton.props.disabled).toBe(true);
  });

  it('enables the primary button if the checkbox is checked', () => {
    (useAlerts as jest.Mock).mockReturnValue({
      ...useAlerts(),
      isAlertConfirmed: jest.fn().mockReturnValue(true),
    });

    const { getByText } = render(<AlertModal />);
    const primaryButton = getByText('Got it');
    expect(primaryButton.props.disabled).toBe(false);
  });

  it('returns null if the alert modal is not visible', () => {
    (useAlerts as jest.Mock).mockReturnValue({
      ...useAlerts(),
      alertModalVisible: false,
    });

    const { queryByText } = render(<AlertModal />);
    expect(queryByText('Test Alert')).toBeNull();
  });
});
