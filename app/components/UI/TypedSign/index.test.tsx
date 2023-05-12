import React from 'react';
import { shallow } from 'enzyme';
import TypedSign from './';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';
import SignatureRequest from '../SignatureRequest';
import Engine from '../../../core/Engine';
import NotificationManager from '../../../core/NotificationManager';
import { WALLET_CONNECT_ORIGIN } from '../../../util/walletconnect';
import { InteractionManager } from 'react-native';
import { strings } from '../../../../locales/i18n';
import AppConstants from '../../../core/AppConstants';

jest.mock('../../../core/Engine', () => ({
  context: {
    SignatureController: {
      signTypedMessage: jest.fn(),
      cancelTypedMessage: jest.fn(),
    },
  },
}));

jest.mock('../../../core/NotificationManager', () => ({
  showSimpleNotification: jest.fn(),
}));

const messageParamsMock = {
  data: { type: 'string', name: 'Message', value: 'Hi, Alice!' },
  origin: 'example.com',
  metamaskId: 'TestMessageId',
};

const mockStore = configureMockStore();

const initialState = {
  engine: {
    backgroundState: {
      PreferencesController: {
        selectedAddress: '0x0',
      },
    },
  },
};

const store = mockStore(initialState);

function createWrapper({ origin = messageParamsMock.origin } = {}) {
  return shallow(
    <Provider store={store}>
      <TypedSign
        currentPageInformation={{ title: 'title', url: 'url' }}
        messageParams={{ ...messageParamsMock, origin }}
        onConfirm={() => undefined}
        onCancel={() => undefined}
      />
    </Provider>,
  ).find(TypedSign);
}

describe('TypedSign', () => {
  it('should render correctly', () => {
    const wrapper = createWrapper();
    expect(wrapper).toMatchSnapshot();
  });

  describe('onConfirm', () => {
    it('signs message', async () => {
      const wrapper = createWrapper().dive();
      await (wrapper.find(SignatureRequest).props() as any).onConfirm();

      expect(
        Engine.context.SignatureController.signTypedMessage,
      ).toHaveBeenCalledTimes(1);
      expect(
        Engine.context.SignatureController.signTypedMessage,
      ).toHaveBeenCalledWith(messageParamsMock, { parseJsonData: false });
    });

    it.each([
      ['wallet connect', WALLET_CONNECT_ORIGIN],
      ['SDK remote', AppConstants.MM_SDK.SDK_REMOTE_ORIGIN],
    ])(
      'shows notification on success if origin is %s',
      async (_title, origin) => {
        jest
          .spyOn(InteractionManager, 'runAfterInteractions')
          .mockImplementation((callback: any) => callback());

        (NotificationManager.showSimpleNotification as any).mockReset();

        const wrapper = createWrapper({ origin }).dive();
        await (wrapper.find(SignatureRequest).props() as any).onConfirm();

        expect(
          NotificationManager.showSimpleNotification,
        ).toHaveBeenCalledTimes(1);
        expect(NotificationManager.showSimpleNotification).toHaveBeenCalledWith(
          {
            status: `simple_notification`,
            duration: 5000,
            title: strings('notifications.wc_signed_title'),
            description: strings('notifications.wc_description'),
          },
        );
      },
    );

    it.each([
      ['wallet connect', WALLET_CONNECT_ORIGIN],
      ['SDK remote', AppConstants.MM_SDK.SDK_REMOTE_ORIGIN],
    ])(
      'shows notification on error if origin is %s',
      async (_title, origin) => {
        jest
          .spyOn(InteractionManager, 'runAfterInteractions')
          .mockImplementation((callback: any) => callback());

        (NotificationManager.showSimpleNotification as any).mockReset();

        (
          Engine.context.SignatureController.signTypedMessage as any
        ).mockRejectedValue(new Error('Test Error'));

        const wrapper = createWrapper({ origin }).dive();
        await (wrapper.find(SignatureRequest).props() as any).onConfirm();

        expect(
          NotificationManager.showSimpleNotification,
        ).toHaveBeenCalledTimes(1);
        expect(NotificationManager.showSimpleNotification).toHaveBeenCalledWith(
          {
            status: `simple_notification_rejected`,
            duration: 5000,
            title: strings('notifications.wc_signed_failed_title'),
            description: strings('notifications.wc_description'),
          },
        );
      },
    );
  });

  describe('onCancel', () => {
    it('cancels message', async () => {
      const wrapper = createWrapper().dive();
      await (wrapper.find(SignatureRequest).props() as any).onCancel();

      expect(
        Engine.context.SignatureController.cancelTypedMessage,
      ).toHaveBeenCalledTimes(1);
      expect(
        Engine.context.SignatureController.cancelTypedMessage,
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

      const wrapper = createWrapper({ origin }).dive();
      await (wrapper.find(SignatureRequest).props() as any).onCancel();

      expect(NotificationManager.showSimpleNotification).toHaveBeenCalledTimes(
        1,
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
