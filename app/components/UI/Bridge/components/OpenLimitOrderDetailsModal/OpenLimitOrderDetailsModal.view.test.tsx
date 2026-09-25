import '../../../../../../tests/component-view/mocks';
import { act, fireEvent, within } from '@testing-library/react-native';
import type { DeepPartial } from '../../../../../util/test/renderWithProvider';
import type { RootState } from '../../../../../reducers';
import { strings } from '../../../../../../locales/i18n';
import { describeForPlatforms } from '../../../../../../tests/component-view/platform';
import { renderOpenLimitOrderDetailsModal } from '../../../../../../tests/component-view/renderers/bridge';
import { MOCK_LIMIT_OPEN_ORDER } from '../../api/limitOrders/getLimitOrders/mock';
import { CancelLimitOrderModalSelectorsIDs } from '../CancelLimitOrderModal/testIds';
import { OpenLimitOrderDetailsModalSelectorsIDs } from './testIds';

const {
  SHEET,
  STATUS,
  SUBMITTED,
  TRIGGER_CONDITION,
  TRIGGER_COMPARISON,
  EXPIRY,
  CANCEL_ORDER_BUTTON,
  USD_PRICE_NOTICE,
} = OpenLimitOrderDetailsModalSelectorsIDs;

// Derived from MOCK_LIMIT_OPEN_ORDER: 0.1 ETH at 2200 USDC per ETH, expiring
// on 2026-09-27.
const SUBMITTED_AMOUNT = '0.1 ETH';
const TRIGGER_PRICE = '2200 USDC';
const EXPIRY_DATE = 'Sep 27';

const renderDetails = () =>
  renderOpenLimitOrderDetailsModal({ order: MOCK_LIMIT_OPEN_ORDER });

const MOCK_USD_PRICE_ORDER = {
  ...MOCK_LIMIT_OPEN_ORDER,
  trigger: { kind: 'src_price', threshold: 'above', price: '2160' },
};

/**
 * State where the display currency is EUR. With both rates given, 1 ETH is
 * worth EUR 2000 and USD 2160, so EUR 1 is worth USD 1.08.
 */
const withEurDisplayCurrency = ({
  usdPrice,
}: {
  usdPrice?: number;
}): DeepPartial<RootState> =>
  ({
    engine: {
      backgroundState: {
        AssetsController: {
          selectedCurrency: 'eur',
          assetsPrice: {
            'eip155:1/slip44:60': {
              assetPriceType: 'fungible',
              id: 'eth',
              price: 2000,
              usdPrice,
              lastUpdated: 1700000000000,
            },
          },
        },
      },
    },
  }) as unknown as DeepPartial<RootState>;

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

    const expiryRow = getByTestId(EXPIRY);
    expect(
      within(expiryRow).getByText(strings('bridge.limit.expiry_label')),
    ).toBeOnTheScreen();
    expect(within(expiryRow).getByText(EXPIRY_DATE)).toBeOnTheScreen();
  });

  it.each(['src_price', 'dest_price'])(
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
        within(getByTestId(TRIGGER_CONDITION)).getByText('$2200.5'),
      ).toBeOnTheScreen();
    },
  );

  it('does not show the USD price notice when the display currency is USD', async () => {
    const { findByTestId, getByTestId, queryByTestId } =
      renderOpenLimitOrderDetailsModal({
        order: MOCK_USD_PRICE_ORDER,
        deterministicFiat: true,
      });

    expect(await findByTestId(SHEET)).toBeOnTheScreen();

    expect(
      within(getByTestId(TRIGGER_CONDITION)).getByText('$2160'),
    ).toBeOnTheScreen();
    expect(queryByTestId(USD_PRICE_NOTICE)).not.toBeOnTheScreen();
  });

  it('shows a USD trigger price in the display currency, with the USD price in a notice', async () => {
    const { findByTestId, getByTestId } = renderOpenLimitOrderDetailsModal({
      order: MOCK_USD_PRICE_ORDER,
      deterministicFiat: true,
      overrides: withEurDisplayCurrency({ usdPrice: 2160 }),
    });

    expect(await findByTestId(SHEET)).toBeOnTheScreen();

    expect(
      within(getByTestId(TRIGGER_CONDITION)).getByText('€2000'),
    ).toBeOnTheScreen();
    expect(getByTestId(USD_PRICE_NOTICE)).toHaveTextContent(
      strings('bridge.limit.usd_price_notice', { usdPrice: '$2160' }),
    );
  });

  // Without a rate the converted price would be a guess, while the USD price
  // is exactly the one the order was placed at.
  it('shows a USD trigger price as is when no rate converts it to the display currency', async () => {
    const { findByTestId, getByTestId, queryByTestId } =
      renderOpenLimitOrderDetailsModal({
        order: MOCK_USD_PRICE_ORDER,
        deterministicFiat: true,
        overrides: withEurDisplayCurrency({ usdPrice: undefined }),
      });

    expect(await findByTestId(SHEET)).toBeOnTheScreen();

    expect(
      within(getByTestId(TRIGGER_CONDITION)).getByText('$2160'),
    ).toBeOnTheScreen();
    expect(queryByTestId(USD_PRICE_NOTICE)).not.toBeOnTheScreen();
  });

  // A ratio trigger is priced in the destination token, so no exchange rate
  // takes part in placing the order.
  it('does not show the USD price notice for a ratio trigger', async () => {
    const { findByTestId, getByTestId, queryByTestId } =
      renderOpenLimitOrderDetailsModal({
        order: MOCK_LIMIT_OPEN_ORDER,
        deterministicFiat: true,
        overrides: withEurDisplayCurrency({ usdPrice: 2160 }),
      });

    expect(await findByTestId(SHEET)).toBeOnTheScreen();

    expect(
      within(getByTestId(TRIGGER_CONDITION)).getByText(TRIGGER_PRICE),
    ).toBeOnTheScreen();
    expect(queryByTestId(USD_PRICE_NOTICE)).not.toBeOnTheScreen();
  });

  // The orders response carries no market price, so the sheet cannot say how
  // far the trigger sits from market yet.
  it('does not compare the trigger price against the market price', async () => {
    const { findByTestId, queryByTestId } = renderDetails();

    expect(await findByTestId(SHEET)).toBeOnTheScreen();

    expect(queryByTestId(TRIGGER_COMPARISON)).not.toBeOnTheScreen();
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

  it('returns to the details sheet once the cancellation is confirmed', async () => {
    const { findByTestId, queryByTestId } = renderDetails();

    await act(async () => {
      fireEvent.press(await findByTestId(CANCEL_ORDER_BUTTON));
    });
    await act(async () => {
      fireEvent.press(
        await findByTestId(CancelLimitOrderModalSelectorsIDs.CONFIRM_BUTTON),
      );
    });

    expect(
      queryByTestId(CancelLimitOrderModalSelectorsIDs.SHEET),
    ).not.toBeOnTheScreen();
    expect(await findByTestId(SHEET)).toBeOnTheScreen();
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
