import '../../../../../../tests/component-view/mocks';
import {
  renderPredictNext,
  renderPredictSearchScreen,
} from '../../../../../../tests/component-view/renderers/predictNext';
import {
  configurePredictNextFeeds,
  makePredictNextEvent,
  messengerCall,
} from '../../../../../../tests/component-view/fixtures/predictNext';
import { fireEvent } from '@testing-library/react-native';
import { KALSHI_VENUE_ID, type PredictEvent } from '../../types';
import { PredictHomeTestIds } from '../PredictHome/PredictHome.testIds';
import { PredictEventScreenTestIds } from '../PredictEvent/PredictEventScreen.testIds';
import { PredictSearchScreenTestIds } from './PredictSearchScreen.testIds';

const searchCalls = () =>
  messengerCall.mock.calls.filter(
    ([action]: [string]) => action === 'PredictMarketDataService:searchEvents',
  );

const configureSearch = (
  results: Record<string, readonly PredictEvent[] | Error>,
) => {
  const base = messengerCall.getMockImplementation();
  messengerCall.mockImplementation(
    (action: string, venueId: string, params: { q: string }) => {
      if (action !== 'PredictMarketDataService:searchEvents') {
        return base?.(action, venueId, params);
      }
      const result = results[params.q] ?? [];
      return result instanceof Error
        ? Promise.reject(result)
        : Promise.resolve({ venueId, events: result });
    },
  );
};

const typeQuery = (
  view: ReturnType<typeof renderPredictSearchScreen>,
  text: string,
) =>
  fireEvent.changeText(
    view.getByTestId(PredictSearchScreenTestIds.INPUT),
    text,
  );

describe('PredictSearchScreen', () => {
  beforeEach(() => {
    configurePredictNextFeeds();
  });

  it('opens from the Home header search button', async () => {
    const view = renderPredictNext();
    await view.findByTestId(PredictHomeTestIds.HOME);

    fireEvent.press(view.getByTestId(PredictHomeTestIds.SEARCH));

    expect(
      await view.findByTestId(PredictSearchScreenTestIds.VIEW),
    ).toBeOnTheScreen();
    expect(view.getByTestId(PredictSearchScreenTestIds.IDLE)).toBeOnTheScreen();
    expect(searchCalls()).toHaveLength(0);
  });

  it('debounces typing into one search and renders the results', async () => {
    const event = makePredictNextEvent('search-1', 'Chiefs at Bills');
    configureSearch({ chiefs: [event] });
    const view = renderPredictSearchScreen({ venueId: KALSHI_VENUE_ID });
    await view.findByTestId(PredictSearchScreenTestIds.IDLE);

    typeQuery(view, 'ch');
    typeQuery(view, 'chie');
    expect(
      view.getByTestId(PredictSearchScreenTestIds.LOADING),
    ).toBeOnTheScreen();
    typeQuery(view, 'chiefs');

    expect(
      await view.findByTestId(
        PredictHomeTestIds.event(KALSHI_VENUE_ID, event.id),
      ),
    ).toBeOnTheScreen();
    expect(searchCalls()).toHaveLength(1);
    expect(searchCalls()[0].slice(1, 3)).toEqual([
      KALSHI_VENUE_ID,
      { q: 'chiefs', limit: 20 },
    ]);
  });

  it('shows an empty state naming the query, and returns to idle when cleared', async () => {
    configureSearch({});
    const view = renderPredictSearchScreen({ venueId: KALSHI_VENUE_ID });
    await view.findByTestId(PredictSearchScreenTestIds.IDLE);

    typeQuery(view, 'nothing here');

    expect(
      await view.findByTestId(PredictSearchScreenTestIds.EMPTY),
    ).toHaveTextContent('No markets found for "nothing here".');

    fireEvent.press(view.getByTestId(PredictSearchScreenTestIds.CLEAR));

    expect(
      await view.findByTestId(PredictSearchScreenTestIds.IDLE),
    ).toBeOnTheScreen();
  });

  it('shows an error with retry that re-runs the search', async () => {
    const event = makePredictNextEvent('search-2', 'Bills at Chiefs');
    configureSearch({ bills: new Error('boom') });
    const view = renderPredictSearchScreen({ venueId: KALSHI_VENUE_ID });
    await view.findByTestId(PredictSearchScreenTestIds.IDLE);

    typeQuery(view, 'bills');
    await view.findByTestId(PredictSearchScreenTestIds.ERROR);

    configureSearch({ bills: [event] });
    fireEvent.press(view.getByTestId(PredictSearchScreenTestIds.RETRY));

    expect(
      await view.findByTestId(
        PredictHomeTestIds.event(KALSHI_VENUE_ID, event.id),
      ),
    ).toBeOnTheScreen();
  });

  it('opens a result Event and cancels back to Home', async () => {
    const event = makePredictNextEvent('search-3', 'Chiefs at Bills');
    configureSearch({ chiefs: [event] });
    const view = renderPredictSearchScreen({ venueId: KALSHI_VENUE_ID });
    await view.findByTestId(PredictSearchScreenTestIds.IDLE);
    typeQuery(view, 'chiefs');

    fireEvent.press(
      await view.findByTestId(
        PredictHomeTestIds.eventContent(KALSHI_VENUE_ID, event.id),
      ),
    );
    expect(
      await view.findByTestId(PredictEventScreenTestIds.VIEW),
    ).toBeOnTheScreen();

    fireEvent.press(view.getByTestId(PredictEventScreenTestIds.BACK));
    fireEvent.press(await view.findByTestId(PredictSearchScreenTestIds.CANCEL));

    expect(await view.findByTestId(PredictHomeTestIds.HOME)).toBeOnTheScreen();
  });
});
