import '../../../../tests/component-view/mocks';
import { fireEvent, waitFor, within } from '@testing-library/react-native';
import { Text, TextColor } from '@metamask/design-system-react-native';
import { strings } from '../../../../locales/i18n';
import { renderShortAddress } from '../../../util/address';
import { describeForPlatforms } from '../../../../tests/component-view/platform';
import {
  ACTIVITY_CV_ACCOUNT,
  ACTIVITY_CV_PERPS_ORDER_FEE,
  buildActivityCvPerpsCompletedDepositItem,
  buildActivityCvPerpsCompletedWithdrawalItem,
  buildActivityCvPerpsFailedDepositItem,
  buildActivityCvPerpsFundingItem,
  buildActivityCvPerpsOrderFill,
  buildActivityCvPerpsOrderItem,
  buildActivityCvPerpsOrderTransaction,
  buildActivityCvPerpsPayTransaction,
  buildActivityCvPerpsPendingDepositItem,
  buildActivityCvPerpsTradeItem,
  initialStateActivityWithPerpsDetails,
} from '../../../../tests/component-view/presets/activity';
import { renderPreloadedActivityDetailsView } from '../../../../tests/component-view/renderers/activity';
import { getRouteProbeTestId } from '../../../../tests/component-view/render';
import Engine from '../../../core/Engine';
import Routes from '../../../constants/navigation/Routes';
import type { ActivityListItem } from '../../../util/activity-adapters';
import {
  formatPerpsOrderFee,
  formatSignedPerpsFiat,
  formatPerpsTransactionDate,
  formatPositiveFiat,
  getPerpsPositionSize,
  getPerpsPriceValue,
  getPerpsTransaction,
} from './components/ActivityDetailsPerps.utils';
import {
  ActivityDetailsSelectorsIDs,
  getActivityDetailsStepIconTestId,
  getActivityDetailsStepTestId,
} from './ActivityDetails.testIds';

const findAmountTextColor = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  unsafeGetAllByType: (type: typeof Text) => any[],
  amountPattern: RegExp,
): TextColor | undefined => {
  const amountText = unsafeGetAllByType(Text).find((node) => {
    const { children } = node.props;
    return typeof children === 'string' && amountPattern.test(children);
  });
  return amountText?.props.color as TextColor | undefined;
};

const {
  SCREEN,
  HEADER,
  AMOUNT_HEADER,
  AMOUNT_AVATAR_SINGLE,
  STATUS_PILL,
  DATE_ROW,
  ACCOUNT_ROW,
  NETWORK_ROW,
  NETWORK_FEE_ROW,
  BRIDGE_FEE_ROW,
  TOTAL_ROW,
  FEE_TOKEN_AVATAR,
  SIZE_ROW,
  PRICE_ROW,
  FEES_ROW,
  PNL_ROW,
  LIMIT_PRICE_ROW,
  TRIGGER_PRICE_ROW,
  FILLED_ROW,
  TOTAL_FEE_ROW,
  RATE_ROW,
  FUNDING_FEE_ROW,
  BLOCK_EXPLORER_BUTTON,
  DO_IT_AGAIN_BUTTON,
} = ActivityDetailsSelectorsIDs;

const renderPerpsDetails = (item: ActivityListItem) => {
  const state = initialStateActivityWithPerpsDetails([
    buildActivityCvPerpsPayTransaction(item.hash),
  ]).build();

  return renderPreloadedActivityDetailsView(item, { state });
};

const renderPerpsTradeDetails = (item: ActivityListItem) => {
  const state = initialStateActivityWithPerpsDetails().build();

  return renderPreloadedActivityDetailsView(item, { state });
};

describeForPlatforms('ActivityDetails — Perps funds', () => {
  it('shows confirmed Account funded details with fees, completed steps, and Fund again', async () => {
    const item = buildActivityCvPerpsCompletedDepositItem();

    const {
      findByTestId,
      findByText,
      getByTestId,
      getByText,
      queryByTestId,
      UNSAFE_getAllByType,
    } = renderPerpsDetails(item);

    expect(await findByTestId(SCREEN)).toBeOnTheScreen();
    expect(
      await findByText(strings('transactions.activity_perps_account_funded')),
    ).toBeOnTheScreen();
    expect(getByTestId(HEADER)).toBeOnTheScreen();

    const amountHeader = await findByTestId(AMOUNT_HEADER);
    expect(
      within(amountHeader).getByTestId(AMOUNT_AVATAR_SINGLE),
    ).toBeOnTheScreen();
    expect(within(amountHeader).getByText('+$1,000')).toBeOnTheScreen();
    expect(findAmountTextColor(UNSAFE_getAllByType, /^\+\$1,000$/)).toBe(
      TextColor.SuccessDefault,
    );

    expect(await findByTestId(STATUS_PILL)).toHaveTextContent(
      strings('transaction.confirmed'),
    );
    expect(getByTestId(DATE_ROW)).toHaveTextContent(
      formatPerpsTransactionDate(item.timestamp),
      { exact: false },
    );
    expect(queryByTestId(NETWORK_ROW)).toBeNull();

    const networkFeeRow = getByTestId(NETWORK_FEE_ROW);
    expect(networkFeeRow).toHaveTextContent(
      strings('activity_details.transaction_fee'),
      { exact: false },
    );
    expect(within(networkFeeRow).getByText(/\$/)).toBeOnTheScreen();
    expect(within(networkFeeRow).getByText('ETH')).toBeOnTheScreen();
    expect(
      within(networkFeeRow).getByTestId(FEE_TOKEN_AVATAR),
    ).toBeOnTheScreen();

    const bridgeFeeRow = getByTestId(BRIDGE_FEE_ROW);
    expect(bridgeFeeRow).toHaveTextContent(
      strings('activity_details.bridge_fee'),
      { exact: false },
    );
    expect(within(bridgeFeeRow).getByText(/\$/)).toBeOnTheScreen();
    expect(within(bridgeFeeRow).getByText('USDC')).toBeOnTheScreen();
    expect(
      within(bridgeFeeRow).getByTestId(FEE_TOKEN_AVATAR),
    ).toBeOnTheScreen();

    expect(getByTestId(TOTAL_ROW)).toHaveTextContent(/\$/);
    expect(queryByTestId(BLOCK_EXPLORER_BUTTON)).toBeNull();

    expect(
      getByText(
        strings('perps.transactions.steps.title_completed', { completed: 4 }),
      ),
    ).toBeOnTheScreen();
    expect(
      getByText(strings('perps.transactions.steps.approve_funds')),
    ).toBeOnTheScreen();
    expect(
      getByText(strings('perps.transactions.steps.bridge_funds')),
    ).toBeOnTheScreen();
    expect(
      getByText(strings('perps.transactions.steps.receive_usdc')),
    ).toBeOnTheScreen();
    expect(
      getByText(strings('perps.transactions.steps.add_funds')),
    ).toBeOnTheScreen();

    for (const stepIndex of [0, 1, 2, 3]) {
      const step = getByTestId(getActivityDetailsStepTestId(stepIndex));
      expect(step).toBeOnTheScreen();
      expect(step).toHaveTextContent(/\d.+\s-\s/, { exact: false });
      expect(
        getByTestId(getActivityDetailsStepIconTestId(stepIndex)),
      ).toBeOnTheScreen();
    }

    const fundAgain = getByTestId(DO_IT_AGAIN_BUTTON);
    expect(fundAgain).toHaveTextContent(
      strings('perps.transactions.fund_again'),
    );

    fireEvent.press(fundAgain);

    expect(
      await findByTestId(getRouteProbeTestId(Routes.PERPS.ROOT)),
    ).toBeOnTheScreen();
  });

  it('shows pending funding-in-progress details with mixed steps and Fund again', async () => {
    const item = buildActivityCvPerpsPendingDepositItem();

    const {
      findByTestId,
      findByText,
      getByTestId,
      getByText,
      queryByTestId,
      UNSAFE_getAllByType,
    } = renderPerpsDetails(item);

    expect(await findByTestId(SCREEN)).toBeOnTheScreen();
    expect(
      await findByText(strings('transactions.activity_perps_account_funded')),
    ).toBeOnTheScreen();

    const amountHeader = await findByTestId(AMOUNT_HEADER);
    expect(
      within(amountHeader).getByTestId(AMOUNT_AVATAR_SINGLE),
    ).toBeOnTheScreen();
    expect(within(amountHeader).getByText('+$1,000')).toBeOnTheScreen();
    expect(findAmountTextColor(UNSAFE_getAllByType, /^\+\$1,000$/)).toBe(
      TextColor.SuccessDefault,
    );

    expect(await findByTestId(STATUS_PILL)).toHaveTextContent(
      strings('transaction.pending'),
    );
    expect(
      findAmountTextColor(
        UNSAFE_getAllByType,
        new RegExp(`^${strings('transaction.pending')}$`),
      ),
    ).toBe(TextColor.WarningDefault);
    expect(getByTestId(DATE_ROW)).toHaveTextContent(
      formatPerpsTransactionDate(item.timestamp),
      { exact: false },
    );
    expect(queryByTestId(NETWORK_ROW)).toBeNull();

    const networkFeeRow = getByTestId(NETWORK_FEE_ROW);
    expect(within(networkFeeRow).getByText('ETH')).toBeOnTheScreen();
    expect(
      within(networkFeeRow).getByTestId(FEE_TOKEN_AVATAR),
    ).toBeOnTheScreen();

    const bridgeFeeRow = getByTestId(BRIDGE_FEE_ROW);
    expect(within(bridgeFeeRow).getByText('USDC')).toBeOnTheScreen();
    expect(
      within(bridgeFeeRow).getByTestId(FEE_TOKEN_AVATAR),
    ).toBeOnTheScreen();
    expect(getByTestId(TOTAL_ROW)).toHaveTextContent(/\$/);
    expect(queryByTestId(BLOCK_EXPLORER_BUTTON)).toBeNull();

    expect(
      getByText(
        strings('perps.transactions.steps.title_pending', {
          completed: 1,
          pending: 3,
        }),
      ),
    ).toBeOnTheScreen();

    const completedStep = getByTestId(getActivityDetailsStepTestId(0));
    expect(completedStep).toHaveTextContent(
      strings('perps.transactions.steps.approve_funds'),
      { exact: false },
    );
    expect(completedStep).toHaveTextContent(/\d.+\s-\s/, { exact: false });

    const pendingStep = getByTestId(getActivityDetailsStepTestId(1));
    expect(pendingStep).toHaveTextContent(
      strings('perps.transactions.steps.bridge_funds'),
      { exact: false },
    );
    expect(pendingStep).toHaveTextContent(strings('transaction.pending'), {
      exact: false,
    });

    const upcomingReceive = getByTestId(getActivityDetailsStepTestId(2));
    expect(upcomingReceive).toHaveTextContent(
      strings('perps.transactions.steps.receive_usdc'),
      { exact: false },
    );
    expect(upcomingReceive).not.toHaveTextContent(
      strings('transaction.pending'),
      { exact: false },
    );
    expect(upcomingReceive).not.toHaveTextContent(/\d.+\s-\s/, {
      exact: false,
    });

    const upcomingAddFunds = getByTestId(getActivityDetailsStepTestId(3));
    expect(upcomingAddFunds).toHaveTextContent(
      strings('perps.transactions.steps.add_funds'),
      { exact: false },
    );
    expect(upcomingAddFunds).not.toHaveTextContent(
      strings('transaction.pending'),
      { exact: false },
    );

    for (const stepIndex of [0, 1, 2, 3]) {
      expect(
        getByTestId(getActivityDetailsStepIconTestId(stepIndex)),
      ).toBeOnTheScreen();
    }

    const fundAgain = getByTestId(DO_IT_AGAIN_BUTTON);
    expect(fundAgain).toHaveTextContent(
      strings('perps.transactions.fund_again'),
    );

    fireEvent.press(fundAgain);

    expect(
      await findByTestId(getRouteProbeTestId(Routes.PERPS.ROOT)),
    ).toBeOnTheScreen();
  });

  it('shows failed funding details with mixed steps and Try again', async () => {
    const item = buildActivityCvPerpsFailedDepositItem();

    const {
      findByTestId,
      getByTestId,
      getByText,
      queryByTestId,
      UNSAFE_getAllByType,
    } = renderPerpsDetails(item);

    expect(await findByTestId(SCREEN)).toBeOnTheScreen();
    expect(getByTestId(HEADER)).toHaveTextContent(
      `${strings('transactions.activity_perps_account_funded')} — ${strings(
        'transaction.failed',
      )}`,
    );

    const amountHeader = await findByTestId(AMOUNT_HEADER);
    expect(
      within(amountHeader).getByTestId(AMOUNT_AVATAR_SINGLE),
    ).toBeOnTheScreen();
    expect(within(amountHeader).getByText('+$1,000')).toBeOnTheScreen();
    expect(findAmountTextColor(UNSAFE_getAllByType, /^\+\$1,000$/)).toBe(
      TextColor.TextDefault,
    );

    expect(await findByTestId(STATUS_PILL)).toHaveTextContent(
      strings('transaction.failed'),
    );
    expect(
      findAmountTextColor(
        UNSAFE_getAllByType,
        new RegExp(`^${strings('transaction.failed')}$`),
      ),
    ).toBe(TextColor.ErrorDefault);
    expect(getByTestId(DATE_ROW)).toHaveTextContent(
      formatPerpsTransactionDate(item.timestamp),
      { exact: false },
    );
    expect(queryByTestId(NETWORK_ROW)).toBeNull();

    const networkFeeRow = getByTestId(NETWORK_FEE_ROW);
    expect(within(networkFeeRow).getByText('ETH')).toBeOnTheScreen();
    expect(
      within(networkFeeRow).getByTestId(FEE_TOKEN_AVATAR),
    ).toBeOnTheScreen();

    const bridgeFeeRow = getByTestId(BRIDGE_FEE_ROW);
    expect(within(bridgeFeeRow).getByText('USDC')).toBeOnTheScreen();
    expect(
      within(bridgeFeeRow).getByTestId(FEE_TOKEN_AVATAR),
    ).toBeOnTheScreen();
    expect(getByTestId(TOTAL_ROW)).toHaveTextContent(/\$/);
    expect(queryByTestId(BLOCK_EXPLORER_BUTTON)).toBeNull();

    expect(
      getByText(
        strings('perps.transactions.steps.title_failed', {
          completed: 3,
          failed: 1,
        }),
      ),
    ).toBeOnTheScreen();

    for (const [stepIndex, labelKey] of [
      [0, 'perps.transactions.steps.approve_funds'],
      [1, 'perps.transactions.steps.bridge_funds'],
      [2, 'perps.transactions.steps.receive_usdc'],
    ] as const) {
      const completedStep = getByTestId(
        getActivityDetailsStepTestId(stepIndex),
      );
      expect(completedStep).toHaveTextContent(strings(labelKey), {
        exact: false,
      });
      expect(completedStep).toHaveTextContent(/\d.+\s-\s/, { exact: false });
      expect(completedStep).not.toHaveTextContent(
        strings('transaction.failed'),
        { exact: false },
      );
    }

    const failedStep = getByTestId(getActivityDetailsStepTestId(3));
    expect(failedStep).toHaveTextContent(
      strings('perps.transactions.steps.add_funds'),
      { exact: false },
    );
    expect(failedStep).toHaveTextContent(strings('transaction.failed'), {
      exact: false,
    });
    expect(failedStep).not.toHaveTextContent(/\d.+\s-\s/, { exact: false });

    for (const stepIndex of [0, 1, 2, 3]) {
      expect(
        getByTestId(getActivityDetailsStepIconTestId(stepIndex)),
      ).toBeOnTheScreen();
    }

    const tryAgain = getByTestId(DO_IT_AGAIN_BUTTON);
    expect(tryAgain).toHaveTextContent(strings('perps.transactions.try_again'));

    fireEvent.press(tryAgain);

    expect(
      await findByTestId(getRouteProbeTestId(Routes.PERPS.ROOT)),
    ).toBeOnTheScreen();
  });

  it('shows confirmed Perps withdrawal details with Ethereum network, completed steps, and Withdraw', async () => {
    const item = buildActivityCvPerpsCompletedWithdrawalItem();

    const {
      findByTestId,
      getByTestId,
      getByText,
      queryByTestId,
      queryByText,
      UNSAFE_getAllByType,
    } = renderPerpsDetails(item);

    expect(await findByTestId(SCREEN)).toBeOnTheScreen();
    expect(getByTestId(HEADER)).toHaveTextContent(
      strings('transactions.activity_perps_withdrawal'),
    );

    const amountHeader = await findByTestId(AMOUNT_HEADER);
    expect(
      within(amountHeader).getByTestId(AMOUNT_AVATAR_SINGLE),
    ).toBeOnTheScreen();
    expect(within(amountHeader).getByText('-$1,000')).toBeOnTheScreen();
    expect(findAmountTextColor(UNSAFE_getAllByType, /^-\$1,000$/)).toBe(
      TextColor.TextDefault,
    );

    expect(await findByTestId(STATUS_PILL)).toHaveTextContent(
      strings('transaction.confirmed'),
    );
    expect(getByTestId(DATE_ROW)).toHaveTextContent(
      formatPerpsTransactionDate(item.timestamp),
      { exact: false },
    );

    const accountRow = getByTestId(ACCOUNT_ROW);
    expect(accountRow).toHaveTextContent(
      renderShortAddress(ACTIVITY_CV_ACCOUNT),
      { exact: false },
    );

    expect(getByTestId(NETWORK_ROW)).toHaveTextContent('Ethereum', {
      exact: false,
    });
    expect(queryByText('Arbitrum')).toBeNull();

    expect(queryByTestId(NETWORK_FEE_ROW)).toBeNull();
    expect(queryByTestId(BRIDGE_FEE_ROW)).toBeNull();
    expect(queryByTestId(TOTAL_ROW)).toBeNull();
    expect(queryByTestId(BLOCK_EXPLORER_BUTTON)).toBeNull();

    expect(
      getByText(
        strings('perps.transactions.steps.title_completed', { completed: 3 }),
      ),
    ).toBeOnTheScreen();
    expect(
      getByText(strings('perps.transactions.steps.initiate_withdrawal')),
    ).toBeOnTheScreen();
    expect(
      getByText(strings('perps.transactions.steps.process_withdrawal')),
    ).toBeOnTheScreen();
    expect(
      getByText(strings('perps.transactions.steps.receive_funds')),
    ).toBeOnTheScreen();

    for (const stepIndex of [0, 1, 2]) {
      const step = getByTestId(getActivityDetailsStepTestId(stepIndex));
      expect(step).toBeOnTheScreen();
      expect(step).toHaveTextContent(/\d.+\s-\s/, { exact: false });
      expect(
        getByTestId(getActivityDetailsStepIconTestId(stepIndex)),
      ).toBeOnTheScreen();
    }

    const withdraw = getByTestId(DO_IT_AGAIN_BUTTON);
    expect(withdraw).toHaveTextContent(strings('perps.withdrawal.withdraw'));

    fireEvent.press(withdraw);

    expect(
      await findByTestId(getRouteProbeTestId(Routes.PERPS.ROOT)),
    ).toBeOnTheScreen();
  });
});

describeForPlatforms('ActivityDetails — Perps trades', () => {
  const expectTradeDetails = async ({
    item,
    title,
    priceLabel,
    pnl,
  }: {
    item: ActivityListItem;
    title: string;
    priceLabel: string;
    pnl?: { amount: string; color: TextColor };
  }) => {
    const transaction = getPerpsTransaction(item);
    const fill = transaction?.fill;

    const { findByTestId, getByTestId, queryByTestId, UNSAFE_getAllByType } =
      renderPerpsTradeDetails(item);

    expect(await findByTestId(SCREEN)).toBeOnTheScreen();
    expect(getByTestId(HEADER)).toHaveTextContent(title);

    const amountHeader = await findByTestId(AMOUNT_HEADER);
    expect(
      within(amountHeader).getByTestId(AMOUNT_AVATAR_SINGLE),
    ).toBeOnTheScreen();
    expect(within(amountHeader).getByText('0.0001 BTC')).toBeOnTheScreen();
    expect(findAmountTextColor(UNSAFE_getAllByType, /^0\.0001 BTC$/)).toBe(
      TextColor.SuccessDefault,
    );

    expect(await findByTestId(STATUS_PILL)).toHaveTextContent(
      strings('transaction.confirmed'),
    );
    expect(getByTestId(DATE_ROW)).toHaveTextContent(
      formatPerpsTransactionDate(item.timestamp),
      { exact: false },
    );

    const sizeRow = getByTestId(SIZE_ROW);
    expect(sizeRow).toHaveTextContent(
      strings('perps.transactions.position.size'),
      { exact: false },
    );
    expect(
      within(sizeRow).getByText(getPerpsPositionSize(fill) ?? ''),
    ).toBeOnTheScreen();

    const priceRow = getByTestId(PRICE_ROW);
    expect(priceRow).toHaveTextContent(priceLabel, { exact: false });
    expect(
      within(priceRow).getByText(getPerpsPriceValue(fill?.entryPrice) ?? ''),
    ).toBeOnTheScreen();

    const feesRow = getByTestId(FEES_ROW);
    expect(feesRow).toHaveTextContent(
      strings('perps.transactions.position.fees'),
      { exact: false },
    );
    expect(
      within(feesRow).getByText(fill?.fee ? formatPositiveFiat(fill.fee) : ''),
    ).toBeOnTheScreen();

    if (pnl) {
      const pnlRow = getByTestId(PNL_ROW);
      expect(pnlRow).toHaveTextContent(
        strings('perps.transactions.position.pnl'),
        { exact: false },
      );
      expect(within(pnlRow).getByText(pnl.amount)).toBeOnTheScreen();
      expect(
        findAmountTextColor(
          UNSAFE_getAllByType,
          new RegExp(`^${pnl.amount.replace(/[+$]/g, '\\$&')}$`),
        ),
      ).toBe(pnl.color);
    } else {
      expect(queryByTestId(PNL_ROW)).toBeNull();
    }

    const explorer = getByTestId(BLOCK_EXPLORER_BUTTON);
    expect(explorer).toHaveTextContent(
      strings('activity_details.view_on_block_explorer'),
    );

    const tradeAgain = getByTestId(DO_IT_AGAIN_BUTTON);
    expect(tradeAgain).toHaveTextContent(
      strings('perps.transactions.trade_again'),
    );

    fireEvent.press(tradeAgain);

    expect(
      await findByTestId(getRouteProbeTestId(Routes.PERPS.ROOT)),
    ).toBeOnTheScreen();
  };

  it('shows confirmed Opened short details with entry price and Trade again', async () => {
    await expectTradeDetails({
      item: buildActivityCvPerpsTradeItem('openShort'),
      title: strings('transactions.activity_perps_open_short'),
      priceLabel: strings('perps.transactions.position.entry_price'),
    });
  });

  it('shows confirmed Opened long details with entry price and Trade again', async () => {
    await expectTradeDetails({
      item: buildActivityCvPerpsTradeItem('openLong'),
      title: strings('transactions.activity_perps_open_long'),
      priceLabel: strings('perps.transactions.position.entry_price'),
    });
  });

  it('shows confirmed Closed short details with close price, red Net P&L, and Trade again', async () => {
    await expectTradeDetails({
      item: buildActivityCvPerpsTradeItem('closeShort'),
      title: strings('transactions.activity_perps_close_short'),
      priceLabel: strings('perps.transactions.position.close_price'),
      pnl: { amount: '-$12.34', color: TextColor.ErrorDefault },
    });
  });

  it('shows confirmed Closed long details with close price, green Net P&L, and Trade again', async () => {
    await expectTradeDetails({
      item: buildActivityCvPerpsTradeItem('closeLong'),
      title: strings('transactions.activity_perps_close_long'),
      priceLabel: strings('perps.transactions.position.close_price'),
      pnl: { amount: '+$45.67', color: TextColor.SuccessDefault },
    });
  });
});

describeForPlatforms('ActivityDetails — Perps orders', () => {
  const perpsController = Engine.context.PerpsController as unknown as {
    getActiveProviderOrNull: jest.Mock;
    getOrderFills: jest.Mock;
  };

  const orderKinds = [
    'marketCloseShort',
    'stopMarketCloseShort',
    'takeProfitCanceled',
    'takeProfitFilled',
  ] as const;

  beforeEach(() => {
    perpsController.getActiveProviderOrNull.mockReturnValue({});
    perpsController.getOrderFills.mockResolvedValue(
      orderKinds.map((kind) =>
        buildActivityCvPerpsOrderFill(
          buildActivityCvPerpsOrderTransaction(kind).order?.orderId ?? kind,
        ),
      ),
    );
  });

  afterEach(() => {
    perpsController.getActiveProviderOrNull.mockReturnValue(null);
    perpsController.getOrderFills.mockResolvedValue([]);
  });

  const expectOrderDetails = async ({
    item,
    title,
    filled,
    status,
    statusColor,
    showTryAgain,
  }: {
    item: ActivityListItem;
    title: string;
    filled: string;
    status: string;
    statusColor: TextColor;
    showTryAgain: boolean;
  }) => {
    const order = getPerpsTransaction(item)?.order;

    const {
      findByTestId,
      getByTestId,
      queryByTestId,
      queryByText,
      UNSAFE_getAllByType,
    } = renderPerpsTradeDetails(item);

    expect(await findByTestId(SCREEN)).toBeOnTheScreen();
    expect(getByTestId(HEADER)).toHaveTextContent(title);

    const amountHeader = await findByTestId(AMOUNT_HEADER);
    expect(
      within(amountHeader).getByTestId(AMOUNT_AVATAR_SINGLE),
    ).toBeOnTheScreen();
    expect(within(amountHeader).getByText('0.0001 BTC')).toBeOnTheScreen();

    expect(await findByTestId(STATUS_PILL)).toHaveTextContent(status);
    expect(
      findAmountTextColor(UNSAFE_getAllByType, new RegExp(`^${status}$`)),
    ).toBe(statusColor);
    expect(getByTestId(STATUS_PILL)).not.toHaveTextContent(
      strings('transaction.confirmed'),
    );
    expect(getByTestId(DATE_ROW)).toHaveTextContent(
      formatPerpsTransactionDate(item.timestamp),
      { exact: false },
    );

    const sizeRow = getByTestId(SIZE_ROW);
    expect(sizeRow).toHaveTextContent(
      strings('perps.transactions.order.size'),
      {
        exact: false,
      },
    );
    expect(
      within(sizeRow).getByText(getPerpsPriceValue(order?.size) ?? ''),
    ).toBeOnTheScreen();

    if (order?.triggerPrice) {
      const triggerPriceRow = getByTestId(TRIGGER_PRICE_ROW);
      expect(triggerPriceRow).toHaveTextContent(
        strings('perps.order.trigger_price'),
        { exact: false },
      );
      expect(
        within(triggerPriceRow).getByText(
          getPerpsPriceValue(order.triggerPrice) ?? '',
        ),
      ).toBeOnTheScreen();
    } else {
      expect(queryByTestId(TRIGGER_PRICE_ROW)).not.toBeOnTheScreen();
    }

    if (order?.limitPrice) {
      const limitPriceRow = getByTestId(LIMIT_PRICE_ROW);
      expect(limitPriceRow).toHaveTextContent(
        strings('perps.transactions.order.limit_price'),
        { exact: false },
      );
      expect(
        within(limitPriceRow).getByText(
          getPerpsPriceValue(order.limitPrice) ?? '',
        ),
      ).toBeOnTheScreen();
    } else {
      expect(queryByTestId(LIMIT_PRICE_ROW)).not.toBeOnTheScreen();
    }

    expect(getByTestId(FILLED_ROW)).toHaveTextContent(filled, {
      exact: false,
    });

    expect(
      queryByText(strings('perps.transactions.order.metamask_fee')),
    ).toBeNull();
    expect(
      queryByText(strings('perps.transactions.order.hyperliquid_fee')),
    ).toBeNull();

    await waitFor(() => {
      expect(getByTestId(TOTAL_FEE_ROW)).toHaveTextContent(
        formatPerpsOrderFee(Number(ACTIVITY_CV_PERPS_ORDER_FEE)),
        { exact: false },
      );
    });
    expect(getByTestId(TOTAL_FEE_ROW)).not.toHaveTextContent('—');

    const explorer = getByTestId(BLOCK_EXPLORER_BUTTON);
    expect(explorer).toHaveTextContent(
      strings('activity_details.view_on_block_explorer'),
    );

    if (showTryAgain) {
      const tryAgain = getByTestId(DO_IT_AGAIN_BUTTON);
      expect(tryAgain).toHaveTextContent(
        strings('perps.transactions.try_again'),
      );
      fireEvent.press(tryAgain);
      expect(
        await findByTestId(getRouteProbeTestId(Routes.PERPS.ROOT)),
      ).toBeOnTheScreen();
      return;
    }

    expect(queryByTestId(DO_IT_AGAIN_BUTTON)).toBeNull();
    fireEvent.press(explorer);
    expect(
      await findByTestId(getRouteProbeTestId(Routes.WEBVIEW.MAIN)),
    ).toBeOnTheScreen();
  };

  it('shows filled market-close-short order details with Total fee and explorer', async () => {
    await expectOrderDetails({
      item: buildActivityCvPerpsOrderItem('marketCloseShort'),
      title: strings('transactions.activity_market_close_short'),
      filled: '100%',
      status: strings('transactions.activity_order_status_filled'),
      statusColor: TextColor.SuccessDefault,
      showTryAgain: false,
    });
  });

  it('shows filled stop-market-close-short order details with Total fee and explorer', async () => {
    await expectOrderDetails({
      item: buildActivityCvPerpsOrderItem('stopMarketCloseShort'),
      title: strings('transactions.activity_stop_market_close_short'),
      filled: '100%',
      status: strings('transactions.activity_order_status_filled'),
      statusColor: TextColor.SuccessDefault,
      showTryAgain: false,
    });
  });

  it('shows canceled take-profit order details with Try again', async () => {
    await expectOrderDetails({
      item: buildActivityCvPerpsOrderItem('takeProfitCanceled'),
      title: strings('transactions.activity_limit_close_short'),
      filled: '0%',
      status: strings('transactions.activity_order_status_canceled'),
      statusColor: TextColor.ErrorDefault,
      showTryAgain: true,
    });
  });

  it('shows filled take-profit order details with explorer and no Try again', async () => {
    await expectOrderDetails({
      item: buildActivityCvPerpsOrderItem('takeProfitFilled'),
      title: strings('transactions.activity_limit_close_short'),
      filled: '100%',
      status: strings('transactions.activity_order_status_filled'),
      statusColor: TextColor.SuccessDefault,
      showTryAgain: false,
    });
  });
});

describeForPlatforms('ActivityDetails — Perps funding', () => {
  const expectFundingDetails = async ({
    item,
    title,
    rate,
    feeAmount,
    feeColor,
  }: {
    item: ActivityListItem;
    title: string;
    rate: string;
    feeAmount: string;
    feeColor: TextColor;
  }) => {
    const { findByTestId, getByTestId, queryByTestId, UNSAFE_getAllByType } =
      renderPerpsTradeDetails(item);

    expect(await findByTestId(SCREEN)).toBeOnTheScreen();
    expect(getByTestId(HEADER)).toHaveTextContent(title);

    const amountHeader = await findByTestId(AMOUNT_HEADER);
    expect(
      within(amountHeader).getByTestId(AMOUNT_AVATAR_SINGLE),
    ).toBeOnTheScreen();
    expect(within(amountHeader).getByText('BTC')).toBeOnTheScreen();
    expect(findAmountTextColor(UNSAFE_getAllByType, /^BTC$/)).toBe(
      TextColor.SuccessDefault,
    );

    expect(await findByTestId(STATUS_PILL)).toHaveTextContent(
      strings('transaction.confirmed'),
    );
    expect(getByTestId(DATE_ROW)).toHaveTextContent(
      formatPerpsTransactionDate(item.timestamp),
      { exact: false },
    );

    expect(getByTestId(RATE_ROW)).toHaveTextContent(
      strings('perps.transactions.funding.rate'),
      { exact: false },
    );
    expect(within(getByTestId(RATE_ROW)).getByText(rate)).toBeOnTheScreen();

    const fundingFeeRow = getByTestId(FUNDING_FEE_ROW);
    expect(fundingFeeRow).toHaveTextContent(
      strings('perps.transactions.funding.funding_fee'),
      { exact: false },
    );
    expect(within(fundingFeeRow).getByText(feeAmount)).toBeOnTheScreen();
    expect(
      findAmountTextColor(
        UNSAFE_getAllByType,
        new RegExp(`^${feeAmount.replace(/[+$]/g, '\\$&')}$`),
      ),
    ).toBe(feeColor);

    expect(queryByTestId(DO_IT_AGAIN_BUTTON)).toBeNull();

    const explorer = getByTestId(BLOCK_EXPLORER_BUTTON);
    expect(explorer).toHaveTextContent(
      strings('activity_details.view_on_block_explorer'),
    );

    fireEvent.press(explorer);

    expect(
      await findByTestId(getRouteProbeTestId(Routes.WEBVIEW.MAIN)),
    ).toBeOnTheScreen();
  };

  it('shows received funding fees with a green fee and explorer', async () => {
    const item = buildActivityCvPerpsFundingItem('received');
    const funding = getPerpsTransaction(item)?.fundingAmount;

    await expectFundingDetails({
      item,
      title: strings('transactions.activity_perps_received_funding_fees'),
      rate: '-0.0125%',
      feeAmount: formatSignedPerpsFiat(
        funding?.feeNumber ?? 1.23,
        Boolean(funding?.isPositive),
      ),
      feeColor: TextColor.SuccessDefault,
    });
  });

  it('shows paid funding fees with a default fee and explorer', async () => {
    const item = buildActivityCvPerpsFundingItem('paid');
    const funding = getPerpsTransaction(item)?.fundingAmount;

    await expectFundingDetails({
      item,
      title: strings('transactions.activity_perps_paid_funding_fees'),
      rate: '0.01%',
      feeAmount: formatSignedPerpsFiat(
        funding?.feeNumber ?? 0.5,
        Boolean(funding?.isPositive),
      ),
      feeColor: TextColor.TextDefault,
    });
  });
});
