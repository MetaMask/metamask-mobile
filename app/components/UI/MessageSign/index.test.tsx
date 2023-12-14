import React from 'react';
import MessageSign from './index';
import { WALLET_CONNECT_ORIGIN } from '../../../util/walletconnect';
import Engine from '../../../core/Engine';
import NotificationManager from '../../../core/NotificationManager';
import { InteractionManager } from 'react-native';
import AppConstants from '../../../core/AppConstants';
import { strings } from '../../../../locales/i18n';
import initialBackgroundState from '../../../util/test/initial-background-state.json';
import analyticsV2 from '../../../util/analyticsV2';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { act, waitFor } from '@testing-library/react-native';
import { KEYSTONE_TX_CANCELED } from '../../../constants/error';
import { MetaMetricsEvents } from '../../../core/Analytics';
// eslint-disable-next-line import/no-namespace
import * as addressUtils from '../../../util/address';
import createExternalSignModelNav from '../../../util/hardwareWallet/signatureUtils';

const fakeAddress = '0xE413f7dB07f9B93936189867588B1440D823e651';

jest.mock('../../../core/Engine', () => ({
  acceptPendingApproval: jest.fn(),
  rejectPendingApproval: jest.fn(),
  context: {
    SignatureController: {
      hub: {
        on: jest.fn(),
        removeListener: jest.fn(),
      },
    },
    KeyringController: {
      state: {
        keyrings: [{ accounts: [fakeAddress] }],
      },
    },
  },
}));

const EngineMock = Engine as jest.Mocked<typeof Engine>;

jest.mock('../../../core/NotificationManager', () => ({
  showSimpleNotification: jest.fn(),
}));

jest.mock('../../../util/analyticsV2');

jest.mock('../../../util/address', () => ({
  ...jest.requireActual('../../../util/address'),
  isExternalHardwareAccount: jest.fn(),
}));

const addressUtilsMock = addressUtils as jest.Mocked<typeof addressUtils>;

jest.mock('../../../util/hardwareWallet/signatureUtils', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation((...args) => [args]),
}));

const createExternalSignModelNavMock =
  createExternalSignModelNav as jest.MockedFunction<
    typeof createExternalSignModelNav
  >;

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: jest.fn(),
    }),
  };
});

jest.mock('../SignatureRequest', () => (props: any) => (
  <div {...{ ...props, testID: 'SignatureRequest' }}>
    <span>SignatureRequest Component</span>
    {props.children}
  </div>
));

jest.mock('../SignatureRequest/ExpandedMessage', () => (props: any) => (
  <div {...{ ...props, testID: 'ExpandedMessage' }}>
    <span>ExpandedMessage Component</span>
    {props.children}
  </div>
));

const messageParamsMock = {
  data: 'message',
  origin: 'example.com',
  metamaskId: 'TestMessageId',
  from: '0xE413f7dB07f9B93936189867588B1440D823e651',
};

const initialState = {
  engine: {
    backgroundState: initialBackgroundState,
  },
  signatureRequest: {
    securityAlertResponse: {
      description: '',
      features: [],
      providerRequestsCount: { eth_chainId: 1 },
      reason: '',
      result_type: 'Benign',
    },
  },
};

function createContainer({
  origin = messageParamsMock.origin,
  mockConfirm = jest.fn(),
  mockReject = jest.fn(),
  showExpandedMessage = false,
} = {}) {
  return renderWithProvider(
    <MessageSign
      currentPageInformation={{
        title: 'title',
        url: 'http://localhost:8545',
      }}
      messageParams={{ ...messageParamsMock, origin }}
      onConfirm={mockConfirm}
      onReject={mockReject}
      toggleExpandedMessage={jest.fn()}
      showExpandedMessage={showExpandedMessage}
    />,
    { state: initialState },
  );
}

describe('MessageSign', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('SignatureRequest', () => {
    it('should render correctly', () => {
      const container = createContainer();

      expect(Engine.context.SignatureController.hub.on).toHaveBeenCalledTimes(
        1,
      );
      expect(Engine.context.SignatureController.hub.on).toHaveBeenCalledWith(
        'TestMessageId:signError',
        expect.any(Function),
      );
      expect(analyticsV2.trackEvent).toHaveBeenCalledTimes(1);
      expect(
        Engine.context.SignatureController.hub.removeListener,
      ).toHaveBeenCalledTimes(0);

      expect(container).toMatchSnapshot();
    });

    describe('onConfirm', () => {
      it('signs message', async () => {
        const onConfirmMock = jest.fn();
        const container = createContainer({ mockConfirm: onConfirmMock });
        await container.getByTestId('SignatureRequest').props.onConfirm();
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

        const container = createContainer({ origin });
        await container.getByTestId('SignatureRequest').props.onConfirm();

        await waitFor(() => {
          expect(
            NotificationManager.showSimpleNotification,
          ).toHaveBeenCalledTimes(1);
          expect(
            NotificationManager.showSimpleNotification,
          ).toHaveBeenCalledWith({
            status: `simple_notification`,
            duration: 5000,
            title: strings('notifications.wc_signed_title'),
            description: strings('notifications.wc_description'),
          });
        });
      });

      it('harware wallet navigates to external signature modal', async () => {
        addressUtilsMock.isExternalHardwareAccount.mockReturnValueOnce(true);
        const container = createContainer();
        await container.getByTestId('SignatureRequest').props.onConfirm();

        expect(createExternalSignModelNavMock).toHaveBeenCalledTimes(1);
        expect(createExternalSignModelNavMock).toHaveBeenCalledWith(
          expect.any(Function),
          expect.any(Function),
          messageParamsMock,
          'eth_sign',
        );
      });
    });

    describe('onReject', () => {
      it('rejects message', async () => {
        const onRejectMock = jest.fn();
        const container = createContainer({ mockReject: onRejectMock });
        await container.getByTestId('SignatureRequest').props.onReject();

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

        const container = createContainer({ origin });
        await container.getByTestId('SignatureRequest').props.onReject();

        await waitFor(() => {
          expect(
            NotificationManager.showSimpleNotification,
          ).toHaveBeenCalledTimes(1);
          expect(
            NotificationManager.showSimpleNotification,
          ).toHaveBeenCalledWith({
            status: `simple_notification_rejected`,
            duration: 5000,
            title: strings('notifications.wc_signed_rejected_title'),
            description: strings('notifications.wc_description'),
          });
        });
      });
    });

    describe('trackEvent', () => {
      it('tracks event for rejected requests', async () => {
        const container = createContainer();
        await container.getByTestId('SignatureRequest').props.onReject();

        expect((analyticsV2.trackEvent as jest.Mock).mock.calls[1][0]).toEqual({
          category: 'Signature Rejected',
        });
        expect((analyticsV2.trackEvent as jest.Mock).mock.calls[1][1]).toEqual({
          account_type: 'MetaMask',
          dapp_host_name: undefined,
          chain_id: undefined,
          signature_type: 'eth_sign',
          security_alert_response: 'Benign',
          security_alert_reason: '',
          ppom_eth_chainId_count: 1,
          version: undefined,
        });
      });

      it('tracks event for approved requests', async () => {
        const container = createContainer();
        await container.getByTestId('SignatureRequest').props.onConfirm();

        expect((analyticsV2.trackEvent as jest.Mock).mock.calls[1][0]).toEqual({
          category: 'Signature Approved',
        });
        expect((analyticsV2.trackEvent as jest.Mock).mock.calls[1][1]).toEqual({
          account_type: 'MetaMask',
          dapp_host_name: undefined,
          chain_id: undefined,
          signature_type: 'eth_sign',
          security_alert_response: 'Benign',
          security_alert_reason: '',
          ppom_eth_chainId_count: 1,
          version: undefined,
        });
      });
    });

    describe('shouldTruncateMessage', () => {
      it('sets truncateMessage to true if message is more then 5 characters', async () => {
        const container = createContainer();

        expect(
          container.getByTestId('SignatureRequest').props.truncateMessage,
        ).toBe(false);

        await act(() => {
          container.getByText(messageParamsMock.data).props.onTextLayout({
            nativeEvent: { lines: 'teste123' },
          });
        });

        expect(
          container.getByTestId('SignatureRequest').props.truncateMessage,
        ).toBe(true);
      });

      it('sets truncateMessage to false if message is less then 5 characters', async () => {
        const container = createContainer();

        expect(
          container.getByTestId('SignatureRequest').props.truncateMessage,
        ).toBe(false);

        await act(() => {
          container.getByText(messageParamsMock.data).props.onTextLayout({
            nativeEvent: { lines: 'test' },
          });
        });

        expect(
          container.getByTestId('SignatureRequest').props.truncateMessage,
        ).toBe(false);
      });
    });
  });

  describe('ExpandedMessage', () => {
    it('should render ExpandedMessage correctly', () => {
      const container = createContainer({ showExpandedMessage: true });

      expect(Engine.context.SignatureController.hub.on).toHaveBeenCalledTimes(
        1,
      );
      expect(Engine.context.SignatureController.hub.on).toHaveBeenCalledWith(
        'TestMessageId:signError',
        expect.any(Function),
      );
      expect(analyticsV2.trackEvent).toHaveBeenCalledTimes(1);
      expect(
        Engine.context.SignatureController.hub.removeListener,
      ).toHaveBeenCalledTimes(0);

      expect(container).toMatchSnapshot();
    });

    it('should render Message text correctly', () => {
      const container = createContainer({ showExpandedMessage: true });
      expect(
        container.getByTestId('ExpandedMessage').props.renderMessage(),
      ).toMatchSnapshot();
    });
  });

  describe('unmount', () => {
    it('removes listeners', () => {
      const container = createContainer();
      container.unmount();
      expect(
        Engine.context.SignatureController.hub.removeListener,
      ).toHaveBeenCalledTimes(1);
      expect(
        Engine.context.SignatureController.hub.removeListener,
      ).toHaveBeenCalledWith('TestMessageId:signError', expect.any(Function));
    });
  });

  describe('onSignatureError', () => {
    let events: any;
    beforeEach(() => {
      events = {};

      EngineMock.context.SignatureController.hub.on.mockImplementationOnce(
        (event: any, callback: any) => {
          events[event] = callback;
        },
      );
    });

    it('track has been called when error message starts with KeystoneError#Tx_canceled', async () => {
      createContainer();
      events['TestMessageId:signError']({
        error: new Error(KEYSTONE_TX_CANCELED),
      });
      await waitFor(() => {
        expect(analyticsV2.trackEvent).toHaveBeenCalledTimes(2);
        expect((analyticsV2.trackEvent as jest.Mock).mock.calls[1][0]).toEqual(
          MetaMetricsEvents.QR_HARDWARE_TRANSACTION_CANCELED,
        );
      });
    });
  });
});
