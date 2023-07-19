import React from 'react';
import { shallow } from 'enzyme';
import PersonalSign from './';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import { WALLET_CONNECT_ORIGIN } from '../../../util/walletconnect';
import SignatureRequest from '../SignatureRequest';
import Engine from '../../../core/Engine';
import NotificationManager from '../../../core/NotificationManager';
import { InteractionManager } from 'react-native';
import AppConstants from '../../../core/AppConstants';
import { strings } from '../../../../locales/i18n';
import initialBackgroundState from '../../../util/test/initial-background-state.json';

jest.mock('../../../core/Engine', () => ({
  context: {
    SignatureController: {
      signPersonalMessage: jest.fn(),
      cancelPersonalMessage: jest.fn(),
    },
  },
}));

jest.mock('../../../core/NotificationManager', () => ({
  showSimpleNotification: jest.fn(),
}));

jest.mock('@react-navigation/native');

const messageParamsMock = {
  data: 'message',
  from: '0x0',
  origin: 'origin',
  metamaskId: 'id',
};

const mockStore = configureMockStore();

const initialState = {
  engine: {
    backgroundState: initialBackgroundState,
  },
};

const store = mockStore(initialState);

function createWrapper({ origin = messageParamsMock.origin } = {}) {
  return shallow(
    <Provider store={store}>
      <PersonalSign
        currentPageInformation={{ title: 'title', url: 'url' }}
        messageParams={{
          ...messageParamsMock,
          origin,
        }}
        onConfirm={() => ({})}
        onCancel={() => ({})}
        selectedAddress="0x0"
      />
    </Provider>,
  ).find(PersonalSign);
}

describe('PersonalSign', () => {
  it('should render correctly', () => {
    const wrapper = createWrapper();
    expect(wrapper).toMatchSnapshot();
  });

  describe('onConfirm', () => {
    it('signs message', async () => {
      const wrapper = createWrapper().dive();
      await (wrapper.find(SignatureRequest).props() as any).onConfirm();

      expect(
        Engine.context.SignatureController.signPersonalMessage,
      ).toHaveBeenCalledTimes(1);
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

      const wrapper = createWrapper({ origin }).dive();
      await (wrapper.find(SignatureRequest).props() as any).onConfirm();

      expect(NotificationManager.showSimpleNotification).toHaveBeenCalledTimes(
        1,
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
      const wrapper = createWrapper().dive();
      await (wrapper.find(SignatureRequest).props() as any).onCancel();

      expect(
        Engine.context.SignatureController.cancelPersonalMessage,
      ).toHaveBeenCalledTimes(1);
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
