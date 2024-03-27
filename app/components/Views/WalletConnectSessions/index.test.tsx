import { waitFor } from '@testing-library/react-native';
import WalletConnectSessions from './';
import AsyncStorage from '../../../store/async-storage-wrapper';
import { renderScreen } from '../../../util/test/renderWithProvider';
import Routes from '../../../constants/navigation/Routes';
import { ExperimentalSelectorsIDs } from '../../../../e2e/selectors/Settings/ExperimentalView.selectors';

describe('WalletConnectSessions', () => {
  it('does not render when not ready', () => {
    const { toJSON } = renderScreen(WalletConnectSessions, {
      name: Routes.WALLET.WALLET_CONNECT_SESSIONS_VIEW,
    });
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders empty component with no active sessions', async () => {
    jest.spyOn(AsyncStorage, 'getItem').mockResolvedValue(null);

    const { getByTestId, toJSON } = renderScreen(WalletConnectSessions, {
      name: Routes.WALLET.WALLET_CONNECT_SESSIONS_VIEW,
    });

    await waitFor(() => {
      const emptyMessage = getByTestId(ExperimentalSelectorsIDs.CONTAINER);
      expect(emptyMessage).toBeTruthy();
      expect(toJSON()).toMatchSnapshot();
    });
  });

  it('should render active sessions', async () => {
    const sessions = [
      {
        peerId: 'peer1',
        peerMeta: { name: 'Session 1', url: 'https://example.com' },
      },
      {
        peerId: 'peer2',
        peerMeta: { name: 'Session 2', url: 'https://example.org' },
      },
    ];

    jest
      .spyOn(AsyncStorage, 'getItem')
      .mockResolvedValue(JSON.stringify(sessions));

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
