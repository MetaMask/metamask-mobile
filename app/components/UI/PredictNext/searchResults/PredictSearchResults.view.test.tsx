import '../../../../../tests/component-view/mocks';
import { fireEvent, within } from '@testing-library/react-native';
import {
  PREDICT_ROOT_PARAMS_PROBE,
  renderUrlAutocompleteWithRoutes,
  URL_AUTOCOMPLETE_QUERY_INPUT,
} from '../../../../../tests/component-view/renderers/urlAutocomplete';
import { describeForPlatforms } from '../../../../../tests/component-view/platform';
import {
  clearTrendingApiMocks,
  mockTrendingTokensData,
  setupTrendingApiFetchMock,
} from '../../../../../tests/component-view/api-mocking/trending';
import {
  MOCK_PREDICT_CLOSED_MARKET,
  MOCK_PREDICT_MARKET,
} from '../../../../../tests/component-view/fixtures/predict';
import Engine from '../../../../core/Engine';
import Routes from '../../../../constants/navigation/Routes';
import { strings } from '../../../../../locales/i18n';
import type { PredictConfig } from '../config/predictConfig';
import {
  getPredictSearchResultRowTestId,
  PredictSearchResultRowTestIds,
} from './PredictSearchResultRow.testIds';

const LEGACY_LANE: PredictConfig = {
  enabled: false,
  venues: { polymarket: { enabled: false }, kalshi: { enabled: false } },
  venueSelection: { enabled: false },
};

const KALSHI_ONLY: PredictConfig = {
  enabled: true,
  venues: { polymarket: { enabled: false }, kalshi: { enabled: true } },
  venueSelection: { enabled: false },
};

const PREDICTIONS_HEADER = strings('autocomplete.predictions');
const HIDDEN = { includeHiddenElements: true };

const IMAGED_MARKET = {
  ...MOCK_PREDICT_MARKET,
  image: 'https://example.com/btc.png',
};

const searchMarkets = Engine.context.PredictController
  .searchMarkets as jest.Mock;

const renderAutocomplete = (predictConfig: PredictConfig) =>
  renderUrlAutocompleteWithRoutes({
    overrides: {
      engine: {
        backgroundState: {
          RemoteFeatureFlagController: {
            remoteFeatureFlags: {
              predictTradingEnabled: {
                enabled: true,
                featureVersion: '1.0.0',
                minimumVersion: '0.0.1',
              },
              predictConfig,
            },
          },
          PredictController: {
            balances: {},
            pendingDeposits: {},
            claimablePositions: {},
            accountMeta: {},
            activeBuyOrders: {},
            withdrawTransaction: null,
          },
          PredictVenueController: {
            venueSelectionPreference: null,
            lastActiveVenue: null,
            sessionDefault: null,
          },
        },
      },
    } as never,
  });

describeForPlatforms('Browser URL autocomplete predictions', () => {
  beforeEach(() => {
    setupTrendingApiFetchMock(mockTrendingTokensData);
    searchMarkets.mockReset();
    searchMarkets.mockResolvedValue({
      markets: [IMAGED_MARKET, MOCK_PREDICT_CLOSED_MARKET],
      totalResults: 2,
    });
  });

  afterEach(() => {
    clearTrendingApiMocks();
  });

  it('shows every Polymarket search result, in order, from one search', async () => {
    const view = renderAutocomplete(LEGACY_LANE);

    fireEvent.changeText(
      view.getByTestId(URL_AUTOCOMPLETE_QUERY_INPUT),
      'bitcoin',
    );

    const openRow = await view.findByTestId(
      getPredictSearchResultRowTestId(IMAGED_MARKET.id),
      HIDDEN,
    );
    const closedRow = view.getByTestId(
      getPredictSearchResultRowTestId(MOCK_PREDICT_CLOSED_MARKET.id),
      HIDDEN,
    );
    expect(view.getByText(PREDICTIONS_HEADER, HIDDEN)).toBeOnTheScreen();
    expect(
      within(openRow).getByText(IMAGED_MARKET.title, HIDDEN),
    ).toBeOnTheScreen();
    expect(within(openRow).getByText('Open', HIDDEN)).toBeOnTheScreen();
    expect(
      within(openRow).getByTestId(PredictSearchResultRowTestIds.IMAGE, HIDDEN),
    ).toHaveProp('source', { uri: IMAGED_MARKET.image });
    expect(
      within(closedRow).getByText(MOCK_PREDICT_CLOSED_MARKET.title, HIDDEN),
    ).toBeOnTheScreen();
    expect(within(closedRow).getByText('closed', HIDDEN)).toBeOnTheScreen();
    expect(
      within(closedRow).getByTestId(
        PredictSearchResultRowTestIds.PLACEHOLDER_ICON,
        HIDDEN,
      ),
    ).toBeOnTheScreen();
    const rowIds = view
      .getAllByTestId(/^predict-search-result-row-market/, HIDDEN)
      .map((row) => row.props.testID);
    expect(rowIds).toEqual([
      getPredictSearchResultRowTestId(IMAGED_MARKET.id),
      getPredictSearchResultRowTestId(MOCK_PREDICT_CLOSED_MARKET.id),
    ]);
    // Explore's search and Predict's source share one query.
    expect(searchMarkets).toHaveBeenCalledTimes(1);
    expect(searchMarkets).toHaveBeenCalledWith(
      expect.objectContaining({ q: 'bitcoin' }),
    );
  });

  it('opens the market details on a result press, as Browser did', async () => {
    const view = renderAutocomplete(LEGACY_LANE);
    fireEvent.changeText(
      view.getByTestId(URL_AUTOCOMPLETE_QUERY_INPUT),
      'bitcoin',
    );
    const row = await view.findByTestId(
      getPredictSearchResultRowTestId(IMAGED_MARKET.id),
      HIDDEN,
    );

    fireEvent.press(row);

    const params = await view.findByTestId(PREDICT_ROOT_PARAMS_PROBE);
    expect(JSON.parse(String(params.props.children))).toEqual({
      screen: Routes.PREDICT.MARKET_DETAILS,
      params: {
        marketId: IMAGED_MARKET.id,
        providerId: IMAGED_MARKET.providerId,
      },
    });
  });

  it('leaves Predictions out and reads no Polymarket market while Kalshi is active', async () => {
    const view = renderAutocomplete(KALSHI_ONLY);

    fireEvent.changeText(
      view.getByTestId(URL_AUTOCOMPLETE_QUERY_INPUT),
      'bitcoin',
    );

    // The token search for the query settles after the debounce, as a
    // Predict search would.
    const bitcoinToken = mockTrendingTokensData.find(
      ({ symbol }) => symbol === 'BTC',
    );
    expect(
      await view.findByText(String(bitcoinToken?.name), HIDDEN),
    ).toBeOnTheScreen();
    expect(view.queryByText(PREDICTIONS_HEADER, HIDDEN)).not.toBeOnTheScreen();
    expect(searchMarkets).not.toHaveBeenCalled();
  });
});
