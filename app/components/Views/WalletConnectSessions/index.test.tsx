import { waitFor, fireEvent } from '@testing-library/react-native';
import { Alert } from 'react-native';
import ActionSheet from '@metamask/react-native-actionsheet';
import WalletConnectSessions from './';
import { renderScreen } from '../../../util/test/renderWithProvider';
import Routes from '../../../constants/navigation/Routes';
import { ExperimentalSelectorsIDs } from '../Settings/ExperimentalSettings/ExperimentalView.testIds';
import WC2Manager from '../../../core/WalletConnect/WalletConnectV2';
import Logger from '../../../util/Logger';

const mockGetSessions = jest.fn();
const mockRemoveSession = jest.fn();

jest.mock('../../../core/WalletConnect/WalletConnectV2', () => ({
  __esModule: true,
  isWC2Enabled: true,
  default: {
    getInstance: jest.fn(),
  },
}));

jest.mock('../../../util/Logger', () => ({
  log: jest.fn(),
  error: jest.fn(),
}));

// Mock useFavicon to avoid favicon fetching in tests
jest.mock('../../../components/hooks/useFavicon', () => ({
  __esModule: true,
  default: () => ({
    faviconURI: {},
    isLoading: false,
    isLoaded: true,
  }),
}));

// Mock ActionSheet to avoid native module issues
jest.mock('@metamask/react-native-actionsheet', () => {
  const ReactActual = jest.requireActual('react');
  const ReactNative = jest.requireActual('react-native');

  return ReactActual.forwardRef(
    (
      props: { onPress: (index: number) => void; testID?: string },
      ref: unknown,
    ) => {
      ReactActual.useImperativeHandle(ref, () => ({
        show: jest.fn(),
      }));
      return ReactActual.createElement(ReactNative.View, {
        testID: props.testID || 'action-sheet',
        ...props,
      });
    },
  );
});

const mockAlert = jest.fn();

describe('WalletConnectSessions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(mockAlert);
    mockGetSessions.mockReturnValue([]);
    mockRemoveSession.mockResolvedValue(undefined);
    (WC2Manager.getInstance as jest.Mock).mockResolvedValue({
      getSessions: () => mockGetSessions(),
      removeSession: mockRemoveSession,
    });
  });

  it('does not render when not ready', () => {
    const { toJSON } = renderScreen(WalletConnectSessions, {
      name: Routes.WALLET.WALLET_CONNECT_SESSIONS_VIEW,
    });
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders empty component with no active sessions', async () => {
    mockGetSessions.mockReturnValue([]);

    const { getByTestId, toJSON } = renderScreen(WalletConnectSessions, {
      name: Routes.WALLET.WALLET_CONNECT_SESSIONS_VIEW,
    });

    // Wait for the component to be ready and render the empty state
    await waitFor(() => {
      const emptyMessage = getByTestId(ExperimentalSelectorsIDs.CONTAINER);
      expect(emptyMessage).toBeTruthy();
      expect(toJSON()).toMatchSnapshot();
    });
  });

  it('should render active sessions', async () => {
    const sessions = [
      {
        id: 1,
        topic: 'topic1',
        peer: {
          metadata: { name: 'Session 1', url: 'https://example.com' },
        },
      },
      {
        id: 2,
        topic: 'topic2',
        peer: {
          metadata: { name: 'Session 2', url: 'https://example.org' },
        },
      },
    ];

    mockGetSessions.mockReturnValue(sessions);

    const { getByTestId, toJSON } = renderScreen(WalletConnectSessions, {
      name: Routes.WALLET.WALLET_CONNECT_SESSIONS_VIEW,
    });

    await waitFor(() => {
      const viewID = getByTestId(ExperimentalSelectorsIDs.CONTAINER);
      expect(viewID).toBeTruthy();
      expect(toJSON()).toMatchSnapshot();
    });
  });

  it('should render session with description', async () => {
    const sessions = [
      {
        id: 1,
        topic: 'topic1',
        peer: {
          metadata: {
            name: 'Session with description',
            url: 'https://example.com',
            description: 'This is a test dApp description',
          },
        },
      },
    ];

    mockGetSessions.mockReturnValue(sessions);

    const { getByText } = renderScreen(WalletConnectSessions, {
      name: Routes.WALLET.WALLET_CONNECT_SESSIONS_VIEW,
    });

    await waitFor(() => {
      expect(getByText('This is a test dApp description')).toBeTruthy();
    });
  });

  it('should handle long press on session and show action sheet', async () => {
    const sessions = [
      {
        id: 1,
        topic: 'topic1',
        peer: {
          metadata: { name: 'Session 1', url: 'https://example.com' },
        },
      },
    ];

    mockGetSessions.mockReturnValue(sessions);

    const { getByText } = renderScreen(WalletConnectSessions, {
      name: Routes.WALLET.WALLET_CONNECT_SESSIONS_VIEW,
    });

    await waitFor(() => {
      expect(getByText('Session 1')).toBeTruthy();
    });

    // Simulate long press on the session
    const sessionRow = getByText('Session 1');
    fireEvent(sessionRow, 'longPress');
  });

  it('should successfully kill a session when action sheet is confirmed', async () => {
    const sessions = [
      {
        id: 1,
        topic: 'topic1',
        peer: {
          metadata: { name: 'Session 1', url: 'https://example.com' },
        },
      },
    ];

    mockGetSessions.mockReturnValue(sessions);

    const { getByText, UNSAFE_getByType } = renderScreen(
      WalletConnectSessions,
      {
        name: Routes.WALLET.WALLET_CONNECT_SESSIONS_VIEW,
      },
    );

    await waitFor(() => {
      expect(getByText('Session 1')).toBeTruthy();
    });

    // Simulate long press on the session
    const sessionRow = getByText('Session 1');
    fireEvent(sessionRow, 'longPress');

    // Get the ActionSheet and trigger the onPress callback with index 0 (End session)
    const actionSheet = UNSAFE_getByType(ActionSheet);
    actionSheet.props.onPress(0);

    await waitFor(() => {
      expect(mockRemoveSession).toHaveBeenCalledWith(sessions[0]);
      expect(mockAlert).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
      );
    });
  });

  it('should handle error when killing a session fails', async () => {
    const sessions = [
      {
        id: 1,
        topic: 'topic1',
        peer: {
          metadata: { name: 'Session 1', url: 'https://example.com' },
        },
      },
    ];

    mockGetSessions.mockReturnValue(sessions);
    const testError = new Error('Failed to remove session');
    mockRemoveSession.mockRejectedValue(testError);

    const { getByText, UNSAFE_getByType } = renderScreen(
      WalletConnectSessions,
      {
        name: Routes.WALLET.WALLET_CONNECT_SESSIONS_VIEW,
      },
    );

    await waitFor(() => {
      expect(getByText('Session 1')).toBeTruthy();
    });

    // Simulate long press on the session
    const sessionRow = getByText('Session 1');
    fireEvent(sessionRow, 'longPress');

    // Get the ActionSheet and trigger the onPress callback with index 0 (End session)
    const actionSheet = UNSAFE_getByType(ActionSheet);
    actionSheet.props.onPress(0);

    await waitFor(() => {
      expect(mockRemoveSession).toHaveBeenCalledWith(sessions[0]);
      expect(Logger.error).toHaveBeenCalledWith(
        testError,
        'WC: Failed to kill session',
      );
    });
  });

  it('should not kill session when cancel is pressed in action sheet', async () => {
    const sessions = [
      {
        id: 1,
        topic: 'topic1',
        peer: {
          metadata: { name: 'Session 1', url: 'https://example.com' },
        },
      },
    ];

    mockGetSessions.mockReturnValue(sessions);

    const { getByText, UNSAFE_getByType } = renderScreen(
      WalletConnectSessions,
      {
        name: Routes.WALLET.WALLET_CONNECT_SESSIONS_VIEW,
      },
    );

    await waitFor(() => {
      expect(getByText('Session 1')).toBeTruthy();
    });

    // Simulate long press on the session
    const sessionRow = getByText('Session 1');
    fireEvent(sessionRow, 'longPress');

    // Get the ActionSheet and trigger the onPress callback with index 1 (Cancel)
    const actionSheet = UNSAFE_getByType(ActionSheet);
    actionSheet.props.onPress(1);

    // removeSession should not be called when Cancel is pressed
    expect(mockRemoveSession).not.toHaveBeenCalled();
  });
});
