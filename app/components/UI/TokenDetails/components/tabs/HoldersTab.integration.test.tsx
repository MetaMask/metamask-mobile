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
 * mocks it to assert the props contract. This pins the division of labour:
 * the tab hands over a token source and the leaderboard owns every state it
 * can be in, including no-data. Token sources resolve to `unavailable` until
 * social-api ranks traders per token, so today that is the state we land on.
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

describe('TokenDetailsHoldersTab integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsEnabled = true;
  });

  it('lets the leaderboard render its own state for a token source', () => {
    renderHoldersTab();

    expect(
      screen.getByTestId(SocialLeaderboardSelectorsIDs.UNAVAILABLE),
    ).toBeOnTheScreen();
  });

  it('renders nothing at all when the social flag is off', () => {
    mockIsEnabled = false;

    renderHoldersTab();

    expect(
      screen.queryByTestId(SocialLeaderboardSelectorsIDs.UNAVAILABLE),
    ).toBeNull();
    expect(screen.queryByTestId(SocialLeaderboardSelectorsIDs.ROWS)).toBeNull();
  });
});
