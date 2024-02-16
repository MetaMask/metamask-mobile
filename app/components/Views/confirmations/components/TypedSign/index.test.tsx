import React from 'react';
import { shallow } from 'enzyme';
import TypedSign from '.';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';
import Engine from '../../../../../core/Engine';
import NotificationManager from '../../../../../core/NotificationManager';
import { WALLET_CONNECT_ORIGIN } from '../../../../../util/walletconnect';
import { InteractionManager } from 'react-native';
import { strings } from '../../../../../../locales/i18n';
import AppConstants from '../../../../../core/AppConstants';
import initialBackgroundState from '../../../../../util/test/initial-background-state.json';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { fireEvent, waitFor } from '@testing-library/react-native';
import MetaMetrics from '../../../core/Analytics/MetaMetrics';

jest.mock('../../../core/Analytics/MetaMetrics');

jest.mock('../../../../../core/Engine', () => ({
  acceptPendingApproval: jest.fn(),
  rejectPendingApproval: jest.fn(),
  context: {
    KeyringController: {
      state: {
        keyrings: [],
      },
      getAccountKeyringType: jest.fn(() => Promise.resolve({ data: {} })),
      getQRKeyringState: jest.fn(() =>
        Promise.resolve({ subscribe: jest.fn(), unsubscribe: jest.fn() }),
      ),
    },
    SignatureController: {
      hub: {
        on: jest.fn(),
        removeListener: jest.fn(),
      },
    },
  },
}));

jest.mock('../../../../../core/NotificationManager');

jest.mock('../../../../../util/address', () => ({
  ...jest.requireActual('../../../../../util/address'),
  getAddressAccountType: jest.fn().mockReturnValue('Metamask'),
}));

jest.mock('../../../../../util/analyticsV2');

const messageParamsMock = {
  data: { type: 'string', name: 'Message', value: 'Hi, Alice!' },
  origin: 'example.com',
  metamaskId: 'TestMessageId',
  from: '0xC4955C0d639D99699Bfd7Ec54d9FaFEe40e4D272',
};

const mockStore = configureMockStore();

const initialState = {
  engine: {
    backgroundState: {
      ...initialBackgroundState,
    },
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

const store = mockStore(initialState);

function createWrapper({
  origin = messageParamsMock.origin,
  mockConfirm = jest.fn(),
  mockReject = jest.fn(),
} = {}) {
  return shallow(
    <Provider store={store}>
      <TypedSign
        currentPageInformation={{
          title: 'title',
          url: 'http://localhost:8545',
        }}
        messageParams={{ ...messageParamsMock, origin }}
        onConfirm={mockConfirm}
        onReject={mockReject}
      />
    </Provider>,
  );
}

describe('TypedSign', () => {
  const mockConfirm = jest.fn();
  const mockReject = jest.fn();

  it('should render correctly', () => {
    const wrapper = createWrapper();
    expect(wrapper).toMatchSnapshot();
  });

  describe('onConfirm', () => {
    it('signs message', async () => {
      const origin = messageParamsMock.origin;
      const container = renderWithProvider(
        <TypedSign
          currentPageInformation={{
            title: 'title',
            url: 'http://localhost:8545',
          }}
          messageParams={{ ...messageParamsMock, origin }}
          onConfirm={mockConfirm}
          onReject={mockReject}
        />,
        { state: initialState },
      );

      expect(container).toMatchSnapshot();

      const signButton = await container.findByTestId(
        'request-signature-confirm-button',
      );
      fireEvent.press(signButton);
      expect(mockConfirm).toHaveBeenCalledTimes(1);
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

        const container = renderWithProvider(
          <TypedSign
            currentPageInformation={{
              title: _title,
              url: 'http://localhost:8545',
            }}
            messageParams={{ ...messageParamsMock, origin }}
            onConfirm={mockConfirm}
            onReject={mockReject}
          />,
          { state: initialState },
        );

        const signButton = await container.findByTestId(
          'request-signature-confirm-button',
        );
        fireEvent.press(signButton);

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
        (Engine.context.SignatureController.hub.on as any).mockImplementation(
          (_eventName: string, callback: (params: any) => void) => {
            callback({ error: new Error('error') });
          },
        );

        const container = renderWithProvider(
          <TypedSign
            currentPageInformation={{
              title: _title,
              url: 'http://localhost:8545',
            }}
            messageParams={{ ...messageParamsMock, origin }}
            onConfirm={mockConfirm}
            onReject={mockReject}
          />,
          { state: initialState },
        );

        const rejectButton = await container.findByTestId(
          'request-signature-cancel-button',
        );
        fireEvent.press(rejectButton);

        await waitFor(() => {
          expect(
            NotificationManager.showSimpleNotification,
          ).toHaveBeenCalledTimes(2);
          expect(
            NotificationManager.showSimpleNotification,
          ).toHaveBeenCalledWith({
            status: `simple_notification_rejected`,
            duration: 5000,
            title: strings('notifications.wc_signed_failed_title'),
            description: strings('notifications.wc_description'),
          });
        });
      },
    );
  });

  describe('onReject', () => {
    it('rejects message', async () => {
      mockReject.mockReset();

      const container = renderWithProvider(
        <TypedSign
          currentPageInformation={{
            title: 'title',
            url: 'http://localhost:8545',
          }}
          messageParams={{ ...messageParamsMock }}
          onConfirm={mockConfirm}
          onReject={mockReject}
        />,
        { state: initialState },
      );

      expect(container).toMatchSnapshot();

      const rejectButton = await container.findByTestId(
        'request-signature-cancel-button',
      );
      fireEvent.press(rejectButton);
      expect(mockReject).toHaveBeenCalledTimes(1);
    });

    it.each([
      ['wallet connect', WALLET_CONNECT_ORIGIN],
      ['SDK remote', AppConstants.MM_SDK.SDK_REMOTE_ORIGIN],
    ])('shows notification if origin is %s', async (_title, origin) => {
      jest
        .spyOn(InteractionManager, 'runAfterInteractions')
        .mockImplementation((callback: any) => callback());

      (NotificationManager.showSimpleNotification as any).mockReset();
      (Engine.context.SignatureController.hub.on as any).mockImplementation(
        (_eventName: string, callback: (params: any) => void) => {
          callback({ error: new Error('error') });
        },
      );

      const container = renderWithProvider(
        <TypedSign
          currentPageInformation={{
            title: _title,
            url: 'http://localhost:8545',
          }}
          messageParams={{ ...messageParamsMock, origin }}
          onConfirm={mockConfirm}
          onReject={mockReject}
        />,
        { state: initialState },
      );

      const rejectButton = await container.findByTestId(
        'request-signature-cancel-button',
      );
      fireEvent.press(rejectButton);

      await waitFor(() => {
        expect(
          NotificationManager.showSimpleNotification,
        ).toHaveBeenCalledTimes(2);
        expect(NotificationManager.showSimpleNotification).toHaveBeenCalledWith(
          {
            status: `simple_notification_rejected`,
            duration: 5000,
            title: strings('notifications.wc_signed_failed_title'),
            description: strings('notifications.wc_description'),
          },
        );
      });
    });
  });

  describe('trackEvent', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    const mockMetrics = {
      trackEvent: jest.fn(),
    };

    (MetaMetrics.getInstance as jest.Mock).mockReturnValue(mockMetrics);

    it('tracks event for rejected requests', async () => {
      mockReject.mockClear();

      const container = renderWithProvider(
        <TypedSign
          currentPageInformation={{
            title: 'title',
            url: 'http://localhost:8545',
          }}
          messageParams={{ ...messageParamsMock }}
          onConfirm={mockConfirm}
          onReject={mockReject}
        />,
        { state: initialState },
      );

      const rejectButton = await container.findByTestId(
        'request-signature-cancel-button',
      );
      fireEvent.press(rejectButton);

      expect(mockReject).toHaveBeenCalledTimes(1);

      await waitFor(() => {
        expect(mockMetrics.trackEvent.mock.calls[0][0]).toEqual(
          'Signature Rejected',
        );
        expect(mockMetrics.trackEvent.mock.calls[0][1]).toEqual({
          account_type: 'Metamask',
          dapp_host_name: undefined,
          chain_id: undefined,
          signature_type: undefined,
          version: undefined,
          security_alert_response: 'Benign',
          security_alert_reason: '',
          ppom_eth_chainId_count: 1,
        });
      });
    });

    it('tracks event for approved requests', async () => {
      const container = renderWithProvider(
        <TypedSign
          currentPageInformation={{
            title: 'title',
            url: 'http://localhost:8545',
          }}
          messageParams={{ ...messageParamsMock }}
          onConfirm={mockConfirm}
          onReject={mockReject}
        />,
        { state: initialState },
      );

      const signButton = await container.findByTestId(
        'request-signature-confirm-button',
      );
      fireEvent.press(signButton);

      await waitFor(() => {
        expect(mockMetrics.trackEvent.mock.calls[0][0]).toEqual(
          'Signature Approved',
        );
        expect(mockMetrics.trackEvent.mock.calls[0][1]).toEqual({
          account_type: 'Metamask',
          dapp_host_name: undefined,
          chain_id: undefined,
          version: undefined,
          signature_type: undefined,
          security_alert_response: 'Benign',
          security_alert_reason: '',
          ppom_eth_chainId_count: 1,
        });
      });
    });
  });
});
