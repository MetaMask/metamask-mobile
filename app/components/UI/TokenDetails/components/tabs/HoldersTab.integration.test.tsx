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
 * Renders the real `useTokenHolders` and its placeholder transport, unlike
 * `HoldersTab.test.tsx`, which mocks the hook to drive each state. Covers what
 * the fixture-backed path actually produces, and that a non-dev build shows
 * nothing rather than invented holders.
 */

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

const devFlag = global as unknown as { __DEV__: boolean };

describe('TokenDetailsHoldersTab integration', () => {
  const originalDev = devFlag.__DEV__;

  beforeEach(() => {
    jest.clearAllMocks();
    mockIsEnabled = true;
    devFlag.__DEV__ = true;
  });

  afterEach(() => {
    devFlag.__DEV__ = originalDev;
  });

  it('renders the dev fixture holders, highest holding first', async () => {
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

  it('shows the empty state instead of invented holders outside a dev build', async () => {
    devFlag.__DEV__ = false;

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
