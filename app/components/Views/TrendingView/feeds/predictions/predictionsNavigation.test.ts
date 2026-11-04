import {
  PredictEventValues,
  type PredictEntryActions,
} from '../../../../UI/PredictNext';
import {
  navigateToExplorePredictionsList,
  navigateToPredictionsList,
} from './predictionsNavigation';

const createOpenPredict = () =>
  jest.fn<
    ReturnType<PredictEntryActions['openPredict']>,
    Parameters<PredictEntryActions['openPredict']>
  >(() => true);

describe('navigateToPredictionsList', () => {
  it('opens the trending feed with an explicit entryPoint for trending variant', () => {
    const openPredict = createOpenPredict();

    navigateToPredictionsList(
      openPredict,
      'trending',
      PredictEventValues.ENTRY_POINT.EXPLORE,
    );

    expect(openPredict).toHaveBeenCalledWith({
      type: 'feed',
      category: 'trending',
      entryPoint: PredictEventValues.ENTRY_POINT.EXPLORE,
    });
  });

  it('opens the sports feed with the explore entryPoint for sports variant', () => {
    const openPredict = createOpenPredict();

    navigateToPredictionsList(
      openPredict,
      'sports',
      PredictEventValues.ENTRY_POINT.EXPLORE,
    );

    expect(openPredict).toHaveBeenCalledWith({
      type: 'feed',
      category: 'sports',
      entryPoint: PredictEventValues.ENTRY_POINT.EXPLORE,
    });
  });

  it('opens the crypto feed with the explore entryPoint for crypto variant', () => {
    const openPredict = createOpenPredict();

    navigateToPredictionsList(
      openPredict,
      'crypto',
      PredictEventValues.ENTRY_POINT.EXPLORE,
    );

    expect(openPredict).toHaveBeenCalledWith({
      type: 'feed',
      category: 'crypto',
      entryPoint: PredictEventValues.ENTRY_POINT.EXPLORE,
    });
  });

  it('opens the politics feed for politics variant', () => {
    const openPredict = createOpenPredict();

    navigateToPredictionsList(openPredict, 'politics');

    expect(openPredict).toHaveBeenCalledWith({
      type: 'feed',
      category: 'politics',
      entryPoint: PredictEventValues.ENTRY_POINT.EXPLORE,
    });
  });

  it('passes a custom entryPoint when provided', () => {
    const openPredict = createOpenPredict();

    navigateToPredictionsList(
      openPredict,
      'trending',
      PredictEventValues.ENTRY_POINT.PREDICT_FEED,
    );

    expect(openPredict).toHaveBeenCalledWith({
      type: 'feed',
      category: 'trending',
      entryPoint: PredictEventValues.ENTRY_POINT.PREDICT_FEED,
    });
  });

  it('opens the feed from Explore with explore entryPoint', () => {
    const openPredict = createOpenPredict();

    navigateToExplorePredictionsList(openPredict, 'trending');

    expect(openPredict).toHaveBeenCalledWith({
      type: 'feed',
      category: 'trending',
      entryPoint: PredictEventValues.ENTRY_POINT.EXPLORE,
    });
  });
});
