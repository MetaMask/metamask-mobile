import '../../../../../../tests/component-view/mocks';
import { renderPredictFeedScreen } from '../../../../../../tests/component-view/renderers/predictNext';
import { fireEvent } from '@testing-library/react-native';
import { KALSHI_VENUE_ID } from '../../types';
import { PredictHomeTestIds } from '../PredictHome/PredictHome.testIds';
import { PredictFeedScreenTestIds } from './PredictFeedScreen.testIds';

const invalidFeedScreenParams = {
  venueId: KALSHI_VENUE_ID,
  feedScreenId: 'missing-feed-screen',
} as unknown as Parameters<typeof renderPredictFeedScreen>[0];

describe('PredictFeedScreen', () => {
  it('shows an unavailable state for an unknown Feed Screen and returns Home', async () => {
    const view = renderPredictFeedScreen(invalidFeedScreenParams);

    expect(
      await view.findByTestId(PredictFeedScreenTestIds.UNAVAILABLE),
    ).toBeOnTheScreen();
    fireEvent.press(view.getByTestId(PredictFeedScreenTestIds.BACK));

    expect(await view.findByTestId(PredictHomeTestIds.HOME)).toBeOnTheScreen();
  });
});
