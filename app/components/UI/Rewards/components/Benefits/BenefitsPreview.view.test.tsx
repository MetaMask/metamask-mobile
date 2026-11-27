/**
 * The dashboard's benefits carousel through real state (RWDS-1730).
 *
 * The carousel loads every benefit the Engine returns — not just the tiles
 * that fit one screen width — and each tile carries its own copy.
 *
 * yarn jest -c jest.config.view.js app/components/UI/Rewards/components/Benefits/BenefitsPreview.view.test.tsx --runInBand --coverage=false
 */
import '../../../../../../tests/component-view/mocks';
import { waitFor } from '@testing-library/react-native';
import { renderBenefitsPreview } from '../../../../../../tests/component-view/renderers/rewardsBenefits';
import { REWARDS_VIEW_SELECTORS } from '../../Views/RewardsView.constants';

const BENEFIT_IMAGE = REWARDS_VIEW_SELECTORS.TOP_BENEFIT_DETAILS_IMAGE;
const CAROUSEL = REWARDS_VIEW_SELECTORS.TOP_BENEFIT_DETAILS;

describe('BenefitsPreview', () => {
  it('loads and renders every benefit the read returns (RWDS-1730)', async () => {
    const { findByTestId, findByText, getAllByTestId, queryByTestId } =
      renderBenefitsPreview({ benefitsCount: 9 });

    // The carousel mounts once the read lands; the loading skeleton leaves.
    expect(await findByTestId(CAROUSEL)).toBeOnTheScreen();
    await waitFor(() => {
      expect(
        queryByTestId(REWARDS_VIEW_SELECTORS.TOP_BENEFIT_SKELETON),
      ).toBeNull();
    });

    // Every returned benefit is a tile in the carousel, in serve order.
    const tiles = getAllByTestId(new RegExp(`^${BENEFIT_IMAGE}-`));
    expect(tiles).toHaveLength(9);
    expect(tiles.map((tile) => tile.props.testID)).toEqual(
      Array.from({ length: 9 }, (_, index) => `${BENEFIT_IMAGE}-${index + 1}`),
    );

    // The first and the last tile carry their own copy, so the list holds
    // every item's data, not just the tiles that fit the viewport.
    expect(await findByText('Benefit 1')).toBeOnTheScreen();
    expect(await findByText('Benefit 9')).toBeOnTheScreen();
  });
});
