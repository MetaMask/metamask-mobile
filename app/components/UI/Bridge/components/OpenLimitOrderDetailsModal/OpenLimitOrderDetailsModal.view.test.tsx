import '../../../../../../tests/component-view/mocks';
import { act, fireEvent, within } from '@testing-library/react-native';
import type { DeepPartial } from '../../../../../util/test/renderWithProvider';
import type { RootState } from '../../../../../reducers';
import { strings } from '../../../../../../locales/i18n';
import { formatTimestampToDateTime } from '../../../../../util/date';
import { describeForPlatforms } from '../../../../../../tests/component-view/platform';
import { renderOpenLimitOrderDetailsModal } from '../../../../../../tests/component-view/renderers/bridge';
import { MOCK_LIMIT_OPEN_ORDER } from '../../api/limitOrders/getLimitOrders/mock';
import { CancelLimitOrderModalSelectorsIDs } from '../CancelLimitOrderModal/testIds';
import { TokenAmountValueSelectorsIDs } from '../LimitOrderConfirmationModal/TokenAmountValue/testIds';
import { OpenLimitOrderDetailsModalSelectorsIDs } from './testIds';
import type { LimitOrder } from '../../api/limitOrders/getLimitOrders/types';

const {
  SHEET,
  STATUS,
  SUBMITTED,
  TRIGGER_CONDITION,
  TRIGGER_COMPARISON,
  EXPIRY,
  CANCEL_ORDER_BUTTON,
} = OpenLimitOrderDetailsModalSelectorsIDs;

// Derived from MOCK_LIMIT_OPEN_ORDER: 0.1 ETH at 2200 USDC per ETH, expiring
// on 2026-09-27 at 12:00 UTC.
const SUBMITTED_AMOUNT = '0.1 ETH';
const TRIGGER_PRICE = '2200 USDC';
const EXPIRY_DATE = formatTimestampToDateTime(
  Date.parse(MOCK_LIMIT_OPEN_ORDER.timingData.expiresAt),
) as string;

const renderDetails = () =>
  renderOpenLimitOrderDetailsModal({ order: MOCK_LIMIT_OPEN_ORDER });

const MOCK_USD_PRICE_ORDER = {
  ...MOCK_LIMIT_OPEN_ORDER,
  trigger: { kind: 'src_price', threshold: 'above', price: '2160' },
} as const;

/**
 * State where the display currency is EUR. 1 ETH is worth EUR 2000 and
 * USD 2160, so EUR 1 is worth USD 1.08.
 */
const EUR_DISPLAY_CURRENCY_STATE = {
  engine: {
    backgroundState: {
      AssetsController: {
        selectedCurrency: 'eur',
        assetsPrice: {
          'eip155:1/slip44:60': {
            assetPriceType: 'fungible',
            id: 'eth',
            price: 2000,
            usdPrice: 2160,
            lastUpdated: 1700000000000,
          },
        },
      },
    },
  },
} as unknown as DeepPartial<RootState>;

describeForPlatforms('OpenLimitOrderDetailsModal', () => {
  it('shows every detail of the open order', async () => {
    const { findByTestId, getByTestId, getByText } = renderDetails();

    expect(await findByTestId(SHEET)).toBeOnTheScreen();

    expect(
      getByText(strings('bridge.limit.pair', { source: 'ETH', dest: 'USDC' })),
    ).toBeOnTheScreen();

    const statusRow = getByTestId(STATUS);
    expect(
      within(statusRow).getByText(strings('bridge.limit.status')),
    ).toBeOnTheScreen();
    expect(
      within(statusRow).getByText(strings('bridge.limit.in_progress')),
    ).toBeOnTheScreen();

    const submittedRow = getByTestId(SUBMITTED);
    expect(
      within(submittedRow).getByText(strings('bridge.limit.submitted')),
    ).toBeOnTheScreen();
    expect(within(submittedRow).getByText(SUBMITTED_AMOUNT)).toBeOnTheScreen();

    const triggerRow = getByTestId(TRIGGER_CONDITION);
    expect(
      within(triggerRow).getByText(strings('bridge.limit.trigger_condition')),
    ).toBeOnTheScreen();
    expect(within(triggerRow).getByText(TRIGGER_PRICE)).toBeOnTheScreen();
    expect(
      within(triggerRow).getByTestId(TokenAmountValueSelectorsIDs.PREFIX),
    ).toHaveTextContent(strings('bridge.limit.trigger_condition_at_or_above'));

    const expiryRow = getByTestId(EXPIRY);
    expect(
      within(expiryRow).getByText(strings('bridge.limit.expiry_label')),
    ).toBeOnTheScreen();
    expect(within(expiryRow).getByText(EXPIRY_DATE)).toBeOnTheScreen();
  });

  it.each<LimitOrder['trigger']['kind']>(['src_price', 'dest_price'])(
    'shows a %s trigger as a USD price',
    async (kind) => {
      const { findByTestId, getByTestId } = renderOpenLimitOrderDetailsModal({
        order: {
          ...MOCK_LIMIT_OPEN_ORDER,
          trigger: { kind, threshold: 'above', price: '2200.500000' },
        },
      });

      expect(await findByTestId(SHEET)).toBeOnTheScreen();

      expect(
        within(getByTestId(TRIGGER_CONDITION)).getByText('$2,200.50'),
      ).toBeOnTheScreen();
    },
  );

  // The order is placed at the USD price, so converting it would show a price
  // that drifts with the exchange rate while the order does not.
  it('shows a USD trigger price in USD whatever the display currency is', async () => {
    const { findByTestId, getByTestId } = renderOpenLimitOrderDetailsModal({
      order: MOCK_USD_PRICE_ORDER,
      deterministicFiat: true,
      overrides: EUR_DISPLAY_CURRENCY_STATE,
    });

    expect(await findByTestId(SHEET)).toBeOnTheScreen();

    const triggerRow = getByTestId(TRIGGER_CONDITION);
    expect(within(triggerRow).getByText('$2,160.00')).toBeOnTheScreen();
    expect(within(triggerRow).queryByText('€2,000.00')).not.toBeOnTheScreen();
  });

  it('signs the trigger price of an order placed at or below the limit price', async () => {
    const { findByTestId, getByTestId } = renderOpenLimitOrderDetailsModal({
      order: {
        ...MOCK_LIMIT_OPEN_ORDER,
        trigger: { kind: 'src_price', threshold: 'below', price: '2160' },
      },
    });

    expect(await findByTestId(SHEET)).toBeOnTheScreen();

    expect(
      within(getByTestId(TRIGGER_CONDITION)).getByTestId(
        TokenAmountValueSelectorsIDs.PREFIX,
      ),
    ).toHaveTextContent(strings('bridge.limit.trigger_condition_at_or_below'));
  });

  it('shows the trigger price of a sell as entered when the API reports it inverted', async () => {
    // Selling BNB at or above 817.501762 USDT per BNB, which the API reports
    // as at or below 1 / 817.501762 BNB per USDT.
    const { findByTestId, getByTestId } = renderOpenLimitOrderDetailsModal({
      order: {
        ...MOCK_LIMIT_OPEN_ORDER,
        src: {
          asset: {
            assetId: 'eip155:56/slip44:714',
            address: '0x0000000000000000000000000000000000000000',
            chainId: 56,
            symbol: 'BNB',
            decimals: 18,
          },
          amount: '100000000000000000',
        },
        dest: {
          asset: {
            assetId:
              'eip155:56/erc20:0x55d398326f99059ff775485246999027b3197955',
            address: '0x55d398326f99059ff775485246999027b3197955',
            chainId: 56,
            symbol: 'USDT',
            decimals: 18,
          },
          amount: '81750176200000000000',
          minAmount: '81750176200000000000',
        },
        trigger: {
          kind: 'ratio',
          threshold: 'below',
          price: '0.00122323895370393098',
        },
      },
    });

    expect(await findByTestId(SHEET)).toBeOnTheScreen();

    const triggerRow = getByTestId(TRIGGER_CONDITION);
    expect(within(triggerRow).getByText('817.501762 USDT')).toBeOnTheScreen();
    expect(
      within(triggerRow).getByTestId(TokenAmountValueSelectorsIDs.PREFIX),
    ).toHaveTextContent(strings('bridge.limit.trigger_condition_at_or_above'));
  });

  // The orders response carries no market price, so the sheet cannot say how
  // far the trigger sits from market yet.
  it('does not compare the trigger price against the market price', async () => {
    const { findByTestId, queryByTestId } = renderDetails();

    expect(await findByTestId(SHEET)).toBeOnTheScreen();

    expect(queryByTestId(TRIGGER_COMPARISON)).not.toBeOnTheScreen();
  });

  it('offers to cancel an order the API reports as cancellable', async () => {
    const { findByTestId } = renderOpenLimitOrderDetailsModal({
      order: { ...MOCK_LIMIT_OPEN_ORDER, isCancellable: true },
    });

    expect(await findByTestId(CANCEL_ORDER_BUTTON)).toBeOnTheScreen();
  });

  it('does not offer to cancel an order the API reports as not cancellable', async () => {
    const { findByTestId, queryByTestId } = renderOpenLimitOrderDetailsModal({
      order: { ...MOCK_LIMIT_OPEN_ORDER, isCancellable: false },
    });

    expect(await findByTestId(SHEET)).toBeOnTheScreen();

    expect(queryByTestId(CANCEL_ORDER_BUTTON)).not.toBeOnTheScreen();
  });

  it('opens the cancel order sheet from the details sheet', async () => {
    const { findByTestId, getByTestId } = renderDetails();

    await act(async () => {
      fireEvent.press(await findByTestId(CANCEL_ORDER_BUTTON));
    });

    const cancelSheet = await findByTestId(
      CancelLimitOrderModalSelectorsIDs.SHEET,
    );
    expect(cancelSheet).toBeOnTheScreen();
    expect(
      getByTestId(CancelLimitOrderModalSelectorsIDs.DESCRIPTION),
    ).toHaveTextContent(strings('bridge.limit.cancel_order_confirmation'));
    expect(
      getByTestId(CancelLimitOrderModalSelectorsIDs.CONFIRM_BUTTON),
    ).toBeOnTheScreen();
  });

  it('returns to the details sheet when the cancel sheet is dismissed', async () => {
    const { findByTestId, queryByTestId } = renderDetails();

    await act(async () => {
      fireEvent.press(await findByTestId(CANCEL_ORDER_BUTTON));
    });
    await act(async () => {
      fireEvent.press(
        await findByTestId(CancelLimitOrderModalSelectorsIDs.CLOSE_BUTTON),
      );
    });

    expect(
      queryByTestId(CancelLimitOrderModalSelectorsIDs.SHEET),
    ).not.toBeOnTheScreen();
    expect(await findByTestId(SHEET)).toBeOnTheScreen();
  });
});
