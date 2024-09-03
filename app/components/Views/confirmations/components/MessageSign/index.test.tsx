import React from 'react';
import MessageSign from './index';
import { WALLET_CONNECT_ORIGIN } from '../../../../../util/walletconnect';
import Engine from '../../../../../core/Engine';
import NotificationManager from '../../../../../core/NotificationManager';
import { InteractionManager } from 'react-native';
import AppConstants from '../../../../../core/AppConstants';
import { strings } from '../../../../../../locales/i18n';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { act, waitFor } from '@testing-library/react-native';
// eslint-disable-next-line import/no-namespace
import * as addressUtils from '../../../../../util/address';
import createExternalSignModelNav from '../../../../../util/hardwareWallet/signatureUtils';
import { useMetrics } from '../../../../../components/hooks/useMetrics';

const fakeAddress = '0xE413f7dB07f9B93936189867588B1440D823e651';

jest.mock('../../../../../components/hooks/useMetrics');

jest.mock('../../../../../core/Engine', () => ({
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

jest.mock('../../../../../core/NotificationManager', () => ({
  showSimpleNotification: jest.fn(),
}));

jest.mock('../../../../../util/address', () => ({
  ...jest.requireActual('../../../../../util/address'),
  isExternalHardwareAccount: jest.fn(),
}));

const addressUtilsMock = addressUtils as jest.Mocked<typeof addressUtils>;

jest.mock('../../../../../util/hardwareWallet/signatureUtils', () => ({
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

// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
jest.mock('../SignatureRequest', () => (props: any) => (
  <div {...{ ...props, testID: 'SignatureRequest' }}>
    <span>SignatureRequest Component</span>
    {props.children}
  </div>
));

// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    backgroundState,
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

const mockTrackEvent = jest.fn();
(useMetrics as jest.Mock).mockReturnValue({
  trackEvent: mockTrackEvent,
});

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
          // TODO: Replace "any" with type
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .mockImplementation((callback: any) => callback());

        // TODO: Replace "any" with type
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
          // TODO: Replace "any" with type
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .mockImplementation((callback: any) => callback());

        // TODO: Replace "any" with type
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (NotificationManager.showSimpleNotification as any).mockReset();
        // TODO: Replace "any" with type
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
});
