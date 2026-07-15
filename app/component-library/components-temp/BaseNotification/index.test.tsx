import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import BaseNotification, { getDescription } from './';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { strings } from '../../../../locales/i18n';
import { BaseNotificationStatus } from './BaseNotification.types';

const defaultData = {
  description: 'Testing description',
  title: 'Testing Title',
};

const titledStatuses: BaseNotificationStatus[] = [
  'pending',
  'pending_withdrawal',
  'pending_deposit',
  'success_deposit',
  'success_withdrawal',
  'received',
  'received_payment',
  'cancelled',
  'error',
];

const allStatuses: BaseNotificationStatus[] = [
  ...titledStatuses,
  'speedup',
  'import_success',
  'simple_notification',
  'simple_notification_rejected',
];

describe('BaseNotification', () => {
  it.each(allStatuses)('renders for status %s', (status) => {
    const { getByTestId } = renderWithProvider(
      <BaseNotification status={status} data={defaultData} />,
    );
    expect(getByTestId('notification-title')).toBeOnTheScreen();
  });

  it.each(titledStatuses)('renders the generated title for %s', (status) => {
    const { getByText } = renderWithProvider(
      <BaseNotification status={status} data={{}} />,
    );
    expect(getByText(strings(`notifications.${status}_title`))).toBeTruthy();
  });

  it.each(titledStatuses)(
    'renders the provided description for %s',
    (status) => {
      const { getByText } = renderWithProvider(
        <BaseNotification status={status} data={defaultData} />,
      );
      expect(getByText(defaultData.description)).toBeTruthy();
    },
  );

  it.each(titledStatuses)(
    'falls back to getDescription when none provided for %s',
    (status) => {
      const { getByText } = renderWithProvider(
        <BaseNotification status={status} data={{}} />,
      );
      expect(getByText(getDescription(status, {}))).toBeTruthy();
    },
  );

  it('does not crash when data is undefined', () => {
    const { getByTestId } = renderWithProvider(
      <BaseNotification status="success" />,
    );
    expect(getByTestId('notification-title')).toBeOnTheScreen();
  });

  it('invokes onPress when the notification is tapped', () => {
    const onPress = jest.fn();
    const { getByTestId } = renderWithProvider(
      <BaseNotification
        status="success"
        data={defaultData}
        onPress={onPress}
      />,
    );
    fireEvent.press(getByTestId('notification-title'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renders the close affordance when autoDismiss is true', () => {
    const onHide = jest.fn();
    const { getByTestId } = renderWithProvider(
      <BaseNotification
        status="success"
        data={defaultData}
        autoDismiss
        onHide={onHide}
      />,
    );
    fireEvent.press(getByTestId('base-notification-close'));
    expect(onHide).toHaveBeenCalledTimes(1);
  });

  describe('EIP-7702 transactions (without nonce)', () => {
    it('renders success title without nonce for EIP-7702 transactions', () => {
      const { getByText } = renderWithProvider(
        <BaseNotification status="success" data={{ nonce: undefined }} />,
      );

      const expectedTitle = strings('notifications.success_title', {
        nonce: '',
      })
        .replace(' # ', ' ')
        .trim();

      expect(getByText(expectedTitle)).toBeTruthy();
    });

    it('renders success title with nonce when nonce exists', () => {
      const { getByText } = renderWithProvider(
        <BaseNotification status="success" data={{ nonce: '3' }} />,
      );

      expect(
        getByText(strings('notifications.success_title', { nonce: '3' })),
      ).toBeTruthy();
    });

    it('renders speedup title without nonce for EIP-7702 transactions', () => {
      const { getByText } = renderWithProvider(
        <BaseNotification status="speedup" data={{ nonce: undefined }} />,
      );

      const expectedTitle = strings('notifications.speedup_title', {
        nonce: '',
      })
        .replace(' #', '')
        .trim();

      expect(getByText(expectedTitle)).toBeTruthy();
    });

    it('renders speedup title with nonce when nonce exists', () => {
      const { getByText } = renderWithProvider(
        <BaseNotification status="speedup" data={{ nonce: '5' }} />,
      );

      expect(
        getByText(strings('notifications.speedup_title', { nonce: '5' })),
      ).toBeTruthy();
    });
  });
});
