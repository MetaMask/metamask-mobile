import React from 'react';
import { act, fireEvent } from '@testing-library/react-native';
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

const mockLayoutEvent = {
  nativeEvent: { layout: { height: 100, width: 300, x: 0, y: 0 } },
};

const triggerEnterLayout = (
  getByTestId: ReturnType<typeof renderWithProvider>['getByTestId'],
) => {
  fireEvent(
    getByTestId('base-notification-container'),
    'layout',
    mockLayoutEvent,
  );
};

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

  it('invokes onHide when the close affordance is pressed', async () => {
    jest.useFakeTimers();
    const onHide = jest.fn();
    const { getByTestId } = renderWithProvider(
      <BaseNotification
        status="success"
        data={defaultData}
        autoDismiss
        persistUntilDismiss
        onHide={onHide}
      />,
    );

    triggerEnterLayout(getByTestId);

    await act(async () => {
      fireEvent.press(getByTestId('base-notification-close'));
      jest.runAllTimers();
    });

    expect(onHide).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
  });

  it('renders nothing when isVisible is false', () => {
    const { queryByTestId } = renderWithProvider(
      <BaseNotification
        status="success"
        data={defaultData}
        isVisible={false}
      />,
    );

    expect(queryByTestId('base-notification-container')).not.toBeOnTheScreen();
  });

  it('invokes onDismissComplete after the auto dismiss animation completes', async () => {
    jest.useFakeTimers();
    const onDismissComplete = jest.fn();
    const { getByTestId } = renderWithProvider(
      <BaseNotification
        status="success"
        data={defaultData}
        dismissDuration={100}
        onDismissComplete={onDismissComplete}
      />,
    );

    triggerEnterLayout(getByTestId);

    await act(async () => {
      jest.runAllTimers();
    });

    expect(onDismissComplete).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
  });

  it('handles unmount and ignores duplicate layout after enter', async () => {
    jest.useFakeTimers();
    const onDismissComplete = jest.fn();
    const { getByTestId, unmount } = renderWithProvider(
      <BaseNotification
        status="success"
        data={defaultData}
        dismissDuration={5000}
        onDismissComplete={onDismissComplete}
      />,
    );

    triggerEnterLayout(getByTestId);
    triggerEnterLayout(getByTestId);
    unmount();

    expect(onDismissComplete).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
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
