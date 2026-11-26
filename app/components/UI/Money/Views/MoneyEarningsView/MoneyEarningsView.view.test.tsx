import '../../../../../../tests/component-view/mocks';
import { fireEvent, within } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import {
  moneyHistoricalEarningsResponse,
  withRangeOverride,
} from '../../__fixtures__/moneyInterestHistory';
import {
  clearMoneyEarningsApiMocks,
  clearMoneyAllocationApiMocks,
  moneyVaultCompositionResponse,
  setupMoneyAllocationApiMock,
  setupMoneyEarningsApiMock,
} from '../../../../../../tests/component-view/api-mocking/moneyEarnings';
import {
  renderMoneyEarningsView,
  renderMoneyEarningsViewWithBackRoute,
} from '../../../../../../tests/component-view/renderers/moneyEarnings';
import { getRouteProbeTestId } from '../../../../../../tests/component-view/render';
import { MoneyEarningsViewTestIds } from './MoneyEarningsView.testIds';
import { MoneyVaultCompositionChartTestIds } from './components/MoneyVaultCompositionChart/MoneyVaultCompositionChart.testIds';
import { MoneyVaultCompositionMarketRowTestIds } from './components/MoneyVaultCompositionMarketRow/MoneyVaultCompositionMarketRow.testIds';
import { MoneyVaultCompositionMarketsTableTestIds } from './components/MoneyVaultCompositionMarketsTable/MoneyVaultCompositionMarketsTable.testIds';
import { AllocationDetailsTestIds } from './components/AllocationDetails/AllocationDetails.testIds';

describe('MoneyEarningsView', () => {
  beforeEach(() => {
    setupMoneyEarningsApiMock();
  });

  afterEach(() => {
    clearMoneyEarningsApiMocks();
  });

  it('loads complete earnings data for the primary Money account', async () => {
    let requestedUrl = '';
    setupMoneyEarningsApiMock({
      onRequest: (url) => {
        requestedUrl = url;
      },
    });

    const { findByTestId, getByTestId, getByText } = renderMoneyEarningsView();

    expect(
      await findByTestId(MoneyEarningsViewTestIds.HERO_TOTAL),
    ).toHaveTextContent('+$30.00');
    expect(
      getByTestId(MoneyEarningsViewTestIds.HERO_PERIOD_DATE),
    ).toHaveTextContent('Oct 18 – Nov 15');
    expect(
      getByText(strings('money.earnings.payouts_disclaimer')),
    ).toBeOnTheScreen();

    expect(
      getByTestId(MoneyEarningsViewTestIds.CHART_SLOT(0)),
    ).toBeOnTheScreen();
    expect(
      getByTestId(MoneyEarningsViewTestIds.CHART_SLOT(0)).props
        .accessibilityLabel,
    ).toBe('Oct 18 – Oct 24, +$20.00');
    expect(
      getByTestId(MoneyEarningsViewTestIds.CHART_SLOT(1)).props
        .accessibilityState,
    ).toEqual({ selected: false, disabled: true });
    expect(
      getByTestId(MoneyEarningsViewTestIds.CHART_SLOT(2)),
    ).toBeOnTheScreen();
    expect(
      getByTestId(MoneyEarningsViewTestIds.CHART_X_LABEL(0)),
    ).toHaveTextContent('Oct 18');
    expect(
      getByTestId(MoneyEarningsViewTestIds.CHART_X_LABEL(1)),
    ).toHaveTextContent('Nov 8');
    expect(
      getByTestId(MoneyEarningsViewTestIds.CHART_X_LABEL(2)),
    ).toHaveTextContent('Nov 15');
    expect(
      getByTestId(MoneyEarningsViewTestIds.CHART_Y_LABEL(0)),
    ).toHaveTextContent('$20');
    expect(
      getByTestId(MoneyEarningsViewTestIds.CHART_Y_LABEL(1)),
    ).toHaveTextContent('$10');
    expect(
      getByTestId(MoneyEarningsViewTestIds.SUMMARY_ROW_VALUE(0)),
    ).toHaveTextContent('+$10.00');
    expect(
      getByTestId(MoneyEarningsViewTestIds.SUMMARY_ROW_VALUE(1)),
    ).toHaveTextContent('+$20.00');
    expect(
      getByTestId(MoneyEarningsViewTestIds.SUMMARY_ROW_DATE(0)),
    ).toHaveTextContent('Nov 15');
    expect(
      getByTestId(MoneyEarningsViewTestIds.SUMMARY_ROW_DATE(1)),
    ).toHaveTextContent('Oct 18 – Oct 24');

    expect(requestedUrl).toBe(
      'https://money.api.cx.metamask.io/v1/positions/0x1234567890abcdef1234567890abcdef12345678/interest-history?chain_id=143',
    );
  });

  it('changes the selected range when a range filter is pressed', async () => {
    const { findByTestId, getByLabelText, getByTestId } =
      renderMoneyEarningsView();

    await findByTestId(MoneyEarningsViewTestIds.HERO_TOTAL);
    fireEvent.press(getByLabelText(strings('money.earnings.range_1y')));

    expect(
      getByLabelText(strings('money.earnings.range_1y')).props
        .accessibilityState,
    ).toEqual(expect.objectContaining({ selected: true }));
    expect(getByTestId(MoneyEarningsViewTestIds.HERO_TOTAL)).toHaveTextContent(
      '+$100.00',
    );
  });

  it('updates the hero for the one-week and three-month ranges', async () => {
    const { findByTestId, getByLabelText, getByTestId } =
      renderMoneyEarningsView();

    await findByTestId(MoneyEarningsViewTestIds.HERO_TOTAL);

    fireEvent.press(getByLabelText(strings('money.earnings.range_1w')));
    expect(getByTestId(MoneyEarningsViewTestIds.HERO_TOTAL)).toHaveTextContent(
      '+$10.00',
    );

    fireEvent.press(getByLabelText(strings('money.earnings.range_3m')));
    expect(getByTestId(MoneyEarningsViewTestIds.HERO_TOTAL)).toHaveTextContent(
      '+$10.00',
    );
    expect(
      getByTestId(MoneyEarningsViewTestIds.HERO_PERIOD_DATE),
    ).toHaveTextContent('Nov');
  });

  it('updates and restores the hero when a chart bar is held and released', async () => {
    const { findByTestId, getByTestId } = renderMoneyEarningsView();

    await findByTestId(MoneyEarningsViewTestIds.HERO_TOTAL);
    const selectedBar = getByTestId(MoneyEarningsViewTestIds.CHART_SLOT(0));

    fireEvent(selectedBar, 'pressIn');
    expect(getByTestId(MoneyEarningsViewTestIds.HERO_TOTAL)).toHaveTextContent(
      '+$20.00',
    );
    expect(
      getByTestId(MoneyEarningsViewTestIds.HERO_PERIOD_DATE),
    ).toHaveTextContent('Oct 18 – Oct 24');

    fireEvent(selectedBar, 'pressOut');
    expect(getByTestId(MoneyEarningsViewTestIds.HERO_TOTAL)).toHaveTextContent(
      '+$30.00',
    );
  });

  it('shows loading state before historical earnings resolve', async () => {
    const { findByTestId, getByTestId } = renderMoneyEarningsView();

    expect(getByTestId(MoneyEarningsViewTestIds.LOADING)).toBeOnTheScreen();
    expect(
      await findByTestId(MoneyEarningsViewTestIds.HERO_TOTAL),
    ).toBeOnTheScreen();
  });

  it('shows an error and recovers after retry', async () => {
    setupMoneyEarningsApiMock({ status: 500 });
    const { findByTestId, getByText } = renderMoneyEarningsView();

    expect(
      await findByTestId(MoneyEarningsViewTestIds.ERROR),
    ).toBeOnTheScreen();

    setupMoneyEarningsApiMock();
    fireEvent.press(getByText(strings('money.earnings.retry')));

    expect(
      await findByTestId(MoneyEarningsViewTestIds.HERO_TOTAL),
    ).toHaveTextContent('+$30.00');
  });

  it('shows empty state without a summary when the selected range has no buckets', async () => {
    const response = withRangeOverride(
      moneyHistoricalEarningsResponse,
      '30d',
      (range) => ({
        ...range,
        buckets: [],
        totals: {
          ...range.totals,
          interest_earned_usd: '0',
        },
      }),
    );
    setupMoneyEarningsApiMock({ response });

    const { findByTestId, queryByTestId } = renderMoneyEarningsView();

    expect(
      await findByTestId(MoneyEarningsViewTestIds.EMPTY),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(MoneyEarningsViewTestIds.SUMMARY),
    ).not.toBeOnTheScreen();
  });

  it('shows unavailable-range error without a summary', async () => {
    const response = withRangeOverride(
      moneyHistoricalEarningsResponse,
      '30d',
      (range) => ({
        ...range,
        availability: {
          earnings: 'unavailable',
          usd_pricing: 'unavailable',
        },
        totals: {
          interest_earned_musd_assets: null,
          interest_earned_usd: null,
        },
        buckets: [
          {
            ...range.buckets[0],
            availability: {
              earnings: 'unavailable',
              usd_pricing: 'unavailable',
            },
            unavailable_reasons: ['historical_price_missing'],
            interest_earned_musd_assets: null,
            interest_earned_usd: null,
            musd_price_usd: null,
            price_as_of: null,
            price_source: null,
          },
        ],
      }),
    );
    setupMoneyEarningsApiMock({ response });

    const { findByTestId, queryByTestId } = renderMoneyEarningsView();

    expect(
      await findByTestId(MoneyEarningsViewTestIds.ERROR),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(MoneyEarningsViewTestIds.SUMMARY),
    ).not.toBeOnTheScreen();
  });

  it('shows malformed-response error without a summary', async () => {
    setupMoneyEarningsApiMock({
      response: {
        ...moneyHistoricalEarningsResponse,
        address: null,
      },
    });

    const { findByTestId, queryByTestId } = renderMoneyEarningsView();

    expect(
      await findByTestId(MoneyEarningsViewTestIds.ERROR),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(MoneyEarningsViewTestIds.SUMMARY),
    ).not.toBeOnTheScreen();
  });

  it('keeps Earnings active when disabled tabs are pressed or requested', async () => {
    const { findByTestId, getByTestId } = renderMoneyEarningsView({
      initialParams: { activeTab: 'apy' },
    });

    expect(
      await findByTestId(MoneyEarningsViewTestIds.EARNINGS_PANEL),
    ).toBeOnTheScreen();
    fireEvent.press(getByTestId(MoneyEarningsViewTestIds.TAB_APY));

    expect(
      getByTestId(MoneyEarningsViewTestIds.EARNINGS_PANEL),
    ).toBeOnTheScreen();
  });

  describe('Allocation tab', () => {
    beforeEach(() => {
      setupMoneyAllocationApiMock();
    });

    afterEach(() => {
      clearMoneyAllocationApiMocks();
    });

    it('renders allocation data after the Allocation tab is selected', async () => {
      const { findByTestId, findByText, getByTestId, getByText } =
        renderMoneyEarningsView();

      await findByTestId(MoneyEarningsViewTestIds.EARNINGS_PANEL);
      fireEvent.press(getByTestId(MoneyEarningsViewTestIds.TAB_ALLOCATION));

      expect(
        await findByTestId(MoneyVaultCompositionChartTestIds.CHART),
      ).toBeOnTheScreen();
      expect(
        await findByText(
          strings('money.earnings.allocation_details.average_apy_value', {
            value: 5.2,
          }),
        ),
      ).toBeOnTheScreen();

      expect(
        getByTestId(MoneyEarningsViewTestIds.ALLOCATION_PANEL),
      ).toBeOnTheScreen();
      expect(
        getByTestId(MoneyVaultCompositionChartTestIds.CENTER_PERCENTAGE),
      ).toHaveTextContent('60%');
      expect(
        getByTestId(
          MoneyVaultCompositionChartTestIds.WEDGE('direct_idle_usdc'),
        ),
      ).toBeOnTheScreen();
      expect(
        getByTestId(MoneyVaultCompositionChartTestIds.WEDGE('aave_v3_musd')),
      ).toBeOnTheScreen();

      expect(
        getByTestId(MoneyVaultCompositionMarketsTableTestIds.MARKET_HEADER),
      ).toHaveTextContent(strings('money.earnings.markets'));
      expect(
        getByTestId(MoneyVaultCompositionMarketsTableTestIds.ALLOCATION_HEADER),
      ).toHaveTextContent(strings('money.earnings.allocation'));
      expect(
        getByTestId(MoneyVaultCompositionMarketsTableTestIds.APY_HEADER),
      ).toHaveTextContent(strings('money.earnings.apy'));

      moneyVaultCompositionResponse.components.forEach((component) => {
        const row = getByTestId(
          MoneyVaultCompositionMarketRowTestIds.ROW(component.component_key),
        );
        const rowQueries = within(row);

        expect(
          rowQueries.getByTestId(
            MoneyVaultCompositionMarketRowTestIds.PRIMARY_LABEL(
              component.component_key,
            ),
          ),
        ).toHaveTextContent(
          component.component_key === 'direct_idle_usdc'
            ? 'Cash reserve'
            : 'Aave v3 • Monad',
        );
        expect(
          rowQueries.getByTestId(
            MoneyVaultCompositionMarketRowTestIds.SECONDARY_LABEL(
              component.component_key,
            ),
          ),
        ).toHaveTextContent(
          component.component_key === 'direct_idle_usdc'
            ? 'USDC'
            : 'MetaMask USD',
        );
        expect(
          rowQueries.getByTestId(
            MoneyVaultCompositionMarketRowTestIds.ALLOCATION(
              component.component_key,
            ),
          ),
        ).toHaveTextContent(
          component.component_key === 'direct_idle_usdc' ? '40%' : '60%',
        );
        expect(
          rowQueries.getByTestId(
            MoneyVaultCompositionMarketRowTestIds.APY(component.component_key),
          ),
        ).toHaveTextContent(
          component.component_key === 'direct_idle_usdc' ? '—' : '6.2%',
        );
      });

      expect(getByTestId(AllocationDetailsTestIds.HEADER)).toHaveTextContent(
        strings('money.earnings.allocation_details.title'),
      );
      expect(
        getByTestId(AllocationDetailsTestIds.VALUE('average-apy')),
      ).toHaveTextContent(
        strings('money.earnings.allocation_details.average_apy_value', {
          value: 5.2,
        }),
      );
      expect(
        getByTestId(MoneyEarningsViewTestIds.ALLOCATION_RISKS_DIVIDER),
      ).toBeOnTheScreen();
      expect(
        getByText(strings('money.earnings.risks_and_disclosures.title')),
      ).toBeOnTheScreen();
    });

    it('opens the Allocation tab from the allocation route parameter', async () => {
      const { findByTestId, queryByTestId } = renderMoneyEarningsView({
        initialParams: { activeTab: 'allocation' },
      });

      expect(
        await findByTestId(MoneyVaultCompositionChartTestIds.CHART),
      ).toBeOnTheScreen();
      expect(
        queryByTestId(MoneyEarningsViewTestIds.EARNINGS_PANEL),
      ).not.toBeOnTheScreen();
    });

    it('shows allocation loading state before composition data resolves', async () => {
      const { findByTestId, getAllByTestId, getByTestId } =
        renderMoneyEarningsView();

      await findByTestId(MoneyEarningsViewTestIds.EARNINGS_PANEL);
      fireEvent.press(getByTestId(MoneyEarningsViewTestIds.TAB_ALLOCATION));

      expect(
        getByTestId(MoneyVaultCompositionChartTestIds.LOADING),
      ).toBeOnTheScreen();
      expect(
        getAllByTestId(MoneyVaultCompositionMarketRowTestIds.LOADING),
      ).toHaveLength(3);
      expect(
        await findByTestId(MoneyVaultCompositionChartTestIds.CHART),
      ).toBeOnTheScreen();
    });

    it('shows allocation error and recovers after retry', async () => {
      setupMoneyAllocationApiMock({
        compositionStatus: 500,
        historicalApyStatus: 200,
      });
      const { findByTestId, findByText, getByTestId, getByText } =
        renderMoneyEarningsView();

      await findByTestId(MoneyEarningsViewTestIds.EARNINGS_PANEL);
      fireEvent.press(getByTestId(MoneyEarningsViewTestIds.TAB_ALLOCATION));

      expect(
        await findByTestId(MoneyEarningsViewTestIds.ALLOCATION_ERROR),
      ).toBeOnTheScreen();

      setupMoneyAllocationApiMock();
      fireEvent.press(getByText(strings('money.earnings.allocation_retry')));

      expect(
        await findByTestId(MoneyVaultCompositionChartTestIds.CHART),
      ).toBeOnTheScreen();
      expect(
        await findByText(
          strings('money.earnings.allocation_details.average_apy_value', {
            value: 5.2,
          }),
        ),
      ).toBeOnTheScreen();
    });

    it('shows allocation error when composition returns no data', async () => {
      setupMoneyAllocationApiMock({ compositionResponse: null });
      const { findByTestId, getByTestId, getByText } =
        renderMoneyEarningsView();

      await findByTestId(MoneyEarningsViewTestIds.EARNINGS_PANEL);
      fireEvent.press(getByTestId(MoneyEarningsViewTestIds.TAB_ALLOCATION));

      expect(
        await findByTestId(MoneyEarningsViewTestIds.ALLOCATION_ERROR),
      ).toBeOnTheScreen();
      expect(
        getByText(strings('money.earnings.allocation_retry')),
      ).toBeOnTheScreen();
    });

    it('shows an empty state when allocation composition has no components', async () => {
      setupMoneyAllocationApiMock({
        compositionResponse: {
          ...moneyVaultCompositionResponse,
          components: [],
        },
      });
      const { findByTestId, getByTestId, queryByTestId } =
        renderMoneyEarningsView();

      await findByTestId(MoneyEarningsViewTestIds.EARNINGS_PANEL);
      fireEvent.press(getByTestId(MoneyEarningsViewTestIds.TAB_ALLOCATION));

      expect(
        await findByTestId(MoneyEarningsViewTestIds.ALLOCATION_EMPTY),
      ).toBeOnTheScreen();
      expect(
        queryByTestId(MoneyVaultCompositionChartTestIds.CHART),
      ).not.toBeOnTheScreen();
    });

    it('shows degraded-data notice with allocation content', async () => {
      setupMoneyAllocationApiMock({
        compositionResponse: {
          ...moneyVaultCompositionResponse,
          data_freshness: 'degraded',
          stale_reason: 'snapshot_lag',
        },
      });
      const { findByTestId, getByTestId, queryByText } =
        renderMoneyEarningsView();

      await findByTestId(MoneyEarningsViewTestIds.EARNINGS_PANEL);
      fireEvent.press(getByTestId(MoneyEarningsViewTestIds.TAB_ALLOCATION));

      expect(
        await findByTestId(MoneyEarningsViewTestIds.ALLOCATION_DEGRADED),
      ).toBeOnTheScreen();
      expect(
        await findByTestId(MoneyVaultCompositionChartTestIds.CHART),
      ).toBeOnTheScreen();
      expect(queryByText('snapshot_lag')).not.toBeOnTheScreen();
    });
  });

  it('returns to Money Home when the back button is pressed', async () => {
    const { findByTestId, getByTestId } =
      renderMoneyEarningsViewWithBackRoute();

    await findByTestId(MoneyEarningsViewTestIds.EARNINGS_PANEL);
    fireEvent.press(getByTestId(MoneyEarningsViewTestIds.BACK_BUTTON));

    expect(
      await findByTestId(getRouteProbeTestId(Routes.MONEY.HOME)),
    ).toBeOnTheScreen();
  });
});
