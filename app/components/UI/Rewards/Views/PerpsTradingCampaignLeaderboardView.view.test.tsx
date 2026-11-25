/**
 * The Perps trading competition leaderboard through real state.
 *
 * L1: the prize covers the top 30, so the top 30 prize positions render and
 * are crowned through the API's winner count.
 * Social Perps Comp: a 30-50 winner board renders every row correctly —
 * winners crowned, the rows below the prizes not.
 *
 * yarn jest -c jest.config.view.js app/components/UI/Rewards/Views/PerpsTradingCampaignLeaderboardView.view.test.tsx --runInBand --coverage=false
 */
import '../../../../../tests/component-view/mocks';
import { waitFor, within } from '@testing-library/react-native';
import {
  leaderboardFixture,
  renderPerpsCampaignLeaderboard,
} from '../../../../../tests/component-view/renderers/rewardsCampaignLeaderboard';
import { CAMPAIGN_LEADERBOARD_SHARED_TEST_IDS } from '../components/Campaigns/CampaignLeaderboard';

function rowTestId(rank: number): string {
  return `${CAMPAIGN_LEADERBOARD_SHARED_TEST_IDS.ENTRY_ROW}-${rank}`;
}

describe('PerpsTradingCampaignLeaderboardView', () => {
  it('renders every prize position the top-30 prize covers (L1)', async () => {
    const { findByTestId, getAllByTestId, UNSAFE_queryAllByProps } =
      renderPerpsCampaignLeaderboard({
        leaderboard: leaderboardFixture(30),
      });

    // The board holds all 30 prize positions.
    expect(await findByTestId(rowTestId(30))).toBeOnTheScreen();
    const rows = getAllByTestId(
      new RegExp(`^${CAMPAIGN_LEADERBOARD_SHARED_TEST_IDS.ENTRY_ROW}-`),
    );
    expect(rows).toHaveLength(30);
    expect(rows.map((row) => row.props.testID)).toEqual(
      Array.from({ length: 30 }, (_, index) => rowTestId(index + 1)),
    );

    // Every prize position is crowned: the API's winner count drives the
    // crowns, so the top 30 are marked as the prize covers.
    await waitFor(() => {
      expect(UNSAFE_queryAllByProps({ name: 'crown' })).toHaveLength(30);
    });
  });

  it('crows the API winner count and leaves later ranks uncrowned (Social Perps Comp)', async () => {
    const {
      findByTestId,
      getByTestId,
      getAllByTestId,
      UNSAFE_queryAllByProps,
    } = renderPerpsCampaignLeaderboard({
      leaderboard: leaderboardFixture(45, 5),
    });

    // The full board renders: 45 winners plus the 5 rows below the prizes.
    expect(await findByTestId(rowTestId(45))).toBeOnTheScreen();
    expect(getByTestId(rowTestId(50))).toBeOnTheScreen();
    expect(
      getAllByTestId(
        new RegExp(`^${CAMPAIGN_LEADERBOARD_SHARED_TEST_IDS.ENTRY_ROW}-`),
      ),
    ).toHaveLength(50);

    await waitFor(() => {
      expect(UNSAFE_queryAllByProps({ name: 'crown' })).toHaveLength(45);
    });

    // Rows render their content: the winner boundary and the first
    // non-winner both show their referral code.
    expect(
      within(getByTestId(rowTestId(1))).getByText('TRADER001'),
    ).toBeOnTheScreen();
    expect(
      within(getByTestId(rowTestId(45))).getByText('TRADER045'),
    ).toBeOnTheScreen();
    expect(
      within(getByTestId(rowTestId(46))).getByText('TRADER046'),
    ).toBeOnTheScreen();
  });
});
