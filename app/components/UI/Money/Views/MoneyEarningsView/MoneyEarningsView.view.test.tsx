import '../../../../../../tests/component-view/mocks';
import { fireEvent } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import {
  clearMoneyEarningsApiMocks,
  moneyHistoricalEarningsResponse,
  setupMoneyEarningsApiMock,
} from '../../../../../../tests/component-view/api-mocking/moneyEarnings';
import {
  renderMoneyEarningsView,
  renderMoneyEarningsViewWithBackRoute,
} from '../../../../../../tests/component-view/renderers/moneyEarnings';
import { getRouteProbeTestId } from '../../../../../../tests/component-view/render';
import { MoneyEarningsViewTestIds } from './MoneyEarningsView.testIds';

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
    const response = {
      ...moneyHistoricalEarningsResponse,
      ranges: moneyHistoricalEarningsResponse.ranges.map((range) =>
        range.range === '30d'
          ? {
              ...range,
              buckets: [],
              totals: {
                ...range.totals,
                interest_earned_usd: '0',
              },
            }
          : range,
      ),
    };
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
    const response = {
      ...moneyHistoricalEarningsResponse,
      ranges: moneyHistoricalEarningsResponse.ranges.map((range) =>
        range.range === '30d'
          ? {
              ...range,
              availability: {
                earnings: 'unavailable' as const,
                usd_pricing: 'unavailable' as const,
              },
              totals: {
                interest_earned_musd_assets: null,
                interest_earned_usd: null,
              },
              buckets: [
                {
                  ...range.buckets[0],
                  availability: {
                    earnings: 'unavailable' as const,
                    usd_pricing: 'unavailable' as const,
                  },
                  unavailable_reasons: ['historical_price_missing' as const],
                  interest_earned_musd_assets: null,
                  interest_earned_usd: null,
                  musd_price_usd: null,
                  price_as_of: null,
                  price_source: null,
                },
              ],
            }
          : range,
      ),
    };
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
      initialParams: { activeTab: 'allocation' },
    });

    expect(
      await findByTestId(MoneyEarningsViewTestIds.EARNINGS_PANEL),
    ).toBeOnTheScreen();
    fireEvent.press(getByTestId(MoneyEarningsViewTestIds.TAB_APY));
    fireEvent.press(getByTestId(MoneyEarningsViewTestIds.TAB_ALLOCATION));

    expect(
      getByTestId(MoneyEarningsViewTestIds.EARNINGS_PANEL),
    ).toBeOnTheScreen();
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
