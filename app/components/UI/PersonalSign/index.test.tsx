import React from 'react';
import PersonalSign from './';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { WALLET_CONNECT_ORIGIN } from '../../../util/walletconnect';
import renderWithProvider from '../../../util/test/renderWithProvider';
import Engine from '../../../core/Engine';
import NotificationManager from '../../../core/NotificationManager';
import { InteractionManager } from 'react-native';
import AppConstants from '../../../core/AppConstants';
import { strings } from '../../../../locales/i18n';
import initialBackgroundState from '../../../util/test/initial-background-state.json';

jest.mock('../../../core/Engine', () => ({
  context: {
    KeyringController: {
      getAccountKeyringType: jest.fn(async () => {
        // no-op
      }),
      getQRKeyringState: jest.fn(async () => {
        // no-op
      }),
    },
    NetworkController: {
      state: {},
    },
    SignatureController: {
      signPersonalMessage: jest.fn(),
      cancelPersonalMessage: jest.fn(),
    },
  },
}));

jest.mock('../../../core/NotificationManager', () => ({
  showSimpleNotification: jest.fn(),
}));

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: jest.fn(),
    }),
  };
});

const initialState = {
  engine: {
    backgroundState: initialBackgroundState,
  },
};

const messageParamsMock = {
  data: 'message',
  from: '0x0',
  origin: 'origin',
  metamaskId: 'id',
};

function renderPersonalSign() {
  return (
    <PersonalSign
      currentPageInformation={{ title: 'title', url: 'url' }}
      messageParams={messageParamsMock}
      onConfirm={() => ({})}
      onCancel={() => ({})}
    />
  );
}

describe('PersonalSign', () => {
  it('should render correctly', () => {
    const { toJSON } = renderWithProvider(renderPersonalSign(), {
      state: initialState,
    });
    expect(toJSON()).toMatchSnapshot();
  });

  describe('onConfirm', () => {
    it('signs message', async () => {
      renderWithProvider(
        <PersonalSign
          currentPageInformation={{ title: 'title', url: 'url' }}
          messageParams={messageParamsMock}
          onConfirm={() => ({})}
          onCancel={() => ({})}
        />,
        {
          state: initialState,
        },
      );

      fireEvent.press(
        screen.getByRole('button', { name: strings('signature_request.sign') }),
      );

      await waitFor(() =>
        expect(
          Engine.context.SignatureController.signPersonalMessage,
        ).toHaveBeenCalledTimes(1),
      );
      expect(
        Engine.context.SignatureController.signPersonalMessage,
      ).toHaveBeenCalledWith(messageParamsMock);
    });

    it.each([
      ['wallet connect', WALLET_CONNECT_ORIGIN],
      ['SDK remote', AppConstants.MM_SDK.SDK_REMOTE_ORIGIN],
    ])('shows notification if origin is %s', async (_title, origin) => {
      jest
        .spyOn(InteractionManager, 'runAfterInteractions')
        .mockImplementation((callback: any) => callback());

      (NotificationManager.showSimpleNotification as any).mockReset();

      renderWithProvider(
        <PersonalSign
          currentPageInformation={{ title: 'title', url: 'url' }}
          messageParams={{
            ...messageParamsMock,
            origin,
          }}
          onConfirm={() => ({})}
          onCancel={() => ({})}
        />,
        {
          state: initialState,
        },
      );

      fireEvent.press(
        screen.getByRole('button', { name: strings('signature_request.sign') }),
      );

      await waitFor(() =>
        expect(
          NotificationManager.showSimpleNotification,
        ).toHaveBeenCalledTimes(1),
      );
      expect(NotificationManager.showSimpleNotification).toHaveBeenCalledWith({
        status: `simple_notification`,
        duration: 5000,
        title: strings('notifications.wc_signed_title'),
        description: strings('notifications.wc_description'),
      });
    });
  });

  describe('onCancel', () => {
    it('cancels message', async () => {
      renderWithProvider(
        <PersonalSign
          currentPageInformation={{ title: 'title', url: 'url' }}
          messageParams={messageParamsMock}
          onConfirm={() => ({})}
          onCancel={() => ({})}
        />,
        {
          state: initialState,
        },
      );

      fireEvent.press(
        screen.getByRole('button', {
          name: strings('signature_request.cancel'),
        }),
      );

      await waitFor(() =>
        expect(
          Engine.context.SignatureController.cancelPersonalMessage,
        ).toHaveBeenCalledTimes(1),
      );
      expect(
        Engine.context.SignatureController.cancelPersonalMessage,
      ).toHaveBeenCalledWith(messageParamsMock.metamaskId);
    });

    it.each([
      ['wallet connect', WALLET_CONNECT_ORIGIN],
      ['SDK remote', AppConstants.MM_SDK.SDK_REMOTE_ORIGIN],
    ])('shows notification if origin is %s', async (_title, origin) => {
      jest
        .spyOn(InteractionManager, 'runAfterInteractions')
        .mockImplementation((callback: any) => callback());

      (NotificationManager.showSimpleNotification as any).mockReset();

      renderWithProvider(
        <PersonalSign
          currentPageInformation={{ title: 'title', url: 'url' }}
          messageParams={{
            ...messageParamsMock,
            origin,
          }}
          onConfirm={() => ({})}
          onCancel={() => ({})}
        />,
        {
          state: initialState,
        },
      );

      fireEvent.press(
        screen.getByRole('button', {
          name: strings('signature_request.cancel'),
        }),
      );

      await waitFor(() =>
        expect(
          NotificationManager.showSimpleNotification,
        ).toHaveBeenCalledTimes(1),
      );
      expect(NotificationManager.showSimpleNotification).toHaveBeenCalledWith({
        status: `simple_notification_rejected`,
        duration: 5000,
        title: strings('notifications.wc_signed_rejected_title'),
        description: strings('notifications.wc_description'),
      });
    });
  });
});
