import '../../../../../../tests/component-view/mocks';
import { act, fireEvent, within } from '@testing-library/react-native';
import { parseCaipAccountId, type CaipAccountId } from '@metamask/utils';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import type { RootState } from '../../../../../reducers';
import type { DeepPartial } from '../../../../../util/test/renderWithProvider';
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
  FEES_AND_TOTAL,
  NETWORK_FEE_ROW,
  TOTAL_ROW,
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

// The fill paid 0.0004 ETH of gas out of the swap, on top of the MetaMask fee.
const FILL_NETWORK_FEE = {
  amount: '400000000000000',
  asset: MOCK_LIMIT_FILLED_ORDER.src.asset,
  maxFeePerGas: '26702076',
  maxPriorityFeePerGas: '1000004',
};
const FILL_METAMASK_FEE = {
  amount: '31818781531961',
  asset: MOCK_LIMIT_FILLED_ORDER.src.asset,
  usd: '0.08696627586237457',
  baseBpsFee: 87.5,
  quoteBpsFee: 87.5,
};

// The same trade the other way round: 220 USDC for 0.1 ETH, which starts as a
// buy of ETH, so its 2200 USDC per ETH ratio is quoted per unit of the
// destination token.
const MOCK_LIMIT_FILLED_BUY_ORDER: LimitOrder = {
  ...MOCK_LIMIT_FILLED_ORDER,
  src: {
    asset: MOCK_LIMIT_FILLED_ORDER.dest.asset,
    amount: MOCK_LIMIT_FILLED_ORDER.dest.amount,
  },
  dest: {
    asset: MOCK_LIMIT_FILLED_ORDER.src.asset,
    amount: MOCK_LIMIT_FILLED_ORDER.src.amount,
    minAmount: MOCK_LIMIT_FILLED_ORDER.src.amount,
  },
};

const BLOCK_EXPLORER_LABEL = strings('activity_details.view_on_block_explorer');
const CREATE_NEW_ORDER_LABEL = strings('bridge.limit.create_new_order');

const titleParams = { source: 'ETH', dest: 'USDC' };

/**
 * State where the display currency is EUR. With both rates given, 1 ETH is
 * worth EUR 2000 and USD 2160.
 */
const EUR_DISPLAY_CURRENCY = {
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

async function openActivityPage(
  order: LimitOrder,
  transactions: CreatedLimitOrderTransaction[] = [],
  {
    deterministicFiat,
    overrides,
  }: { deterministicFiat?: boolean; overrides?: DeepPartial<RootState> } = {},
) {
  setupGetLimitOrderApiMock({ order, transactions });
  const renderResult = renderLimitOrderTabRow({
    order,
    deterministicFiat,
    overrides,
  });

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

  it('quotes the trigger of an order that bought with a stablecoin in that stablecoin', async () => {
    const { findByTestId, getByText } = await openActivityPage(
      MOCK_LIMIT_FILLED_BUY_ORDER,
    );

    const triggerRow = await findByTestId(TRIGGER_CONDITION_ROW);

    expect(
      getByText(
        strings('bridge.limit.activity_title_filled', {
          source: 'USDC',
          dest: 'ETH',
        }),
      ),
    ).toBeOnTheScreen();
    expect(within(triggerRow).getByText('2200 USDC')).toBeOnTheScreen();
  });

  it('shows the network fee the fill paid from the swap, and what it sent in total', async () => {
    const { findByTestId, getByTestId } = await openActivityPage(
      MOCK_LIMIT_FILLED_ORDER,
      [
        {
          ...FILL_TRANSACTION,
          feeData: {
            txFee: { ...FILL_NETWORK_FEE, usd: '1.23' },
            metabridge: FILL_METAMASK_FEE,
          },
        },
      ],
      { deterministicFiat: true },
    );

    const networkFeeRow = await findByTestId(NETWORK_FEE_ROW);

    expect(networkFeeRow).toHaveTextContent(
      strings('activity_details.network_fee'),
      { exact: false },
    );
    expect(within(networkFeeRow).getByText('$1.23')).toBeOnTheScreen();
    expect(within(networkFeeRow).getByText('ETH')).toBeOnTheScreen();
    // 0.1 ETH at $2000.
    expect(getByTestId(TOTAL_ROW)).toHaveTextContent('$200.00', {
      exact: false,
    });
  });

  it('shows a fiat trigger, the network fee and the total in USD whatever the display currency', async () => {
    const { findByTestId, getByTestId } = await openActivityPage(
      {
        ...MOCK_LIMIT_FILLED_ORDER,
        trigger: { kind: 'src_price', threshold: 'above', price: '2160' },
      },
      [
        {
          ...FILL_TRANSACTION,
          feeData: { txFee: { ...FILL_NETWORK_FEE, usd: '1.23' } },
        },
      ],
      { deterministicFiat: true, overrides: EUR_DISPLAY_CURRENCY },
    );

    const networkFeeRow = await findByTestId(NETWORK_FEE_ROW);

    expect(
      within(getByTestId(TRIGGER_CONDITION_ROW)).getByText('$2160'),
    ).toBeOnTheScreen();
    expect(within(networkFeeRow).getByText('$1.23')).toBeOnTheScreen();
    // 0.1 ETH at $2160.
    expect(getByTestId(TOTAL_ROW)).toHaveTextContent('$216.00', {
      exact: false,
    });
  });

  it('shows the network fee as a token amount when the fill reports no USD value for it', async () => {
    const { findByTestId } = await openActivityPage(
      MOCK_LIMIT_FILLED_ORDER,
      [{ ...FILL_TRANSACTION, feeData: { txFee: FILL_NETWORK_FEE } }],
      { deterministicFiat: true },
    );

    const networkFeeRow = await findByTestId(NETWORK_FEE_ROW);

    expect(within(networkFeeRow).getByText('0.0004')).toBeOnTheScreen();
  });

  it('shows only the total for a fill that reports no network fee', async () => {
    const { findByTestId, queryByTestId } = await openActivityPage(
      MOCK_LIMIT_FILLED_ORDER,
      [{ ...FILL_TRANSACTION, feeData: { metabridge: FILL_METAMASK_FEE } }],
      { deterministicFiat: true },
    );

    expect(await findByTestId(TOTAL_ROW)).toHaveTextContent('$200.00', {
      exact: false,
    });
    expect(queryByTestId(NETWORK_FEE_ROW)).not.toBeOnTheScreen();
  });

  it('shows no costs for an order that did not fill', async () => {
    const { findByTestId, queryByTestId } = await openActivityPage(
      MOCK_LIMIT_FAILED_ORDER,
      [{ ...REVERTED_TRANSACTION, feeData: { txFee: FILL_NETWORK_FEE } }],
      { deterministicFiat: true },
    );

    await findByTestId(TRANSACTION_ID_ROW);

    expect(queryByTestId(FEES_AND_TOTAL)).not.toBeOnTheScreen();
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

  it('offers no new order for an order that filled', async () => {
    const { findByText, queryByText } = await openActivityPage(
      MOCK_LIMIT_FILLED_ORDER,
      [FILL_TRANSACTION],
    );

    await findByText(BLOCK_EXPLORER_LABEL);

    expect(queryByText(CREATE_NEW_ORDER_LABEL)).not.toBeOnTheScreen();
  });

  it.each([
    { name: 'expired', order: MOCK_LIMIT_EXPIRED_ORDER, transactions: [] },
    { name: 'canceled', order: MOCK_LIMIT_CANCELLED_ORDER, transactions: [] },
    {
      name: 'failed',
      order: MOCK_LIMIT_FAILED_ORDER,
      transactions: [REVERTED_TRANSACTION],
    },
  ])(
    'returns to the limit orders tab to create a new order after an $name order',
    async ({ order, transactions }) => {
      const { getByText, findByTestId } = await openActivityPage(
        order,
        transactions,
      );

      await act(async () => {
        fireEvent.press(getByText(CREATE_NEW_ORDER_LABEL));
      });

      expect(
        await findByTestId(OpenOrderRowSelectorsIDs.CONTAINER),
      ).toBeOnTheScreen();
    },
  );

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
    'shows a $name order as sending nothing',
    async ({ order, title, status }) => {
      const { getByTestId, getByText, queryByText, queryByTestId } =
        await openActivityPage(order);

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

  it('shows the reverted attempt of a failed order', async () => {
    const { getByTestId, getByText, queryByText, findByTestId } =
      await openActivityPage(MOCK_LIMIT_FAILED_ORDER, [REVERTED_TRANSACTION]);

    expect(await findByTestId(TRANSACTION_ID_ROW)).toHaveTextContent(
      renderShortAddress(FAILED_TX_HASH),
      { exact: false },
    );
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
