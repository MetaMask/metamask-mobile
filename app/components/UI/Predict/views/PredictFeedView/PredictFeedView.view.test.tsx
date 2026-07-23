/**
 * Component view tests for the generic PredictFeedView.
 *
 * Behaviour is driven via Engine spies (listMarkets / listFilterOptions) and
 * real hooks/components — no hook or FlashList mocks.
 *
 * Run with: yarn jest -c jest.config.view.js PredictFeedView.view.test --runInBand --silent --coverage=false
 */
import '../../../../../../tests/component-view/mocks';
import Engine from '../../../../../../app/core/Engine';
import { cleanup, within } from '@testing-library/react-native';
import { renderPredictFeedView } from '../../../../../../tests/component-view/renderers/predictFeedView';
import {
  PredictFeedViewSelectorsIDs,
  getPredictFeedViewSelector,
} from '../../Predict.testIds';
import { MOCK_PREDICT_MARKET } from '../../../../../../tests/component-view/fixtures/predict';
import type { PredictMarket } from '../../types';

const createMarket = (id: string, title: string): PredictMarket => ({
  ...MOCK_PREDICT_MARKET,
  id,
  slug: id,
  title,
  outcomes: [
    {
      ...MOCK_PREDICT_MARKET.outcomes[0],
      id: `${id}-outcome`,
      marketId: id,
      title,
    },
  ],
});

describe('PredictFeedView (component view)', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    (
      Engine.context.PredictController.listMarkets as jest.Mock
    ).mockResolvedValue({ markets: [], nextCursor: null });
    (
      Engine.context.PredictController.listFilterOptions as jest.Mock
    ).mockResolvedValue([]);
  });

  it('renders the configured feed header, tabs, and filters for a multi-tab feed', async () => {
    const { findByText, getByTestId, getAllByText } = renderPredictFeedView({
      initialParams: { feedId: 'sports' },
    });

    expect(await findByText('Sports')).toBeOnTheScreen();
    // sports is a multi-tab feed -> tab bar is visible with the sport tabs
    expect(getByTestId(PredictFeedViewSelectorsIDs.TABS)).toBeOnTheScreen();
    expect(getAllByText('All').length).toBeGreaterThan(0);
    expect(getAllByText('Soccer').length).toBeGreaterThan(0);
    // static filter chips for the active tab
    expect(getByTestId(PredictFeedViewSelectorsIDs.FILTERS)).toBeOnTheScreen();
    expect(getAllByText('Games').length).toBeGreaterThan(0);
    expect(getAllByText('Props').length).toBeGreaterThan(0);

    expect(Engine.context.PredictController.listMarkets).toHaveBeenCalled();
  });

  it('renders market cards for the active tab/filter', async () => {
    (
      Engine.context.PredictController.listMarkets as jest.Mock
    ).mockResolvedValue({
      markets: [
        createMarket('market-1', 'Lakers to win the title'),
        createMarket('market-2', 'Celtics to win the title'),
      ],
      nextCursor: null,
    });

    const { findByTestId } = renderPredictFeedView({
      initialParams: { feedId: 'sports' },
    });

    const firstCard = await findByTestId(
      getPredictFeedViewSelector.marketCard(1),
      {},
      { timeout: 10000 },
    );
    expect(
      within(firstCard).getByText('Lakers to win the title'),
    ).toBeOnTheScreen();
  });

  it('renders the empty state when the feed returns no markets', async () => {
    const { findByTestId } = renderPredictFeedView({
      initialParams: { feedId: 'live' },
    });

    expect(
      await findByTestId(
        PredictFeedViewSelectorsIDs.EMPTY_STATE,
        {},
        { timeout: 10000 },
      ),
    ).toBeOnTheScreen();
  });

  it('hides Live filter chips while requesting only live markets', async () => {
    const { findByTestId, queryByTestId } = renderPredictFeedView({
      initialParams: { feedId: 'live' },
    });

    await findByTestId(
      PredictFeedViewSelectorsIDs.EMPTY_STATE,
      {},
      { timeout: 10000 },
    );

    expect(
      queryByTestId(PredictFeedViewSelectorsIDs.FILTERS),
    ).not.toBeOnTheScreen();
    expect(Engine.context.PredictController.listMarkets).toHaveBeenCalledWith(
      expect.objectContaining({ live: true }),
    );
  });
});
