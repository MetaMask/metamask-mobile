import React from 'react';
import { shallow } from 'enzyme';
import TypedSign from '.';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';
import Engine from '../../../../../../core/Engine';
import NotificationManager from '../../../../../../core/NotificationManager';
import { WALLET_CONNECT_ORIGIN } from '../../../../../../util/walletconnect';
import { InteractionManager } from 'react-native';
import { strings } from '../../../../../../../locales/i18n';
import AppConstants from '../../../../../../core/AppConstants';
import { backgroundState } from '../../../../../../util/test/initial-root-state';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { MetaMetrics } from '../../../../../../core/Analytics';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../../../../util/test/accountsControllerTestUtils';
import { SigningBottomSheetSelectorsIDs } from '../SigningBottomSheet.testIds';
import { Reason, ResultType } from '../BlockaidBanner/BlockaidBanner.types';

jest.mock('../../../../../../core/Analytics/MetaMetrics');

jest.mock('../../../../../../util/analytics/analytics', () => ({
  analytics: {
    isEnabled: jest.fn(() => false),
    trackEvent: jest.fn(),
    optIn: jest.fn().mockResolvedValue(undefined),
    optOut: jest.fn().mockResolvedValue(undefined),
    getAnalyticsId: jest.fn().mockResolvedValue('test-analytics-id'),
    identify: jest.fn(),
    trackView: jest.fn(),
    isOptedIn: jest.fn().mockResolvedValue(false),
  },
}));

jest.mock('../../../../../UI/AccountInfoCard', () => ({
  __esModule: true,
  default: () => null,
}));

const mockMetrics = {
  trackEvent: jest.fn(),
  updateDataRecordingFlag: jest.fn(),
};

(MetaMetrics.getInstance as jest.Mock).mockReturnValue(mockMetrics);

jest.mock('../../../../../../core/Engine', () => {
  const { MOCK_ACCOUNTS_CONTROLLER_STATE: mockAccountsControllerState } =
    jest.requireActual(
      '../../../../../../util/test/accountsControllerTestUtils',
    );
  return {
    acceptPendingApproval: jest.fn(),
    rejectPendingApproval: jest.fn(),
    context: {
      KeyringController: {
        state: {
          keyrings: [],
        },
        getAccountKeyringType: jest.fn(() => Promise.resolve({ data: {} })),
      },
      SignatureController: {
        hub: {
          on: jest.fn(),
          removeListener: jest.fn(),
        },
      },
      PreferencesController: {
        state: {
          securityAlertsEnabled: true,
        },
      },
      AccountsController: {
        ...mockAccountsControllerState,
        state: mockAccountsControllerState,
      },
    },
    controllerMessenger: {
      subscribe: jest.fn(),
    },
  };
});

jest.mock('../../../../../../core/NotificationManager');

jest.mock('../../../../../../util/address', () => ({
  ...jest.requireActual('../../../../../../util/address'),
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
      ...backgroundState,
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
    },
  },
  signatureRequest: {
    securityAlertResponse: {
      description: '',
      features: [],
      providerRequestsCount: { eth_chainId: 1 },
      reason: Reason.notApplicable,
      result_type: ResultType.Benign,
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
        SigningBottomSheetSelectorsIDs.SIGN_BUTTON,
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
          SigningBottomSheetSelectorsIDs.SIGN_BUTTON,
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
          SigningBottomSheetSelectorsIDs.CANCEL_BUTTON,
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
        SigningBottomSheetSelectorsIDs.CANCEL_BUTTON,
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
        SigningBottomSheetSelectorsIDs.CANCEL_BUTTON,
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

  // FIXME: This test suite is failing because the event test is going far beyond its scope
  //   this should be refactored to test only the event tracking on the TypedSign component
  //   and not the whole event tracking system (including events from app/util/confirmation/signatureUtils.js)
  // eslint-disable-next-line jest/no-disabled-tests
  describe.skip('trackEvent', () => {
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
        SigningBottomSheetSelectorsIDs.CANCEL_BUTTON,
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
        dapp_host_name: 'N/A',
        chain_id: '1',
        signature_type: undefined,
        version: 'N/A',
        security_alert_response: 'Benign',
        security_alert_source: undefined,
        security_alert_reason: Reason.notApplicable,
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
        SigningBottomSheetSelectorsIDs.SIGN_BUTTON,
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
        dapp_host_name: 'N/A',
        chain_id: '1',
        version: 'N/A',
        signature_type: undefined,
        security_alert_response: 'Benign',
        security_alert_source: undefined,
        security_alert_reason: Reason.notApplicable,
        ppom_eth_chainId_count: 1,
      });
    });
  });
});
