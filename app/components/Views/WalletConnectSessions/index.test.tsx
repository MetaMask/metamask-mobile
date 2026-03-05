import { waitFor } from '@testing-library/react-native';
import WalletConnectSessions from './';
import { renderScreen } from '../../../util/test/renderWithProvider';
import Routes from '../../../constants/navigation/Routes';
import { ExperimentalSelectorsIDs } from '../Settings/ExperimentalSettings/ExperimentalView.testIds';
import WC2Manager from '../../../core/WalletConnect/WalletConnectV2';

const mockGetSessions = jest.fn();

jest.mock('../../../core/WalletConnect/WalletConnectV2', () => ({
  __esModule: true,
  isWC2Enabled: true,
  default: {
    getInstance: jest.fn(),
  },
}));

// Mock Logger to avoid errors from useFavicon hook
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

describe('WalletConnectSessions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSessions.mockReturnValue([]);
    (WC2Manager.getInstance as jest.Mock).mockResolvedValue({
      getSessions: () => mockGetSessions(),
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
    // V2 session structure
    const sessions = [
      {
        topic: 'topic1',
        peer: {
          metadata: { name: 'Session 1', url: 'https://example.com' },
        },
      },
      {
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
});
