import '../../../../tests/component-view/mocks';
import { fireEvent, within } from '@testing-library/react-native';
import { Text, TextColor } from '@metamask/design-system-react-native';
import type { TransactionMeta } from '@metamask/transaction-controller';
import type { CaipChainId } from '@metamask/utils';
import { strings } from '../../../../locales/i18n';
import { describeForPlatforms } from '../../../../tests/component-view/platform';
import {
  ACTIVITY_CV_PERPS_WITHDRAW_ID,
  ACTIVITY_CV_PERPS_WITHDRAW_TIME_MS,
  ACTIVITY_CV_PREDICT_DEPOSIT_TIME_MS,
  ACTIVITY_CV_PREDICT_MARKET_TITLE,
  activityArbitrumNetworkEnablementOverride,
  activityPredictPayUsdcTokenOverride,
  activityPredictTradingEnabledFlag,
  buildConfirmedLocalPerpsWithdrawTransaction,
  buildConfirmedLocalPredictDepositWithPayTransaction,
  buildFailedLocalPredictDepositWithPayTransaction,
  buildPendingLocalPredictDepositWithPayTransaction,
  buildPredictBuyActivity,
  buildPredictClaimActivity,
  buildPredictSellActivity,
  initialStateActivity,
  initialStateActivityWithLocalTransactions,
} from '../../../../tests/component-view/presets/activity';
import {
  renderActivityDetailsView,
  getActivityDetailsViewParams,
} from '../../../../tests/component-view/renderers/activity';
import { mapPredictActivity } from '../../../util/activity-adapters';
import type { PredictActivity } from '../../UI/Predict/types';
import { formatPerpsTransactionDate } from './components/ActivityDetailsPerps.utils';
import { formatPredictDate } from './templates/PredictDetails/PredictDetails.types';
import { ActivityDetailsSelectorsIDs } from './ActivityDetails.testIds';

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
  STATUS_PILL,
  DATE_ROW,
  ACCOUNT_ROW,
  NETWORK_FEE_ROW,
  BRIDGE_FEE_ROW,
  TOTAL_ROW,
  FEE_TOKEN_AVATAR,
  BLOCK_EXPLORER_BUTTON,
  DO_IT_AGAIN_BUTTON,
} = ActivityDetailsSelectorsIDs;

const MAINNET_CAIP = 'eip155:1';
const ARBITRUM_CAIP = 'eip155:42161';
const PREDICT_ACTIVITY_CHAIN_ID = 'eip155:137' as CaipChainId;
const EXPECTED_DEPOSIT_DATE = formatPredictDate(
  ACTIVITY_CV_PREDICT_DEPOSIT_TIME_MS,
);
const AMOUNT_PATTERN = /\+.*4,?000.*USDC/;

function renderPredictDepositDetails(deposit: TransactionMeta) {
  const state = initialStateActivityWithLocalTransactions([deposit])
    .withRemoteFeatureFlags(activityPredictTradingEnabledFlag)
    .withOverrides(activityPredictPayUsdcTokenOverride)
    .build();

  return renderActivityDetailsView({
    state,
    params: {
      chainId: MAINNET_CAIP,
      txIdentifier: deposit.id,
    },
  });
}

function renderPredictProviderDetails(activity: PredictActivity) {
  const item = mapPredictActivity({
    activity,
    chainId: PREDICT_ACTIVITY_CHAIN_ID,
    quoteAsset: { symbol: 'USDC' },
  });
  if (!item) {
    throw new Error(`Unable to map Predict activity ${activity.id}`);
  }

  const params = getActivityDetailsViewParams(item);

  const state = initialStateActivity()
    .withRemoteFeatureFlags(activityPredictTradingEnabledFlag)
    .build();

  return renderActivityDetailsView({
    state,
    params,
  });
}

function expectPayFeeRows(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getByTestId: (id: string) => any,
) {
  const networkFeeRow = getByTestId(NETWORK_FEE_ROW);
  expect(networkFeeRow).toHaveTextContent(
    strings('activity_details.network_fee'),
    { exact: false },
  );
  expect(networkFeeRow).toHaveTextContent('$1.23', { exact: false });
  expect(within(networkFeeRow).getByText('ETH')).toBeOnTheScreen();
  expect(within(networkFeeRow).getByTestId(FEE_TOKEN_AVATAR)).toBeOnTheScreen();

  const bridgeFeeRow = getByTestId(BRIDGE_FEE_ROW);
  expect(bridgeFeeRow).toHaveTextContent(
    strings('activity_details.bridge_fee'),
    { exact: false },
  );
  expect(bridgeFeeRow).toHaveTextContent('$0.09', { exact: false });
  expect(within(bridgeFeeRow).getByText('USDC')).toBeOnTheScreen();
  expect(within(bridgeFeeRow).getByTestId(FEE_TOKEN_AVATAR)).toBeOnTheScreen();

  expect(getByTestId(TOTAL_ROW)).toHaveTextContent(
    strings('activity_details.total_amount'),
    { exact: false },
  );
  expect(getByTestId(TOTAL_ROW)).toHaveTextContent('$4,001.32', {
    exact: false,
  });
}

describeForPlatforms('ActivityDetails — Predict', () => {
  describe('Predict account funding', () => {
    it('shows confirmed Account funded with fees, completed steps, and Fund again', async () => {
      const deposit = buildConfirmedLocalPredictDepositWithPayTransaction();
      const {
        findByTestId,
        findByText,
        getByTestId,
        getByText,
        queryByTestId,
        UNSAFE_getAllByType,
      } = renderPredictDepositDetails(deposit);

      expect(await findByTestId(SCREEN)).toBeOnTheScreen();
      expect(getByTestId(HEADER)).toBeOnTheScreen();

      const amountHeader = await findByTestId(AMOUNT_HEADER);
      expect(within(amountHeader).getByText(AMOUNT_PATTERN)).toBeOnTheScreen();
      expect(findAmountTextColor(UNSAFE_getAllByType, AMOUNT_PATTERN)).toBe(
        TextColor.SuccessDefault,
      );

      expect(await findByTestId(STATUS_PILL)).toHaveTextContent(
        strings('transaction.confirmed'),
      );
      expect(getByTestId(DATE_ROW)).toHaveTextContent(EXPECTED_DEPOSIT_DATE, {
        exact: false,
      });
      expect(getByTestId(ACCOUNT_ROW)).toBeOnTheScreen();

      expectPayFeeRows(getByTestId);

      expect(
        await findByText(
          strings('predict.transactions.steps.title_completed', {
            completed: 2,
          }),
        ),
      ).toBeOnTheScreen();
      expect(
        getByText(strings('predict.transactions.steps.bridge_funds')),
      ).toBeOnTheScreen();
      expect(
        getByText(strings('predict.transactions.steps.add_funds')),
      ).toBeOnTheScreen();
      expect(getByTestId('activity-details-step-0')).toHaveTextContent(
        EXPECTED_DEPOSIT_DATE,
        { exact: false },
      );
      expect(getByTestId('activity-details-step-1')).toHaveTextContent(
        EXPECTED_DEPOSIT_DATE,
        { exact: false },
      );
      expect(getByTestId('activity-details-step-0-icon')).toBeOnTheScreen();
      expect(getByTestId('activity-details-step-1-icon')).toBeOnTheScreen();

      expect(queryByTestId(BLOCK_EXPLORER_BUTTON)).toBeNull();

      const fundAgain = getByTestId(DO_IT_AGAIN_BUTTON);
      expect(fundAgain).toHaveTextContent(
        strings('predict.transactions.fund_again'),
      );
      fireEvent.press(fundAgain);
    });

    it('shows pending funding with partial steps and View on block explorer', async () => {
      const deposit = buildPendingLocalPredictDepositWithPayTransaction();
      const {
        findByTestId,
        findByText,
        getByTestId,
        getByText,
        UNSAFE_getAllByType,
      } = renderPredictDepositDetails(deposit);

      expect(await findByTestId(SCREEN)).toBeOnTheScreen();

      const amountHeader = await findByTestId(AMOUNT_HEADER);
      expect(within(amountHeader).getByText(AMOUNT_PATTERN)).toBeOnTheScreen();
      expect(findAmountTextColor(UNSAFE_getAllByType, AMOUNT_PATTERN)).toBe(
        TextColor.SuccessDefault,
      );

      expect(await findByTestId(STATUS_PILL)).toHaveTextContent(
        strings('transaction.pending'),
      );
      expect(getByTestId(DATE_ROW)).toHaveTextContent(EXPECTED_DEPOSIT_DATE, {
        exact: false,
      });
      expect(getByTestId(ACCOUNT_ROW)).toBeOnTheScreen();

      expectPayFeeRows(getByTestId);

      expect(
        await findByText(
          strings('predict.transactions.steps.title_pending', {
            completed: 1,
            pending: 1,
          }),
        ),
      ).toBeOnTheScreen();
      expect(
        getByText(strings('predict.transactions.steps.bridge_funds')),
      ).toBeOnTheScreen();
      expect(
        getByText(strings('predict.transactions.steps.add_funds')),
      ).toBeOnTheScreen();
      expect(getByTestId('activity-details-step-0')).toHaveTextContent(
        EXPECTED_DEPOSIT_DATE,
        { exact: false },
      );
      expect(getByTestId('activity-details-step-0-icon')).toBeOnTheScreen();
      expect(getByTestId('activity-details-step-1')).toHaveTextContent(
        strings('transaction.pending'),
        { exact: false },
      );

      const blockExplorer = getByTestId(BLOCK_EXPLORER_BUTTON);
      expect(blockExplorer).toHaveTextContent(
        strings('activity_details.view_on_block_explorer'),
      );

      const fundAgain = getByTestId(DO_IT_AGAIN_BUTTON);
      expect(fundAgain).toHaveTextContent(
        strings('predict.transactions.fund_again'),
      );
      fireEvent.press(blockExplorer);
    });

    it('shows failed funding with failed step, Try again, and View on block explorer', async () => {
      const deposit = buildFailedLocalPredictDepositWithPayTransaction();
      const {
        findByTestId,
        findByText,
        getByTestId,
        getByText,
        UNSAFE_getAllByType,
      } = renderPredictDepositDetails(deposit);

      expect(await findByTestId(SCREEN)).toBeOnTheScreen();

      const amountHeader = await findByTestId(AMOUNT_HEADER);
      expect(within(amountHeader).getByText(AMOUNT_PATTERN)).toBeOnTheScreen();
      expect(findAmountTextColor(UNSAFE_getAllByType, AMOUNT_PATTERN)).toBe(
        TextColor.TextDefault,
      );

      expect(await findByTestId(STATUS_PILL)).toHaveTextContent(
        strings('transaction.failed'),
      );
      expect(getByTestId(DATE_ROW)).toHaveTextContent(EXPECTED_DEPOSIT_DATE, {
        exact: false,
      });
      expect(getByTestId(ACCOUNT_ROW)).toBeOnTheScreen();

      expectPayFeeRows(getByTestId);

      expect(
        await findByText(
          strings('predict.transactions.steps.title_failed', {
            completed: 1,
            failed: 1,
          }),
        ),
      ).toBeOnTheScreen();
      expect(
        getByText(strings('predict.transactions.steps.bridge_funds')),
      ).toBeOnTheScreen();
      expect(
        getByText(strings('predict.transactions.steps.add_funds')),
      ).toBeOnTheScreen();
      expect(getByTestId('activity-details-step-0')).toHaveTextContent(
        EXPECTED_DEPOSIT_DATE,
        { exact: false },
      );
      expect(getByTestId('activity-details-step-0-icon')).toBeOnTheScreen();
      expect(getByTestId('activity-details-step-1')).toHaveTextContent(
        strings('transaction.failed'),
        { exact: false },
      );
      expect(getByTestId('activity-details-step-1-icon')).toBeOnTheScreen();

      const blockExplorer = getByTestId(BLOCK_EXPLORER_BUTTON);
      expect(blockExplorer).toHaveTextContent(
        strings('activity_details.view_on_block_explorer'),
      );

      const tryAgain = getByTestId(DO_IT_AGAIN_BUTTON);
      expect(tryAgain).toHaveTextContent(
        strings('predict.transactions.try_again'),
      );
      fireEvent.press(tryAgain);
    });
  });

  describe('Perps withdrawal', () => {
    it('shows confirmed withdrawal with negative amount, account, and Withdraw CTA', async () => {
      const withdraw = buildConfirmedLocalPerpsWithdrawTransaction();
      const state = initialStateActivityWithLocalTransactions([withdraw])
        .withOverrides(activityArbitrumNetworkEnablementOverride)
        .build();

      const {
        findByTestId,
        findByText,
        getByTestId,
        getByText,
        queryByTestId,
        UNSAFE_getAllByType,
      } = renderActivityDetailsView({
        state,
        params: {
          chainId: ARBITRUM_CAIP,
          txIdentifier: ACTIVITY_CV_PERPS_WITHDRAW_ID,
        },
      });

      expect(await findByTestId(SCREEN)).toBeOnTheScreen();

      const amountHeader = await findByTestId(AMOUNT_HEADER);
      expect(
        within(amountHeader).getByText(/^-.*4,?000.*USDC/),
      ).toBeOnTheScreen();
      expect(findAmountTextColor(UNSAFE_getAllByType, /^-.*4,?000.*USDC/)).toBe(
        TextColor.TextDefault,
      );

      expect(await findByTestId(STATUS_PILL)).toHaveTextContent(
        strings('transaction.confirmed'),
      );

      const expectedDate = formatPerpsTransactionDate(
        ACTIVITY_CV_PERPS_WITHDRAW_TIME_MS,
      );
      expect(getByTestId(DATE_ROW)).toHaveTextContent(expectedDate, {
        exact: false,
      });
      expect(getByTestId(ACCOUNT_ROW)).toBeOnTheScreen();

      expect(queryByTestId(NETWORK_FEE_ROW)).toBeNull();
      expect(queryByTestId(BRIDGE_FEE_ROW)).toBeNull();
      expect(queryByTestId(TOTAL_ROW)).toBeNull();
      expect(queryByTestId(BLOCK_EXPLORER_BUTTON)).toBeNull();

      expect(
        await findByText(
          strings('perps.transactions.steps.title_completed', {
            completed: 3,
          }),
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

      const withdrawCta = getByTestId(DO_IT_AGAIN_BUTTON);
      expect(withdrawCta).toHaveTextContent(
        strings('perps.withdrawal.withdraw'),
      );
      fireEvent.press(withdrawCta);
    });
  });

  describe('Prediction placed and cashed out', () => {
    it('shows Prediction placed with predicted amount, shares bought, and Polymarket CTAs', async () => {
      const buy = buildPredictBuyActivity();
      const {
        findByTestId,
        findByText,
        getByTestId,
        getByText,
        queryByTestId,
      } = renderPredictProviderDetails(buy);

      expect(await findByTestId(SCREEN)).toBeOnTheScreen();
      expect(
        await findByText(strings('predict.transactions.you_predicted')),
      ).toBeOnTheScreen();
      expect(getByText(ACTIVITY_CV_PREDICT_MARKET_TITLE)).toBeOnTheScreen();
      expect(getByText('Yes')).toBeOnTheScreen();

      expect(await findByTestId(STATUS_PILL)).toHaveTextContent(
        strings('transaction.confirmed'),
      );
      expect(getByTestId(DATE_ROW)).toHaveTextContent(
        formatPredictDate(buy.entry.timestamp * 1000),
        { exact: false },
      );

      expect(
        getByText(strings('predict.transactions.predicted_amount')),
      ).toBeOnTheScreen();
      expect(getByText('$55.00')).toBeOnTheScreen();
      expect(
        getByText(strings('predict.transactions.shares_bought')),
      ).toBeOnTheScreen();
      expect(getByText('5.50')).toBeOnTheScreen();
      expect(
        getByText(strings('predict.transactions.price_per_share')),
      ).toBeOnTheScreen();
      expect(getByText('$10.00')).toBeOnTheScreen();

      expect(queryByTestId(AMOUNT_HEADER)).toBeNull();
      expect(queryByTestId(BLOCK_EXPLORER_BUTTON)).toBeNull();

      const viewOnPolymarket = getByText(
        strings('predict.transactions.view_on_polymarket'),
      );
      expect(viewOnPolymarket).toBeOnTheScreen();

      const placeAnother = getByTestId(DO_IT_AGAIN_BUTTON);
      expect(placeAnother).toHaveTextContent(
        strings('predict.transactions.place_another_prediction'),
      );
      // Assert CTAs before navigating — View on Polymarket leaves Details via WEBVIEW.
      fireEvent.press(placeAnother);
      fireEvent.press(viewOnPolymarket);
    });

    it('shows Cashed out with shares sold, outcome, and Polymarket CTAs', async () => {
      const sell = buildPredictSellActivity();
      const { findByTestId, findByText, getByTestId, getByText, queryByText } =
        renderPredictProviderDetails(sell);

      expect(await findByTestId(SCREEN)).toBeOnTheScreen();
      expect(
        await findByText(strings('predict.transactions.you_predicted')),
      ).toBeOnTheScreen();
      expect(getByText(ACTIVITY_CV_PREDICT_MARKET_TITLE)).toBeOnTheScreen();
      expect(getByText('Yes')).toBeOnTheScreen();

      expect(await findByTestId(STATUS_PILL)).toHaveTextContent(
        strings('transaction.confirmed'),
      );
      expect(getByTestId(DATE_ROW)).toHaveTextContent(
        formatPredictDate(sell.entry.timestamp * 1000),
        { exact: false },
      );

      expect(
        getByText(strings('predict.transactions.shares_sold')),
      ).toBeOnTheScreen();
      expect(
        getByText(strings('predict.transactions.price_per_share')),
      ).toBeOnTheScreen();
      expect(getByText('$0.7000')).toBeOnTheScreen();
      expect(queryByText(strings('predict.transactions.net_pnl'))).toBeNull();

      expect(
        getByText(strings('predict.transactions.view_on_polymarket')),
      ).toBeOnTheScreen();

      const placeAnother = getByTestId(DO_IT_AGAIN_BUTTON);
      expect(placeAnother).toHaveTextContent(
        strings('predict.transactions.place_another_prediction'),
      );
      fireEvent.press(placeAnother);
    });
  });

  describe('Claimed winnings', () => {
    it('shows Claimed winnings with USDC hero and Total Net P&L breakdown', async () => {
      const claim = buildPredictClaimActivity();
      const {
        findByTestId,
        findByText,
        getByTestId,
        getByText,
        queryByTestId,
        UNSAFE_getAllByType,
      } = renderPredictProviderDetails(claim);

      expect(await findByTestId(SCREEN)).toBeOnTheScreen();

      const amountHeader = await findByTestId(AMOUNT_HEADER);
      expect(within(amountHeader).getByText('+$5.49')).toBeOnTheScreen();
      expect(findAmountTextColor(UNSAFE_getAllByType, /\+\$5\.49/)).toBe(
        TextColor.SuccessDefault,
      );

      expect(await findByTestId(STATUS_PILL)).toHaveTextContent(
        strings('transaction.confirmed'),
      );
      expect(getByTestId(DATE_ROW)).toHaveTextContent(
        formatPredictDate(claim.entry.timestamp * 1000),
        { exact: false },
      );

      expect(
        await findByText(strings('predict.transactions.total_net_pnl')),
      ).toBeOnTheScreen();
      expect(getByText('+$12.50')).toBeOnTheScreen();
      expect(getByText('•')).toBeOnTheScreen();
      expect(getByText(ACTIVITY_CV_PREDICT_MARKET_TITLE)).toBeOnTheScreen();
      expect(getByText('+$4.25')).toBeOnTheScreen();

      expect(queryByTestId(DO_IT_AGAIN_BUTTON)).toBeNull();
      expect(queryByTestId(BLOCK_EXPLORER_BUTTON)).toBeNull();
    });
  });
});
