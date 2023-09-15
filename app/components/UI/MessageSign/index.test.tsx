import React from 'react';
import { shallow } from 'enzyme';
import MessageSign from './index';
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
import analyticsV2 from '../../../util/analyticsV2';

jest.mock('../../../core/Engine', () => ({
  acceptPendingApproval: jest.fn(),
  rejectPendingApproval: jest.fn(),
  context: {
    SignatureController: {
      hub: {
        on: jest.fn(),
      },
    },
    KeyringController: {
      state: {
        keyrings: [],
      },
    },
  },
}));

jest.mock('../../../util/address', () => ({
  isExternalHardwareAccount: jest.fn(),
}));

jest.mock('../../../core/NotificationManager', () => ({
  showSimpleNotification: jest.fn(),
}));

jest.mock('@react-navigation/native');

jest.mock('../../../util/analyticsV2', () => ({
  trackEvent: jest.fn(),
}));

const messageParamsMock = {
  data: 'message',
  origin: 'example.com',
  metamaskId: 'TestMessageId',
  from: '0x0',
};

const navigation = {
  navigate: jest.fn(),
};

const mockStore = configureMockStore();

const initialState = {
  engine: {
    backgroundState: initialBackgroundState,
  },
};

const store = mockStore(initialState);

function createWrapper({
  origin = messageParamsMock.origin,
  mockConfirm = jest.fn(),
  mockReject = jest.fn(),
} = {}) {
  return shallow(
    <Provider store={store}>
      <MessageSign
        currentPageInformation={{ title: 'title', url: 'url' }}
        messageParams={{ ...messageParamsMock, origin }}
        onConfirm={mockConfirm}
        onReject={mockReject}
        toggleExpandedMessage={jest.fn()}
        showExpandedMessage={false}
        navigation={navigation}
      />
    </Provider>,
  ).find(MessageSign);
}

describe('MessageSign', () => {
  beforeEach(() => {
    (analyticsV2.trackEvent as jest.Mock).mockImplementation(() => undefined);
  });

  afterEach(() => {
    (analyticsV2.trackEvent as jest.Mock).mockReset();
  });

  it('should render correctly', () => {
    const wrapper = createWrapper();
    expect(wrapper).toMatchSnapshot();
  });

  describe('onConfirm', () => {
    it('signs message', async () => {
      const onConfirmMock = jest.fn();
      const wrapper = createWrapper({ mockConfirm: onConfirmMock }).dive();
      await (wrapper.find(SignatureRequest).props() as any).onConfirm();

      expect(onConfirmMock).toHaveBeenCalledTimes(1);
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

  describe('onReject', () => {
    it('rejects message', async () => {
      const onRejectMock = jest.fn();
      const wrapper = createWrapper({ mockReject: onRejectMock }).dive();
      await (wrapper.find(SignatureRequest).props() as any).onReject();

      expect(onRejectMock).toHaveBeenCalledTimes(1);
    });

    it.each([
      ['wallet connect', WALLET_CONNECT_ORIGIN],
      ['SDK remote', AppConstants.MM_SDK.SDK_REMOTE_ORIGIN],
    ])('shows notification if origin is %s', async (_title, origin) => {
      jest
        .spyOn(InteractionManager, 'runAfterInteractions')
        .mockImplementation((callback: any) => callback());

      (NotificationManager.showSimpleNotification as any).mockReset();
      (Engine.context.SignatureController.hub.on as any).mockReset();

      const wrapper = createWrapper({ origin }).dive();
      await (wrapper.find(SignatureRequest).props() as any).onReject();

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

  describe('componentDidMount', () => {
    it('adds listeners', () => {
      const origin = 'origin';
      const mockConfirm = jest.fn();
      const mockReject = jest.fn();

      shallow(
        <Provider store={store}>
          <MessageSign
            currentPageInformation={{ title: 'title', url: 'url' }}
            messageParams={{ ...messageParamsMock, origin }}
            onConfirm={mockConfirm}
            onReject={mockReject}
            toggleExpandedMessage={jest.fn()}
            showExpandedMessage={false}
            navigation={navigation}
          />
        </Provider>,
      );
      expect(Engine.context.SignatureController.hub.on).toHaveBeenCalledTimes(
        1,
      );
      expect(Engine.context.SignatureController.hub.on).toHaveBeenCalledWith(
        'TestMessageId:signError',
        expect.any(Function),
      );
    });
  });

  describe('unmount', () => {
    it('removes listeners', () => {
      const origin = 'origin';
      const mockConfirm = jest.fn();
      const mockReject = jest.fn();

      const wrapper = shallow(
        <Provider store={store}>
          <MessageSign
            currentPageInformation={{ title: 'title', url: 'url' }}
            messageParams={{ ...messageParamsMock, origin }}
            onConfirm={mockConfirm}
            onReject={mockReject}
            toggleExpandedMessage={jest.fn()}
            showExpandedMessage={false}
            navigation={navigation}
          />
        </Provider>,
      );
      wrapper.unmount();
      expect(Engine.context.SignatureController.hub.on).toHaveBeenCalledTimes(
        1,
      );
      expect(Engine.context.SignatureController.hub.on).toHaveBeenCalledWith(
        'TestMessageId:signError',
        expect.any(Function),
      );
    });
  });

  describe('shouldTruncateMessage', () => {
    it('sets truncateMessage to true if message is more then 5 characters', () => {
      const wrapper = createWrapper().dive();
      const instance = wrapper.instance() as any;
      instance.shouldTruncateMessage({
        nativeEvent: { lines: 'teste123' },
      });
      expect(instance.state.truncateMessage).toBe(true);
    });

    it('sets truncateMessage to false if message is less then 5 characters', () => {
      const wrapper = createWrapper().dive();
      const instance = wrapper.instance() as any;
      instance.shouldTruncateMessage({
        nativeEvent: { lines: 'test' },
      });
      expect(instance.state.truncateMessage).toBe(false);
    });
  });

  describe('onSignatureError', () => {
    it('track has been called', () => {
      const wrapper = createWrapper().dive();
      const instance = wrapper.instance() as any;
      const input = { error: { message: 'KeystoneError#Tx_canceled' } };
      instance.onSignatureError(input);
      expect(analyticsV2.trackEvent).toHaveBeenCalledTimes(2); // From component mount to onSignatureError, has been called 2 times
    });
  });
});
