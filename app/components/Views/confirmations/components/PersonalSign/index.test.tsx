import React from 'react';
import { shallow } from 'enzyme';
import PersonalSign from '.';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import { WALLET_CONNECT_ORIGIN } from '../../../../../util/walletconnect';
import SignatureRequest from '../SignatureRequest';
import Engine from '../../../../../core/Engine';
import NotificationManager from '../../../../../core/NotificationManager';
import { InteractionManager } from 'react-native';
import AppConstants from '../../../../../core/AppConstants';
import { strings } from '../../../../../../locales/i18n';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import { useMetrics } from '../../../../../components/hooks/useMetrics';

jest.mock('../../../../../components/hooks/useMetrics');
jest.mock('../../../../../core/Engine', () => ({
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
    PreferencesController: {
      state: {
        securityAlertsEnabled: true,
      },
    },
  },
}));

jest.mock('../../../../../core/NotificationManager', () => ({
  showSimpleNotification: jest.fn(),
}));

jest.mock('../../../../../lib/ppom/ppom-util', () => ({
  ...jest.requireActual('../../../../../lib/ppom/ppom-util'),
  isChainSupported: jest.fn().mockResolvedValue(true),
}));

jest.mock('@react-navigation/native');

const messageParamsMock = {
  data: 'message',
  from: '0xC4955C0d639D99699Bfd7Ec54d9FaFEe40e4D272',
  origin: 'origin',
  metamaskId: 'id',
};

const mockStore = configureMockStore();

const initialState = {
  engine: {
    backgroundState,
  },
};

const store = mockStore(initialState);

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  useSelector: (callback: any) =>
    callback({
      signatureRequest: {
        securityAlertResponse: {
          description: '',
          features: [],
          providerRequestsCount: { eth_chainId: 1 },
          reason: '',
          result_type: 'Benign',
        },
      },
    }),
}));

jest.mock('../../../../../util/address', () => ({
  getAddressAccountType: jest.fn().mockReturnValue('Metamask'),
  isExternalHardwareAccount: jest.fn().mockReturnValue(false),
}));

const mockTrackEvent = jest.fn();
(useMetrics as jest.Mock).mockReturnValue({
  trackEvent: mockTrackEvent,
});

function createWrapper({
  origin = messageParamsMock.origin,
  mockConfirm = jest.fn(),
  mockReject = jest.fn(),
} = {}) {
  return shallow(
    <Provider store={store}>
      <PersonalSign
        currentPageInformation={{
          title: 'title',
          url: 'http://localhost:8545',
        }}
        messageParams={{
          ...messageParamsMock,
          origin,
        }}
        onConfirm={mockConfirm}
        onReject={mockReject}
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
      const onConfirmMock = jest.fn();
      const wrapper = createWrapper({ mockConfirm: onConfirmMock }).dive();
      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (wrapper.find(SignatureRequest).props() as any).onConfirm();

      expect(onConfirmMock).toHaveBeenCalledTimes(1);
    });

    it.each([
      ['wallet connect', WALLET_CONNECT_ORIGIN],
      ['SDK remote', AppConstants.MM_SDK.SDK_REMOTE_ORIGIN],
    ])('shows notification if origin is %s', async (_title, origin) => {
      jest
        .spyOn(InteractionManager, 'runAfterInteractions')
        // TODO: Replace "any" with type
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .mockImplementation((callback: any) => callback());

      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (NotificationManager.showSimpleNotification as any).mockReset();

      const wrapper = createWrapper({ origin }).dive();
      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (wrapper.find(SignatureRequest).props() as any).onReject();

      expect(onRejectMock).toHaveBeenCalledTimes(1);
    });

    it.each([
      ['wallet connect', WALLET_CONNECT_ORIGIN],
      ['SDK remote', AppConstants.MM_SDK.SDK_REMOTE_ORIGIN],
    ])('shows notification if origin is %s', async (_title, origin) => {
      jest
        .spyOn(InteractionManager, 'runAfterInteractions')
        // TODO: Replace "any" with type
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .mockImplementation((callback: any) => callback());

      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (NotificationManager.showSimpleNotification as any).mockReset();
      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (Engine.context.SignatureController.hub.on as any).mockReset();

      const wrapper = createWrapper({ origin }).dive();
      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  describe('trackEvent', () => {
    it('tracks event for rejected requests', async () => {
      const wrapper = createWrapper().dive();
      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (wrapper.find(SignatureRequest).props() as any).onReject();

      const rejectedMocks = (mockTrackEvent as jest.Mock).mock.calls.filter(
        (call) => call[0].category === 'Signature Rejected',
      );

      const mockCallsLength = rejectedMocks.length;

      const lastMockCall = rejectedMocks[mockCallsLength - 1];

      expect(lastMockCall[0]).toEqual({ category: 'Signature Rejected' });
      expect(lastMockCall[1]).toEqual({
        account_type: 'Metamask',
        dapp_host_name: 'localhost:8545',
        chain_id: undefined,
        signature_type: 'personal_sign',
        security_alert_response: 'Benign',
        security_alert_reason: '',
        ppom_eth_chainId_count: 1,
      });
    });

    it('tracks event for approved requests', async () => {
      const wrapper = createWrapper().dive();
      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (wrapper.find(SignatureRequest).props() as any).onConfirm();

      const signedMocks = (mockTrackEvent as jest.Mock).mock.calls.filter(
        (call) => call[0].category === 'Signature Approved',
      );

      const mockCallsLength = signedMocks.length;

      const lastMockCall = signedMocks[mockCallsLength - 1];

      expect(lastMockCall[0]).toEqual({ category: 'Signature Approved' });
      expect(lastMockCall[1]).toEqual({
        account_type: 'Metamask',
        dapp_host_name: 'localhost:8545',
        chain_id: undefined,
        signature_type: 'personal_sign',
        security_alert_response: 'Benign',
        security_alert_reason: '',
        ppom_eth_chainId_count: 1,
      });
    });
  });
});
