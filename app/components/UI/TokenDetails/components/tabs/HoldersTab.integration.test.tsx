import { screen } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { CaipAssetType } from '@metamask/utils';
import React from 'react';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import { SocialLeaderboardSelectorsIDs } from '../../../SocialLeaderboard';
import TokenDetailsHoldersTab from './HoldersTab';

/**
 * Renders the real `SocialLeaderboard`, unlike `HoldersTab.test.tsx` which
 * mocks it to assert the props contract. The route cannot rank one asset, so
 * this tab asks for the unscoped ranking.
 */

let mockIsEnabled = true;

jest.mock(
  '../../../../../selectors/featureFlagController/socialLeaderboard',
  () => ({
    ...jest.requireActual(
      '../../../../../selectors/featureFlagController/socialLeaderboard',
    ),
    selectSocialLeaderboardEnabled: () => mockIsEnabled,
    selectSocialLeaderboardPerpsEnabled: () => true,
  }),
);

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: jest.fn() }),
  useRoute: () => ({ params: {} }),
}));

const assetId =
  'eip155:1/erc20:0x6982508145454ce325ddbe47a25d4ec3d2311933' as CaipAssetType;

const renderHoldersTab = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return renderWithProvider(
    <QueryClientProvider client={queryClient}>
      <TokenDetailsHoldersTab assetId={assetId} />
    </QueryClientProvider>,
    { state: { engine: { backgroundState } } },
  );
};

const leaderboardBody = () =>
  screen.queryByTestId(SocialLeaderboardSelectorsIDs.SKELETON) ??
  screen.queryByTestId(SocialLeaderboardSelectorsIDs.ROWS) ??
  screen.queryByTestId(SocialLeaderboardSelectorsIDs.EMPTY) ??
  screen.queryByTestId(SocialLeaderboardSelectorsIDs.ERROR);

describe('TokenDetailsHoldersTab integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsEnabled = true;
  });

  it('shows the unscoped Social leaderboard page', () => {
    renderHoldersTab();

    expect(
      screen.getByTestId('token-details-v1-holders-leaderboard'),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(SocialLeaderboardSelectorsIDs.UNAVAILABLE),
    ).toBeNull();
    expect(leaderboardBody()).toBeOnTheScreen();
  });

  it('leaves the leaderboard body empty when the social flag is off', () => {
    mockIsEnabled = false;

    renderHoldersTab();

    expect(
      screen.getByTestId('token-details-v1-holders-leaderboard'),
    ).toBeOnTheScreen();
    expect(screen.queryByTestId(SocialLeaderboardSelectorsIDs.ROWS)).toBeNull();
    expect(
      screen.queryByTestId(SocialLeaderboardSelectorsIDs.UNAVAILABLE),
    ).toBeNull();
    expect(leaderboardBody()).toBeNull();
  });
});
