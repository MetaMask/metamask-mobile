import { waitFor } from '@testing-library/react-native';
import WalletConnectSessions from './';
import { renderScreen } from '../../../util/test/renderWithProvider';
import Routes from '../../../constants/navigation/Routes';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { ExperimentalSelectorsIDs } from '../Settings/ExperimentalSettings/ExperimentalView.testIds';
import WC2Manager from '../../../core/WalletConnect/WalletConnectV2';
import { strings } from '../../../../locales/i18n';

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
    const { queryByTestId } = renderScreen(WalletConnectSessions, {
      name: Routes.WALLET.WALLET_CONNECT_SESSIONS_VIEW,
    });
    expect(queryByTestId(ExperimentalSelectorsIDs.CONTAINER)).toBeNull();
  });

  it('renders empty component with no active sessions', async () => {
    mockGetSessions.mockReturnValue([]);

    const { getByTestId, getByText } = renderScreen(WalletConnectSessions, {
      name: Routes.WALLET.WALLET_CONNECT_SESSIONS_VIEW,
    });

    await waitFor(() => {
      expect(getByTestId(ExperimentalSelectorsIDs.CONTAINER)).toBeOnTheScreen();
      expect(
        getByText(strings('walletconnect_sessions.no_active_sessions')),
      ).toBeOnTheScreen();
    });
  });

  it('renders active sessions', async () => {
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

    const { getByTestId, getByText } = renderScreen(WalletConnectSessions, {
      name: Routes.WALLET.WALLET_CONNECT_SESSIONS_VIEW,
    });

    await waitFor(() => {
      expect(getByTestId(ExperimentalSelectorsIDs.CONTAINER)).toBeOnTheScreen();
      expect(getByText('Session 1')).toBeOnTheScreen();
      expect(getByText('https://example.com')).toBeOnTheScreen();
      expect(getByText('Session 2')).toBeOnTheScreen();
      expect(getByText('https://example.org')).toBeOnTheScreen();
    });
  });

  it('renders inline HeaderCompactStandard with title and back button', async () => {
    mockGetSessions.mockReturnValue([]);

    const { getByTestId, getByText } = renderScreen(WalletConnectSessions, {
      name: Routes.WALLET.WALLET_CONNECT_SESSIONS_VIEW,
    });

    await waitFor(() => {
      expect(
        getByTestId(ExperimentalSelectorsIDs.WALLET_CONNECT_SESSIONS_HEADER),
      ).toBeOnTheScreen();
      expect(
        getByTestId(
          ExperimentalSelectorsIDs.WALLET_CONNECT_SESSIONS_BACK_BUTTON,
        ),
      ).toBeOnTheScreen();
      expect(
        getByText(strings('experimental_settings.wallet_connect_dapps')),
      ).toBeOnTheScreen();
    });
  });
});
