import { screen, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { CaipAssetType } from '@metamask/utils';
import React from 'react';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import TokenDetailsHoldersTab, {
  TokenDetailsHoldersTabSelectorsIDs,
} from './HoldersTab';
import { TOKEN_HOLDERS_FIXTURE } from './holders/tokenHolders.fixture';
import { TokenHolderRowSelectorsIDs } from './holders/TokenHolderRow';

/**
 * Renders the real `useTokenHolders` and its transport over a stubbed
 * network, unlike `HoldersTab.test.tsx`, which mocks the hook to drive each
 * state. Covers what an actual holders response produces on screen, and what
 * a cluster without the route produces.
 */

const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

const respondWith = (body: unknown, status = 200) =>
  mockFetch.mockResolvedValue({
    ok: status < 400,
    status,
    json: () => Promise.resolve(body),
  });

let mockIsEnabled = true;

jest.mock(
  '../../../../../selectors/featureFlagController/socialLeaderboard',
  () => ({
    ...jest.requireActual(
      '../../../../../selectors/featureFlagController/socialLeaderboard',
    ),
    selectSocialLeaderboardEnabled: () => mockIsEnabled,
  }),
);

const assetId =
  'eip155:1/erc20:0x6982508145454ce325ddbe47a25d4ec3d2311933' as CaipAssetType;

const openFixtureRows = TOKEN_HOLDERS_FIXTURE.items.filter(
  (item) => item.isOpen,
);
const closedFixtureRow = TOKEN_HOLDERS_FIXTURE.items.find(
  (item) => !item.isOpen,
);

// The hook is gated on an unlocked wallet; the shared fixture state is locked.
const unlockedState = {
  engine: {
    backgroundState: {
      ...backgroundState,
      KeyringController: {
        ...backgroundState.KeyringController,
        isUnlocked: true,
      },
    },
  },
};

const renderHoldersTab = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return renderWithProvider(
    <QueryClientProvider client={queryClient}>
      <TokenDetailsHoldersTab assetId={assetId} />
    </QueryClientProvider>,
    { state: unlockedState },
  );
};

describe('TokenDetailsHoldersTab integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsEnabled = true;
    respondWith({
      items: TOKEN_HOLDERS_FIXTURE.items,
      pagination: { hasMore: false },
    });
  });

  it('renders the holders the route returned, highest holding first', async () => {
    renderHoldersTab();

    await waitFor(() =>
      expect(
        screen.getAllByTestId(TokenHolderRowSelectorsIDs.CONTAINER).length,
      ).toBe(openFixtureRows.length),
    );
    expect(
      screen.getByTestId(TokenDetailsHoldersTabSelectorsIDs.CONTAINER),
    ).toBeOnTheScreen();

    const names = screen
      .getAllByTestId(TokenHolderRowSelectorsIDs.NAME)
      .map((node) => node.props.children);
    expect(names).toEqual(openFixtureRows.map((item) => item.actor.name));
  });

  it('leaves exited positions out of the list', async () => {
    expect(closedFixtureRow).toBeDefined();

    renderHoldersTab();

    await waitFor(() =>
      expect(
        screen.getAllByTestId(TokenHolderRowSelectorsIDs.CONTAINER).length,
      ).toBeGreaterThan(0),
    );
    expect(screen.queryByText(closedFixtureRow?.actor.name ?? '')).toBeNull();
  });

  it('shows the empty state when the cluster has no holders route yet', async () => {
    // Live on dev, still 404 on prod: no rows rather than a retry prompt.
    respondWith(null, 404);

    renderHoldersTab();

    await waitFor(() =>
      expect(
        screen.getByTestId(TokenDetailsHoldersTabSelectorsIDs.EMPTY),
      ).toBeOnTheScreen(),
    );
    expect(
      screen.queryByTestId(TokenHolderRowSelectorsIDs.CONTAINER),
    ).toBeNull();
  });

  it('offers a retry when the route fails', async () => {
    respondWith(null, 500);

    renderHoldersTab();

    await waitFor(() =>
      expect(
        screen.getByTestId(TokenDetailsHoldersTabSelectorsIDs.ERROR),
      ).toBeOnTheScreen(),
    );
    expect(
      screen.queryByTestId(TokenHolderRowSelectorsIDs.CONTAINER),
    ).toBeNull();
  });

  it('asks the route for the asset on screen', async () => {
    renderHoldersTab();

    await waitFor(() => expect(mockFetch).toHaveBeenCalled());
    expect(mockFetch.mock.calls[0][0]).toContain(encodeURIComponent(assetId));
  });

  it('renders no holders while the social flag is off', async () => {
    mockIsEnabled = false;

    renderHoldersTab();

    await waitFor(() =>
      expect(
        screen.getByTestId(TokenDetailsHoldersTabSelectorsIDs.EMPTY),
      ).toBeOnTheScreen(),
    );
    expect(
      screen.queryByTestId(TokenHolderRowSelectorsIDs.CONTAINER),
    ).toBeNull();
  });
});
