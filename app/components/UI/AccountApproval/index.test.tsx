import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import AccountApproval from '.';
import { backgroundState } from '../../../util/test/initial-root-state';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../util/test/accountsControllerTestUtils';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { AccountApprovalSelectorsIDs } from './AccountApproval.testIds';
import { CommonSelectorsIDs } from '../../../util/Common.testIds';
import { CONNECTING_TO_A_DECEPTIVE_SITE } from '../../../constants/urls';

const mockTrackEvent = jest.fn();
jest.mock('../../../util/analytics/analytics', () => ({
  analytics: {
    trackEvent: (...args: unknown[]) => mockTrackEvent(...args),
    isEnabled: jest.fn().mockReturnValue(true),
  },
}));

jest.mock('../../../util/analytics/AnalyticsEventBuilder', () => {
  const createEventBuilder = (eventName: string) => {
    const builder = {
      addProperties: jest.fn(),
      addSensitiveProperties: jest.fn(),
      build: jest.fn(() => ({ name: eventName })),
    };
    builder.addProperties.mockReturnValue(builder);
    builder.addSensitiveProperties.mockReturnValue(builder);
    return builder;
  };
  return {
    AnalyticsEventBuilder: { createEventBuilder },
  };
});

const mockGetPhishingTestResultAsync = jest.fn().mockResolvedValue({
  result: false,
});
jest.mock('../../../util/phishingDetection', () => ({
  getPhishingTestResultAsync: (origin: string) =>
    mockGetPhishingTestResultAsync(origin),
}));

const mockOpenURL = jest.fn();
jest.mock('react-native/Libraries/Linking/Linking', () => ({
  openURL: (url: string) => mockOpenURL(url),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
}));

const mockRemoveChannel = jest.fn();
jest.mock('../../../core/SDKConnect/SDKConnect', () => ({
  __esModule: true,
  default: {
    getInstance: () => ({
      removeChannel: mockRemoveChannel,
      invalidateChannel: jest.fn(),
    }),
  },
}));

jest.mock('../AccountInfoCard', () => {
  const ReactActual = jest.requireActual<typeof import('react')>('react');
  const { Text } =
    jest.requireActual<typeof import('react-native')>('react-native');
  return {
    __esModule: true,
    default: function MockAccountInfoCard() {
      return ReactActual.createElement(Text, null, 'Mock Account Info');
    },
  };
});

jest.mock('../../../core/Engine', () => {
  const { MOCK_ACCOUNTS_CONTROLLER_STATE: mockAccountsControllerState } =
    jest.requireActual('../../../util/test/accountsControllerTestUtils');
  return {
    context: {
      PhishingController: {
        maybeUpdateState: jest.fn(),
        test: jest.fn((url: string) => {
          if (url === 'phishing.com') return { result: true };
          return { result: false };
        }),
        scanUrl: jest.fn((url: string) => {
          if (url === 'phishing.com') return { recommendedAction: 'BLOCK' };
          return { recommendedAction: 'NONE' };
        }),
      },
      KeyringController: {
        getAccountKeyringType: () => Promise.resolve('HD Key Tree'),
        state: {
          keyrings: [
            {
              accounts: ['0xC4966c0D659D99699BFD7EB54D8fafEE40e4a756'],
              metadata: {
                id: '01JNG71B7GTWH0J1TSJY9891S0',
                name: '',
              },
            },
          ],
        },
      },
      AccountsController: {
        ...mockAccountsControllerState,
        state: mockAccountsControllerState,
      },
    },
  };
});

const mockInitialState = {
  engine: {
    backgroundState: {
      ...backgroundState,
      AccountsController: {
        ...MOCK_ACCOUNTS_CONTROLLER_STATE,
        accounts: {
          '0xC4966c0D659D99699BFD7EB54D8fafEE40e4a756': {
            balance: '0x0',
            name: 'Account 1',
            address: '0xC4966c0D659D99699BFD7EB54D8fafEE40e4a756',
          },
        },
      },
      TokensController: {
        allTokens: {
          '0x1': {
            '0xc4966c0d659d99699bfd7eb54d8fafee40e4a756': [],
          },
        },
      },
    },
  },
};

describe('AccountApproval', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetPhishingTestResultAsync.mockResolvedValue({ result: false });
  });

  it('renders correctly', () => {
    const container = renderWithProvider(
      <AccountApproval
        currentPageInformation={{ icon: '', url: '', title: '' }}
      />,
      { state: mockInitialState },
    );

    expect(container).toMatchSnapshot();
  });

  it('tracks CONNECT_REQUEST_STARTED on mount', () => {
    renderWithProvider(
      <AccountApproval
        currentPageInformation={{
          icon: '',
          url: 'https://example.com',
          title: '',
        }}
      />,
      { state: mockInitialState },
    );

    expect(mockTrackEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        name: MetaMetricsEvents.CONNECT_REQUEST_STARTED,
      }),
    );
  });

  it('tracks CONNECT_REQUEST_CANCELLED when cancel is pressed', () => {
    const onCancel = jest.fn();
    const { getByTestId } = renderWithProvider(
      <AccountApproval
        currentPageInformation={{ icon: '', url: '', title: '' }}
        onCancel={onCancel}
      />,
      { state: mockInitialState },
    );

    mockTrackEvent.mockClear();
    fireEvent.press(getByTestId(CommonSelectorsIDs.CANCEL_BUTTON));

    expect(mockTrackEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        name: MetaMetricsEvents.CONNECT_REQUEST_CANCELLED,
      }),
    );
    expect(onCancel).toHaveBeenCalled();
  });

  it('tracks CONNECT_REQUEST_COMPLETED when connect is pressed', () => {
    const onConfirm = jest.fn();
    const { getByTestId } = renderWithProvider(
      <AccountApproval
        currentPageInformation={{ icon: '', url: '', title: '' }}
        onConfirm={onConfirm}
      />,
      { state: mockInitialState },
    );

    mockTrackEvent.mockClear();
    fireEvent.press(getByTestId(CommonSelectorsIDs.CONNECT_BUTTON));

    expect(mockTrackEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        name: MetaMetricsEvents.CONNECT_REQUEST_COMPLETED,
      }),
    );
    expect(onConfirm).toHaveBeenCalled();
  });

  it('renders warning banner when hostname is flagged as phishing', async () => {
    mockGetPhishingTestResultAsync.mockResolvedValueOnce({ result: true });

    const { findByText } = renderWithProvider(
      <AccountApproval
        currentPageInformation={{ icon: '', url: 'phishing.com', title: '' }}
      />,
      { state: mockInitialState },
    );

    const warningText = await findByText('Deceptive site ahead');
    expect(warningText).toBeOnTheScreen();
  });

  it('tracks EXTERNAL_LINK_CLICKED and opens URL when Learn more is pressed in phishing banner', async () => {
    mockGetPhishingTestResultAsync.mockResolvedValueOnce({ result: true });

    const { findByText } = renderWithProvider(
      <AccountApproval
        currentPageInformation={{ icon: '', url: 'phishing.com', title: '' }}
      />,
      { state: mockInitialState },
    );

    const learnMore = await findByText('Learn more');
    mockTrackEvent.mockClear();
    fireEvent.press(learnMore);

    expect(mockOpenURL).toHaveBeenCalledWith(CONNECTING_TO_A_DECEPTIVE_SITE);
    expect(mockTrackEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        name: MetaMetricsEvents.EXTERNAL_LINK_CLICKED,
      }),
    );
  });

  it('tracks CONNECT_REQUEST_OTPFAILURE when connect is pressed with wrong OTP selected', () => {
    const onCancel = jest.fn();
    const mockNavigate = jest.fn();
    const currentPageInformation = {
      icon: '',
      url: 'https://example.com',
      title: '',
      origin: 'qr-code',
      reconnect: true,
      apiVersion: 'v1',
      otps: ['first', 'second'],
      channelId: 'test-channel-id',
    };

    const { getByTestId } = renderWithProvider(
      <AccountApproval
        currentPageInformation={currentPageInformation}
        onCancel={onCancel}
        navigation={{ navigate: mockNavigate }}
      />,
      { state: mockInitialState },
    );

    mockTrackEvent.mockClear();
    fireEvent.press(
      getByTestId(AccountApprovalSelectorsIDs.getOtpOption('second')),
    );
    fireEvent.press(getByTestId(CommonSelectorsIDs.CONNECT_BUTTON));

    expect(mockTrackEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        name: MetaMetricsEvents.CONNECT_REQUEST_OTPFAILURE,
      }),
    );
    expect(onCancel).toHaveBeenCalled();
    expect(mockRemoveChannel).toHaveBeenCalledWith('test-channel-id', true);
  });
});
