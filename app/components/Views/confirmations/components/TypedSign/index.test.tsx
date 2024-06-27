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
import { MetaMetrics } from '../../../../../core/Analytics';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../../../util/test/accountsControllerTestUtils';
import { SigningModalSelectorsIDs } from '../../../../../../e2e/selectors/Modals/SigningModal.selectors';

jest.mock('../../../../../core/Analytics/MetaMetrics');

const mockMetrics = {
  trackEvent: jest.fn(),
};

(MetaMetrics.getInstance as jest.Mock).mockReturnValue(mockMetrics);

jest.mock('../../../../../core/Engine', () => ({
  acceptPendingApproval: jest.fn(),
  rejectPendingApproval: jest.fn(),
  context: {
    KeyringController: {
      state: {
        keyrings: [],
      },
      getAccountKeyringType: jest.fn(() => Promise.resolve({ data: {} })),
      getOrAddQRKeyring: jest.fn(),
    },
    SignatureController: {
      hub: {
        on: jest.fn(),
        removeListener: jest.fn(),
      },
    },
  },
  controllerMessenger: {
    subscribe: jest.fn(),
  },
}));

jest.mock('../../../../../core/NotificationManager');

jest.mock('../../../../../util/address', () => ({
  ...jest.requireActual('../../../../../util/address'),
  getAddressAccountType: jest.fn().mockReturnValue('Metamask'),
}));

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
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
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
        SigningModalSelectorsIDs.SIGN_BUTTON,
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
          // TODO: Replace "any" with type
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .mockImplementation((callback: any) => callback());

        // TODO: Replace "any" with type
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
          SigningModalSelectorsIDs.SIGN_BUTTON,
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
          // TODO: Replace "any" with type
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .mockImplementation((callback: any) => callback());

        // TODO: Replace "any" with type
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (NotificationManager.showSimpleNotification as any).mockReset();
        // TODO: Replace "any" with type
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (Engine.context.SignatureController.hub.on as any).mockImplementation(
          // TODO: Replace "any" with type
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
          SigningModalSelectorsIDs.CANCEL_BUTTON,
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
        SigningModalSelectorsIDs.CANCEL_BUTTON,
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
        // TODO: Replace "any" with type
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .mockImplementation((callback: any) => callback());

      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (NotificationManager.showSimpleNotification as any).mockReset();
      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (Engine.context.SignatureController.hub.on as any).mockImplementation(
        // TODO: Replace "any" with type
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
        SigningModalSelectorsIDs.CANCEL_BUTTON,
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
        SigningModalSelectorsIDs.CANCEL_BUTTON,
      );
      fireEvent.press(rejectButton);

      expect(mockReject).toHaveBeenCalledTimes(1);

      const rejectedMocks = mockMetrics.trackEvent.mock.calls.filter(
        (call) => call[0].category === 'Signature Rejected',
      );

      const mockCallsLength = rejectedMocks.length;

      const lastMockCall = rejectedMocks[mockCallsLength - 1];

      expect(lastMockCall[0]).toEqual({ category: 'Signature Rejected' });
      expect(lastMockCall[1]).toEqual({
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
        SigningModalSelectorsIDs.SIGN_BUTTON,
      );
      fireEvent.press(signButton);

      const signedMocks = mockMetrics.trackEvent.mock.calls.filter(
        (call) => call[0].category === 'Signature Approved',
      );

      const mockCallsLength = signedMocks.length;

      const lastMockCall = signedMocks[mockCallsLength - 1];

      expect(lastMockCall[0]).toEqual({ category: 'Signature Approved' });
      expect(lastMockCall[1]).toEqual({
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
