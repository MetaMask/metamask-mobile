import '../../../../../../tests/component-view/mocks';
import { act, fireEvent, within } from '@testing-library/react-native';
import { parseCaipAccountId, type CaipAccountId } from '@metamask/utils';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import { renderShortAddress } from '../../../../../util/address';
import { formatTimestampToDateTime } from '../../../../../util/date';
import {
  clearGetLimitOrderApiMock,
  setupGetLimitOrderApiMock,
} from '../../../../../../tests/component-view/api-mocking/limitOrders';
import { describeForPlatforms } from '../../../../../../tests/component-view/platform';
import { getRouteParamsProbeTestId } from '../../../../../../tests/component-view/render';
import { renderLimitOrderTabRow } from '../../../../../../tests/component-view/renderers/bridge';
import type { CreatedLimitOrderTransaction } from '../../api/limitOrders/create/schema';
import {
  MOCK_LIMIT_CANCELLED_ORDER,
  MOCK_LIMIT_EXPIRED_ORDER,
  MOCK_LIMIT_FAILED_ORDER,
  MOCK_LIMIT_FILLED_ORDER,
} from '../../api/limitOrders/getLimitOrders/mock';
import type { LimitOrder } from '../../api/limitOrders/getLimitOrders/types';
import { OpenOrderRowSelectorsIDs } from '../../components/OpenOrderRow/OpenOrderRow.testIds';
import { formatLimitOrderDate } from '../../utils/limitOrders/formatLimitOrderDate';
/* eslint-disable-next-line import-x/no-restricted-paths -- the page reuses the shared Activity Details footer */
import { ActivityDetailsSelectorsIDs } from '../../../../Views/ActivityDetails/ActivityDetails.testIds';
import { SwapsLimitOrderActivityPageSelectorsIDs } from './SwapsLimitOrderActivityPage.testIds';

const {
  SCREEN,
  BACK_BUTTON,
  STATUS_ROW,
  DATE_CREATED_ROW,
  ACCOUNT_ROW,
  ORDER_TYPE_ROW,
  TRIGGER_CONDITION_ROW,
  NETWORK_ROW,
  TRANSACTION_ID_ROW,
} = SwapsLimitOrderActivityPageSelectorsIDs;

const FILL_TX_HASH = `0x${'ab'.repeat(32)}`;
const FAILED_TX_HASH = `0x${'cd'.repeat(32)}`;

// The fill delivered 225 USDC, above the 220 USDC floor the orders list
// carries, so the page has to show the amount from the fill.
const FILL_TRANSACTION: CreatedLimitOrderTransaction = {
  status: 'executed',
  txHash: FILL_TX_HASH,
  src: MOCK_LIMIT_FILLED_ORDER.src,
  dest: { asset: MOCK_LIMIT_FILLED_ORDER.dest.asset, amount: '225000000' },
  timingData: {
    createdAt: '2026-09-04T12:59:00.000Z',
    closedAt: '2026-09-04T13:00:00.000Z',
  },
};

const REVERTED_TRANSACTION: CreatedLimitOrderTransaction = {
  status: 'failed',
  txHash: FAILED_TX_HASH,
  src: MOCK_LIMIT_FAILED_ORDER.src,
  dest: MOCK_LIMIT_FAILED_ORDER.dest,
  timingData: {
    createdAt: '2026-09-01T12:59:00.000Z',
    closedAt: '2026-09-01T13:00:00.000Z',
  },
};

const DUPLICATE_ORDER_LABEL = strings('bridge.limit.duplicate_order');
const BLOCK_EXPLORER_LABEL = strings('activity_details.view_on_block_explorer');

const titleParams = { source: 'ETH', dest: 'USDC' };

async function openActivityPage(
  order: LimitOrder,
  transactions: CreatedLimitOrderTransaction[] = [],
) {
  setupGetLimitOrderApiMock({ order, transactions });
  const renderResult = renderLimitOrderTabRow({ order });

  await act(async () => {
    fireEvent.press(
      await renderResult.findByTestId(OpenOrderRowSelectorsIDs.CONTAINER),
    );
  });
  await renderResult.findByTestId(SCREEN);

  return renderResult;
}

describeForPlatforms('SwapsLimitOrderActivityPage', () => {
  afterEach(() => {
    clearGetLimitOrderApiMock();
    jest.restoreAllMocks();
  });

  it('shows every detail of a filled order, with the amounts of its fill', async () => {
    const { getByTestId, getByText, findByTestId } = await openActivityPage(
      MOCK_LIMIT_FILLED_ORDER,
      [FILL_TRANSACTION],
    );

    expect(
      await findByTestId(ActivityDetailsSelectorsIDs.TRANSACTION_ID_COPY),
    ).toBeOnTheScreen();
    expect(
      getByText(strings('bridge.limit.activity_title_filled', titleParams)),
    ).toBeOnTheScreen();
    expect(getByText(strings('activity_details.you_sent'))).toBeOnTheScreen();
    expect(getByText('-0.1 ETH')).toBeOnTheScreen();
    expect(
      getByText(strings('activity_details.you_received')),
    ).toBeOnTheScreen();
    expect(getByText('+225 USDC')).toBeOnTheScreen();
    expect(
      within(getByTestId(STATUS_ROW)).getByText(strings('bridge.limit.filled')),
    ).toBeOnTheScreen();
    expect(getByTestId(DATE_CREATED_ROW)).toHaveTextContent(
      formatTimestampToDateTime(
        Date.parse(MOCK_LIMIT_FILLED_ORDER.timingData.createdAt),
      ) as string,
      { exact: false },
    );
    expect(getByTestId(ACCOUNT_ROW)).toHaveTextContent(
      renderShortAddress(
        parseCaipAccountId(MOCK_LIMIT_FILLED_ORDER.account as CaipAccountId)
          .address,
      ),
      { exact: false },
    );
    expect(
      within(getByTestId(ORDER_TYPE_ROW)).getByText(
        strings('bridge.limit.order_type_limit'),
      ),
    ).toBeOnTheScreen();
    expect(
      within(getByTestId(TRIGGER_CONDITION_ROW)).getByText('2200 USDC'),
    ).toBeOnTheScreen();
    expect(getByTestId(NETWORK_ROW)).toHaveTextContent('Ethereum', {
      exact: false,
    });
    expect(getByTestId(TRANSACTION_ID_ROW)).toHaveTextContent(
      renderShortAddress(FILL_TX_HASH),
      { exact: false },
    );
  });

  it('opens the fill transaction in the block explorer', async () => {
    const { findByText, findByTestId } = await openActivityPage(
      MOCK_LIMIT_FILLED_ORDER,
      [FILL_TRANSACTION],
    );

    await act(async () => {
      fireEvent.press(await findByText(BLOCK_EXPLORER_LABEL));
    });

    const webviewParams = await findByTestId(
      getRouteParamsProbeTestId(Routes.WEBVIEW.MAIN),
    );
    expect(webviewParams).toHaveTextContent(`/tx/${FILL_TX_HASH}`, {
      exact: false,
    });
  });

  it('returns to the orders list from the back button', async () => {
    const { getByTestId, findByTestId } = await openActivityPage(
      MOCK_LIMIT_FILLED_ORDER,
      [FILL_TRANSACTION],
    );

    await act(async () => {
      fireEvent.press(getByTestId(BACK_BUTTON));
    });

    expect(
      await findByTestId(OpenOrderRowSelectorsIDs.CONTAINER),
    ).toBeOnTheScreen();
  });

  it.each([
    {
      name: 'expired',
      order: MOCK_LIMIT_EXPIRED_ORDER,
      title: strings('bridge.limit.activity_title_expired', titleParams),
      status: strings('bridge.limit.expired_at_status', {
        date: formatLimitOrderDate(
          MOCK_LIMIT_EXPIRED_ORDER.timingData.closedAt,
        ),
      }),
    },
    {
      name: 'canceled',
      order: MOCK_LIMIT_CANCELLED_ORDER,
      title: strings('bridge.limit.activity_title_canceled', titleParams),
      status: strings('bridge.limit.canceled'),
    },
  ])(
    'shows a $name order as sending nothing and offers to duplicate it',
    async ({ order, title, status }) => {
      const consoleLogSpy = jest
        .spyOn(console, 'log')
        .mockImplementation(() => undefined);
      const { getByTestId, getByText, queryByText, queryByTestId } =
        await openActivityPage(order);

      await act(async () => {
        fireEvent.press(getByText(DUPLICATE_ORDER_LABEL));
      });

      expect(consoleLogSpy).toHaveBeenCalledWith('Will duplicate order');
      expect(getByText(title)).toBeOnTheScreen();
      expect(
        within(getByTestId(STATUS_ROW)).getByText(status),
      ).toBeOnTheScreen();
      expect(getByText('0 ETH')).toBeOnTheScreen();
      expect(
        queryByText(strings('activity_details.you_received')),
      ).not.toBeOnTheScreen();
      expect(queryByTestId(TRANSACTION_ID_ROW)).not.toBeOnTheScreen();
      expect(queryByText(BLOCK_EXPLORER_LABEL)).not.toBeOnTheScreen();
    },
  );

  it('shows the reverted attempt of a failed order and offers to duplicate it', async () => {
    const consoleLogSpy = jest
      .spyOn(console, 'log')
      .mockImplementation(() => undefined);
    const { getByTestId, getByText, queryByText, findByTestId } =
      await openActivityPage(MOCK_LIMIT_FAILED_ORDER, [REVERTED_TRANSACTION]);

    expect(await findByTestId(TRANSACTION_ID_ROW)).toHaveTextContent(
      renderShortAddress(FAILED_TX_HASH),
      { exact: false },
    );

    await act(async () => {
      fireEvent.press(getByText(DUPLICATE_ORDER_LABEL));
    });

    expect(consoleLogSpy).toHaveBeenCalledWith('Will duplicate order');
    expect(
      getByText(strings('bridge.limit.activity_title_failed', titleParams)),
    ).toBeOnTheScreen();
    expect(
      within(getByTestId(STATUS_ROW)).getByText(strings('bridge.limit.failed')),
    ).toBeOnTheScreen();
    expect(getByText('0 ETH')).toBeOnTheScreen();
    expect(queryByText(BLOCK_EXPLORER_LABEL)).not.toBeOnTheScreen();
  });
});
