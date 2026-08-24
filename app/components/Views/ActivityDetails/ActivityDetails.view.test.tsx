import '../../../../tests/component-view/mocks';
import { act, fireEvent, waitFor, within } from '@testing-library/react-native';
import { Text, TextColor } from '@metamask/design-system-react-native';
import { strings } from '../../../../locales/i18n';
import { renderShortAddress } from '../../../util/address';
import { formatTimestampToDateTime } from '../../../util/date';
import { describeForPlatforms } from '../../../../tests/component-view/platform';
import {
  ACTIVITY_CV_ACCOUNT,
  ACTIVITY_CV_DEPOSIT_CONTRACT,
  ACTIVITY_CV_DEPOSIT_USDC_HASH,
  ACTIVITY_CV_DEPOSIT_USDC_TIMESTAMP_MS,
  ACTIVITY_CV_RECIPIENT,
  ACTIVITY_CV_RAMP_BUY_ORDER_ID,
  ACTIVITY_CV_RAMP_BUY_TX_HASH,
  ACTIVITY_CV_RAMP_CREATED_AT,
  ACTIVITY_CV_RAMP_SELL_ORDER_ID,
  ACTIVITY_CV_RAMP_SELL_TX_HASH,
  ACTIVITY_CV_SOLANA_ADDRESS,
  ACTIVITY_CV_SOLANA_CHAIN_ID,
  ACTIVITY_CV_SOLANA_SEND_ID,
  ACTIVITY_CV_SOLANA_SWAP_ID,
  ACTIVITY_CV_USDC,
  activityCvBridgeEthToMusdLineaHistoryEntry,
  activityCvBridgeEthToSolHistoryEntry,
  activityCvCrossChainSwapBridgeHistoryEntry,
  activityCvEthToMusdSwapHistoryEntry,
  activityCvMusdConversionHistoryEntry,
  activityCvPendingCrossChainSwapBridgeHistoryEntry,
  activityCvSolanaSendStateOverrides,
  activityCvSolanaSwapStateOverrides,
  activityLineaMusdTokenRatesOverride,
  activityLineaNetworkOverride,
  activityMusdTokenRatesOverride,
  activityUsdcTokenRatesOverride,
  buildActivityCvRampBuyMusdOrder,
  buildActivityCvRampSellEthOrder,
  buildConfirmedLocalBridgeEthToMusdLineaTransaction,
  buildConfirmedLocalBridgeEthToSolTransaction,
  buildConfirmedLocalContractInteractionWithFeesTransaction,
  buildConfirmedLocalCrossChainSwapTransaction,
  buildConfirmedLocalEthToMusdSwapTransaction,
  buildConfirmedLocalMusdClaimTransaction,
  buildConfirmedLocalMusdConversionTransaction,
  buildConfirmedLocalMusdSendTransaction,
  buildConfirmedLocalSmartAccountUpgradeTransaction,
  buildConfirmedLocalStakingDepositTransaction,
  buildConfirmedLocalUsdtIncreaseAllowanceTransaction,
  buildConfirmedLocalUsdtUnlimitedApproveTransaction,
  buildPendingLocalCrossChainSwapTransaction,
  initialStateActivity,
  initialStateActivityWithAccountsApi,
  initialStateActivityWithLocalTransactions,
  initialStateActivityWithRampOrders,
} from '../../../../tests/component-view/presets/activity';
import {
  clearAccountsTransactionsApiMocks,
  setupAccountsTransactionsApiMock,
} from '../../../../tests/component-view/api-mocking/accounts-transactions';
import { renderActivityDetailsView } from '../../../../tests/component-view/renderers/activity';
import { getRouteParamsProbeTestId } from '../../../../tests/component-view/render';
import Routes from '../../../constants/navigation/Routes';
import { formatShortRampOrderId } from './templates/rampDetailsUtils';
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
  AMOUNT_AVATAR_SINGLE,
  STATUS_PILL,
  DATE_ROW,
  FROM_ROW,
  TO_ROW,
  ACCOUNT_ROW,
  ADDRESS_ROW,
  NETWORK_ROW,
  TRANSACTION_ID_ROW,
  TRANSACTION_ID_COPY,
  RAMP_ORDER_ID_COPY,
  FEE_ROW,
  TOTAL_ROW,
  FEE_TOKEN_AVATAR,
  BLOCK_EXPLORER_BUTTON,
  DO_IT_AGAIN_BUTTON,
} = ActivityDetailsSelectorsIDs;

const MAINNET_CAIP = 'eip155:1';
const RECEIVE_MUSD_HASH = '0xactivitycvreceivemusd';
const RECEIVE_MUSD_TIMESTAMP_MS = 1_716_367_785_000;

describeForPlatforms('ActivityDetails — send / receive mUSD', () => {
  afterEach(() => {
    clearAccountsTransactionsApiMocks();
  });

  it('shows confirmed Sent mUSD details with fee, total, and copyable tx id', async () => {
    const sendTransaction = buildConfirmedLocalMusdSendTransaction();
    const state = initialStateActivityWithLocalTransactions([sendTransaction])
      .withOverrides(activityMusdTokenRatesOverride)
      .build();

    const {
      findByTestId,
      findByText,
      getByTestId,
      queryByTestId,
      UNSAFE_getAllByType,
    } = renderActivityDetailsView({
      state,
      params: {
        chainId: MAINNET_CAIP,
        txIdentifier: sendTransaction.id,
      },
    });

    expect(await findByTestId(SCREEN)).toBeOnTheScreen();
    expect(await findByText('Sent mUSD')).toBeOnTheScreen();
    expect(getByTestId(HEADER)).toBeOnTheScreen();

    const amountHeader = await findByTestId(AMOUNT_HEADER);
    expect(
      within(amountHeader).getByTestId(AMOUNT_AVATAR_SINGLE),
    ).toBeOnTheScreen();
    const primaryAmount = within(amountHeader).getByText(/^-.*mUSD/);
    expect(primaryAmount).toBeOnTheScreen();
    expect(findAmountTextColor(UNSAFE_getAllByType, /^-.*mUSD/)).toBe(
      TextColor.TextDefault,
    );

    expect(await findByTestId(STATUS_PILL)).toHaveTextContent(
      strings('transaction.confirmed'),
    );

    const expectedDate = formatTimestampToDateTime(sendTransaction.time);
    expect(getByTestId(DATE_ROW)).toHaveTextContent(expectedDate as string, {
      exact: false,
    });

    const fromRow = getByTestId(FROM_ROW);
    expect(fromRow).toHaveTextContent('Group 1', { exact: false });
    expect(fromRow).toHaveTextContent(renderShortAddress(ACTIVITY_CV_ACCOUNT), {
      exact: false,
    });

    expect(getByTestId(TO_ROW)).toHaveTextContent(
      renderShortAddress(ACTIVITY_CV_RECIPIENT),
      { exact: false },
    );

    expect(getByTestId(NETWORK_ROW)).toHaveTextContent(
      'Ethereum Main Network',
      { exact: false },
    );

    expect(getByTestId(TRANSACTION_ID_ROW)).toHaveTextContent(
      renderShortAddress(sendTransaction.hash as string),
      { exact: false },
    );
    fireEvent.press(getByTestId(TRANSACTION_ID_COPY));

    await waitFor(() => {
      expect(getByTestId(FEE_ROW)).toHaveTextContent(/\$/);
    });
    expect(
      within(getByTestId(FEE_ROW)).getByTestId(FEE_TOKEN_AVATAR),
    ).toBeOnTheScreen();

    expect(getByTestId(TOTAL_ROW)).toHaveTextContent(/\$/);
    expect(queryByTestId(ActivityDetailsSelectorsIDs.NOT_FOUND)).toBeNull();
  });

  it('shows confirmed Received mUSD details without fee/total and with copyable tx id', async () => {
    setupAccountsTransactionsApiMock([
      {
        hash: RECEIVE_MUSD_HASH,
        timestamp: new Date(RECEIVE_MUSD_TIMESTAMP_MS).toISOString(),
        chainId: 1,
        from: ACTIVITY_CV_RECIPIENT,
        to: ACTIVITY_CV_ACCOUNT,
        value: '0',
        valueTransfers: [
          {
            from: ACTIVITY_CV_RECIPIENT,
            to: ACTIVITY_CV_ACCOUNT,
            amount: '1000000',
            symbol: 'mUSD',
            decimal: 6,
            // Omit contractAddress so shouldSkipTransaction keeps this inbound row.
            name: 'MetaMask USD',
            transferType: 'ERC20',
          },
        ],
        isError: false,
        transactionCategory: 'TRANSFER',
      },
    ]);

    const state = initialStateActivityWithAccountsApi().build();

    const {
      findByTestId,
      findByText,
      getByTestId,
      queryByTestId,
      UNSAFE_getAllByType,
    } = renderActivityDetailsView({
      state,
      params: {
        chainId: MAINNET_CAIP,
        txIdentifier: RECEIVE_MUSD_HASH,
      },
    });

    expect(await findByTestId(SCREEN)).toBeOnTheScreen();
    expect(await findByText('Received mUSD')).toBeOnTheScreen();

    const amountHeader = await findByTestId(AMOUNT_HEADER);
    expect(
      within(amountHeader).getByTestId(AMOUNT_AVATAR_SINGLE),
    ).toBeOnTheScreen();
    const primaryAmount = within(amountHeader).getByText(/^\+.*mUSD/);
    expect(primaryAmount).toBeOnTheScreen();
    expect(findAmountTextColor(UNSAFE_getAllByType, /^\+.*mUSD/)).toBe(
      TextColor.SuccessDefault,
    );

    expect(await findByTestId(STATUS_PILL)).toHaveTextContent(
      strings('transaction.confirmed'),
    );

    const expectedDate = formatTimestampToDateTime(RECEIVE_MUSD_TIMESTAMP_MS);
    expect(getByTestId(DATE_ROW)).toHaveTextContent(expectedDate as string, {
      exact: false,
    });

    expect(getByTestId(FROM_ROW)).toHaveTextContent(
      renderShortAddress(ACTIVITY_CV_RECIPIENT),
      { exact: false },
    );

    const toRow = getByTestId(TO_ROW);
    expect(toRow).toHaveTextContent('Group 1', { exact: false });
    expect(toRow).toHaveTextContent(renderShortAddress(ACTIVITY_CV_ACCOUNT), {
      exact: false,
    });

    expect(getByTestId(NETWORK_ROW)).toHaveTextContent(
      'Ethereum Main Network',
      { exact: false },
    );

    expect(getByTestId(TRANSACTION_ID_ROW)).toHaveTextContent(
      renderShortAddress(RECEIVE_MUSD_HASH),
      { exact: false },
    );
    fireEvent.press(getByTestId(TRANSACTION_ID_COPY));

    // Incoming API receives have no network fee; Total still shows the amount.
    expect(queryByTestId(FEE_ROW)).not.toBeOnTheScreen();
    expect(getByTestId(TOTAL_ROW)).toBeOnTheScreen();
  });
});

describeForPlatforms('ActivityDetails — ramp buy / sell', () => {
  it('shows confirmed Sold ETH details with destination, EUR amounts, and copyable ids', async () => {
    const sellOrder = buildActivityCvRampSellEthOrder();
    const state = initialStateActivityWithRampOrders([sellOrder]).build();

    const {
      findByTestId,
      findByText,
      getByTestId,
      getByText,
      queryByText,
      UNSAFE_getAllByType,
    } = renderActivityDetailsView({
      state,
      params: {
        chainId: MAINNET_CAIP,
        txIdentifier: ACTIVITY_CV_RAMP_SELL_ORDER_ID,
      },
    });

    expect(await findByTestId(SCREEN)).toBeOnTheScreen();
    expect(await findByText('Sold ETH')).toBeOnTheScreen();

    const amountHeader = await findByTestId(AMOUNT_HEADER);
    expect(
      within(amountHeader).getByTestId(AMOUNT_AVATAR_SINGLE),
    ).toBeOnTheScreen();
    expect(within(amountHeader).getByText('-0.085 ETH')).toBeOnTheScreen();
    expect(findAmountTextColor(UNSAFE_getAllByType, /^-.*ETH/)).toBe(
      TextColor.TextDefault,
    );

    expect(await findByTestId(STATUS_PILL)).toHaveTextContent(
      strings('transaction.confirmed'),
    );

    const expectedDate = formatTimestampToDateTime(ACTIVITY_CV_RAMP_CREATED_AT);
    expect(getByTestId(DATE_ROW)).toHaveTextContent(expectedDate as string, {
      exact: false,
    });

    expect(
      getByText(formatShortRampOrderId(ACTIVITY_CV_RAMP_SELL_ORDER_ID)),
    ).toBeOnTheScreen();
    await act(async () => {
      fireEvent.press(getByTestId(RAMP_ORDER_ID_COPY));
    });

    const accountRow = getByTestId(ACCOUNT_ROW);
    expect(accountRow).toHaveTextContent('Group 1', { exact: false });
    expect(accountRow).toHaveTextContent(
      renderShortAddress(ACTIVITY_CV_ACCOUNT),
      { exact: false },
    );

    expect(getByText('Destination')).toBeOnTheScreen();
    expect(getByText('Transak')).toBeOnTheScreen();

    expect(getByTestId(TRANSACTION_ID_ROW)).toHaveTextContent(
      renderShortAddress(ACTIVITY_CV_RAMP_SELL_TX_HASH),
      { exact: false },
    );
    await act(async () => {
      fireEvent.press(getByTestId(TRANSACTION_ID_COPY));
    });

    expect(getByText('EUR value')).toBeOnTheScreen();
    expect(getByText('€61.88')).toBeOnTheScreen();
    expect(getByText('Fees')).toBeOnTheScreen();
    expect(getByText('€3')).toBeOnTheScreen();
    expect(getByText('Total received')).toBeOnTheScreen();
    expect(getByText('€58.88')).toBeOnTheScreen();
    expect(queryByText('Transaction fee')).toBeNull();
  });

  it('shows confirmed Bought mUSD details with USD fee and total and copyable ids', async () => {
    const buyOrder = buildActivityCvRampBuyMusdOrder();
    const state = initialStateActivityWithRampOrders([buyOrder]).build();

    const {
      findByTestId,
      findByText,
      getByTestId,
      getByText,
      queryByText,
      UNSAFE_getAllByType,
    } = renderActivityDetailsView({
      state,
      params: {
        chainId: MAINNET_CAIP,
        txIdentifier: ACTIVITY_CV_RAMP_BUY_ORDER_ID,
      },
    });

    expect(await findByTestId(SCREEN)).toBeOnTheScreen();
    expect(await findByText('Bought mUSD')).toBeOnTheScreen();

    const amountHeader = await findByTestId(AMOUNT_HEADER);
    expect(
      within(amountHeader).getByTestId(AMOUNT_AVATAR_SINGLE),
    ).toBeOnTheScreen();
    expect(within(amountHeader).getByText('+5.01 mUSD')).toBeOnTheScreen();
    expect(findAmountTextColor(UNSAFE_getAllByType, /^\+.*mUSD/)).toBe(
      TextColor.SuccessDefault,
    );

    expect(await findByTestId(STATUS_PILL)).toHaveTextContent(
      strings('transaction.confirmed'),
    );

    const expectedDate = formatTimestampToDateTime(ACTIVITY_CV_RAMP_CREATED_AT);
    expect(getByTestId(DATE_ROW)).toHaveTextContent(expectedDate as string, {
      exact: false,
    });

    expect(
      getByText(formatShortRampOrderId(ACTIVITY_CV_RAMP_BUY_ORDER_ID)),
    ).toBeOnTheScreen();
    await act(async () => {
      fireEvent.press(getByTestId(RAMP_ORDER_ID_COPY));
    });

    const accountRow = getByTestId(ACCOUNT_ROW);
    expect(accountRow).toHaveTextContent('Group 1', { exact: false });
    expect(accountRow).toHaveTextContent(
      renderShortAddress(ACTIVITY_CV_ACCOUNT),
      { exact: false },
    );

    expect(queryByText('Destination')).toBeNull();

    expect(getByTestId(TRANSACTION_ID_ROW)).toHaveTextContent(
      renderShortAddress(ACTIVITY_CV_RAMP_BUY_TX_HASH),
      { exact: false },
    );
    await act(async () => {
      fireEvent.press(getByTestId(TRANSACTION_ID_COPY));
    });

    expect(getByText('Transaction fee')).toBeOnTheScreen();
    expect(getByText('$1.26')).toBeOnTheScreen();
    expect(getByText('Total amount')).toBeOnTheScreen();
    expect(getByText('$6.27')).toBeOnTheScreen();
  });
});

describeForPlatforms('ActivityDetails — contract / approvals / upgrade', () => {
  it('shows confirmed Smart contract interaction with fee and total', async () => {
    const contractTransaction =
      buildConfirmedLocalContractInteractionWithFeesTransaction();
    const state = initialStateActivityWithLocalTransactions([
      contractTransaction,
    ]).build();

    const { findByTestId, findByText, getByTestId, queryByTestId } =
      renderActivityDetailsView({
        state,
        params: {
          chainId: MAINNET_CAIP,
          txIdentifier: contractTransaction.id,
        },
      });

    expect(await findByTestId(SCREEN)).toBeOnTheScreen();
    expect(
      await findByText(strings('transactions.smart_contract_interaction')),
    ).toBeOnTheScreen();
    expect(getByTestId(HEADER)).toBeOnTheScreen();
    expect(queryByTestId(AMOUNT_HEADER)).not.toBeOnTheScreen();
    expect(
      await findByText(renderShortAddress(ACTIVITY_CV_RECIPIENT)),
    ).toBeOnTheScreen();

    expect(await findByTestId(STATUS_PILL)).toHaveTextContent(
      strings('transaction.confirmed'),
    );

    const expectedDate = formatTimestampToDateTime(contractTransaction.time);
    expect(getByTestId(DATE_ROW)).toHaveTextContent(expectedDate as string, {
      exact: false,
    });

    const accountRow = getByTestId(ACCOUNT_ROW);
    expect(accountRow).toHaveTextContent('Group 1', { exact: false });
    expect(accountRow).toHaveTextContent(
      renderShortAddress(ACTIVITY_CV_ACCOUNT),
      { exact: false },
    );

    expect(getByTestId(NETWORK_ROW)).toHaveTextContent(
      'Ethereum Main Network',
      { exact: false },
    );

    expect(getByTestId(TRANSACTION_ID_ROW)).toHaveTextContent(
      renderShortAddress(contractTransaction.hash as string),
      { exact: false },
    );
    await act(async () => {
      fireEvent.press(getByTestId(TRANSACTION_ID_COPY));
    });

    await waitFor(() => {
      expect(getByTestId(FEE_ROW)).toHaveTextContent(/\$/);
    });
    expect(
      within(getByTestId(FEE_ROW)).getByTestId(FEE_TOKEN_AVATAR),
    ).toBeOnTheScreen();
    expect(getByTestId(TOTAL_ROW)).toHaveTextContent(/\$/);
  });

  it('shows confirmed Unlimited USDT approve with fee and no total', async () => {
    const approveTransaction =
      buildConfirmedLocalUsdtUnlimitedApproveTransaction();
    const state = initialStateActivityWithLocalTransactions([
      approveTransaction,
    ]).build();

    const { findByTestId, findByText, getByTestId, queryByTestId } =
      renderActivityDetailsView({
        state,
        params: {
          chainId: MAINNET_CAIP,
          txIdentifier: approveTransaction.id,
        },
      });

    expect(await findByTestId(SCREEN)).toBeOnTheScreen();
    expect(await findByText('Approved spending cap')).toBeOnTheScreen();
    expect(queryByTestId(AMOUNT_HEADER)).not.toBeOnTheScreen();
    expect(await findByTestId(AMOUNT_AVATAR_SINGLE)).toBeOnTheScreen();
    expect(await findByText('Unlimited USDT')).toBeOnTheScreen();

    expect(await findByTestId(STATUS_PILL)).toHaveTextContent(
      strings('transaction.confirmed'),
    );

    const expectedDate = formatTimestampToDateTime(approveTransaction.time);
    expect(getByTestId(DATE_ROW)).toHaveTextContent(expectedDate as string, {
      exact: false,
    });

    const accountRow = getByTestId(ACCOUNT_ROW);
    expect(accountRow).toHaveTextContent('Group 1', { exact: false });
    expect(accountRow).toHaveTextContent(
      renderShortAddress(ACTIVITY_CV_ACCOUNT),
      { exact: false },
    );

    expect(getByTestId(NETWORK_ROW)).toHaveTextContent(
      'Ethereum Main Network',
      { exact: false },
    );

    expect(getByTestId(TRANSACTION_ID_ROW)).toHaveTextContent(
      renderShortAddress(approveTransaction.hash as string),
      { exact: false },
    );
    await act(async () => {
      fireEvent.press(getByTestId(TRANSACTION_ID_COPY));
    });

    await waitFor(() => {
      expect(getByTestId(FEE_ROW)).toHaveTextContent(/\$/);
    });
    expect(queryByTestId(TOTAL_ROW)).not.toBeOnTheScreen();
  });

  it('shows confirmed Increased spending cap USDT with fee and no total', async () => {
    const increaseTransaction =
      buildConfirmedLocalUsdtIncreaseAllowanceTransaction();
    const state = initialStateActivityWithLocalTransactions([
      increaseTransaction,
    ]).build();

    const { findByTestId, findByText, getByTestId, queryByTestId } =
      renderActivityDetailsView({
        state,
        params: {
          chainId: MAINNET_CAIP,
          txIdentifier: increaseTransaction.id,
        },
      });

    expect(await findByTestId(SCREEN)).toBeOnTheScreen();
    expect(await findByText('Increased spending cap')).toBeOnTheScreen();
    expect(queryByTestId(AMOUNT_HEADER)).not.toBeOnTheScreen();
    expect(await findByTestId(AMOUNT_AVATAR_SINGLE)).toBeOnTheScreen();
    expect(await findByText('100 USDT')).toBeOnTheScreen();

    expect(await findByTestId(STATUS_PILL)).toHaveTextContent(
      strings('transaction.confirmed'),
    );

    const expectedDate = formatTimestampToDateTime(increaseTransaction.time);
    expect(getByTestId(DATE_ROW)).toHaveTextContent(expectedDate as string, {
      exact: false,
    });

    const accountRow = getByTestId(ACCOUNT_ROW);
    expect(accountRow).toHaveTextContent('Group 1', { exact: false });
    expect(accountRow).toHaveTextContent(
      renderShortAddress(ACTIVITY_CV_ACCOUNT),
      { exact: false },
    );

    expect(getByTestId(NETWORK_ROW)).toHaveTextContent(
      'Ethereum Main Network',
      { exact: false },
    );

    expect(getByTestId(TRANSACTION_ID_ROW)).toHaveTextContent(
      renderShortAddress(increaseTransaction.hash as string),
      { exact: false },
    );
    await act(async () => {
      fireEvent.press(getByTestId(TRANSACTION_ID_COPY));
    });

    await waitFor(() => {
      expect(getByTestId(FEE_ROW)).toHaveTextContent(/\$/);
    });
    expect(queryByTestId(TOTAL_ROW)).not.toBeOnTheScreen();
  });

  it('shows confirmed Smart account upgrade with Address row, fee, and no total', async () => {
    const upgradeTransaction =
      buildConfirmedLocalSmartAccountUpgradeTransaction();
    const state = initialStateActivityWithLocalTransactions([
      upgradeTransaction,
    ]).build();

    const { findByTestId, findByText, getByTestId, queryByTestId } =
      renderActivityDetailsView({
        state,
        params: {
          chainId: MAINNET_CAIP,
          txIdentifier: upgradeTransaction.id,
        },
      });

    expect(await findByTestId(SCREEN)).toBeOnTheScreen();
    expect(await findByText('Smart account upgraded')).toBeOnTheScreen();
    expect(queryByTestId(AMOUNT_HEADER)).not.toBeOnTheScreen();
    // Hero shows the upgraded account display name (Group 1).
    expect(await findByText('Group 1')).toBeOnTheScreen();

    expect(await findByTestId(STATUS_PILL)).toHaveTextContent(
      strings('transaction.confirmed'),
    );

    const expectedDate = formatTimestampToDateTime(upgradeTransaction.time);
    expect(getByTestId(DATE_ROW)).toHaveTextContent(expectedDate as string, {
      exact: false,
    });

    expect(getByTestId(ADDRESS_ROW)).toHaveTextContent(
      renderShortAddress(ACTIVITY_CV_ACCOUNT),
      { exact: false },
    );
    expect(queryByTestId(ACCOUNT_ROW)).not.toBeOnTheScreen();

    expect(getByTestId(NETWORK_ROW)).toHaveTextContent(
      'Ethereum Main Network',
      { exact: false },
    );

    expect(getByTestId(TRANSACTION_ID_ROW)).toHaveTextContent(
      renderShortAddress(upgradeTransaction.hash as string),
      { exact: false },
    );
    await act(async () => {
      fireEvent.press(getByTestId(TRANSACTION_ID_COPY));
    });

    await waitFor(() => {
      expect(getByTestId(FEE_ROW)).toHaveTextContent(/\$/);
    });
    expect(queryByTestId(TOTAL_ROW)).not.toBeOnTheScreen();
  });
});

const bridgeHistoryOverride = (
  txMetaId: string,
  historyEntry: Record<string, unknown>,
) =>
  ({
    engine: {
      backgroundState: {
        BridgeStatusController: {
          txHistory: {
            [txMetaId]: historyEntry,
          },
        },
      },
    },
  }) as never;

describeForPlatforms('ActivityDetails — swap / convert / bridge', () => {
  it('shows confirmed Swapped ETH → mUSD dual header with fee and total', async () => {
    const swapTransaction = buildConfirmedLocalEthToMusdSwapTransaction();
    const state = initialStateActivityWithLocalTransactions([swapTransaction])
      .withOverrides(activityMusdTokenRatesOverride)
      .withOverrides(
        bridgeHistoryOverride(
          swapTransaction.id,
          activityCvEthToMusdSwapHistoryEntry,
        ),
      )
      .build();

    const {
      findByTestId,
      findByText,
      getByTestId,
      getByText,
      UNSAFE_getAllByType,
    } = renderActivityDetailsView({
      state,
      params: {
        chainId: MAINNET_CAIP,
        txIdentifier: swapTransaction.id,
      },
    });

    expect(await findByTestId(SCREEN)).toBeOnTheScreen();
    expect(
      await findByText(strings('transactions.activity_swapped')),
    ).toBeOnTheScreen();

    const amountHeader = await findByTestId(AMOUNT_HEADER);
    expect(getByText(strings('activity_details.you_sent'))).toBeOnTheScreen();
    expect(
      getByText(strings('activity_details.you_received')),
    ).toBeOnTheScreen();
    expect(within(amountHeader).getByText(/^-.*ETH/)).toBeOnTheScreen();
    expect(within(amountHeader).getByText(/^\+.*mUSD/)).toBeOnTheScreen();
    expect(findAmountTextColor(UNSAFE_getAllByType, /^\+.*mUSD/)).toBe(
      TextColor.SuccessDefault,
    );
    expect(
      within(amountHeader).getAllByTestId(AMOUNT_AVATAR_SINGLE),
    ).toHaveLength(2);

    expect(await findByTestId(STATUS_PILL)).toHaveTextContent(
      strings('transaction.confirmed'),
    );

    const expectedDate = formatTimestampToDateTime(swapTransaction.time);
    expect(getByTestId(DATE_ROW)).toHaveTextContent(expectedDate as string, {
      exact: false,
    });

    const accountRow = getByTestId(ACCOUNT_ROW);
    expect(accountRow).toHaveTextContent('Group 1', { exact: false });
    expect(accountRow).toHaveTextContent(
      renderShortAddress(ACTIVITY_CV_ACCOUNT),
      { exact: false },
    );

    expect(getByTestId(NETWORK_ROW)).toHaveTextContent(
      'Ethereum Main Network',
      { exact: false },
    );

    expect(getByTestId(TRANSACTION_ID_ROW)).toHaveTextContent(
      renderShortAddress(swapTransaction.hash as string),
      { exact: false },
    );
    await act(async () => {
      fireEvent.press(getByTestId(TRANSACTION_ID_COPY));
    });

    await waitFor(() => {
      expect(getByTestId(FEE_ROW)).toHaveTextContent(/\$/);
    });
    expect(getByTestId(TOTAL_ROW)).toHaveTextContent(/\$/);
  });

  it('shows confirmed Converted to mUSD dual header without a step timeline', async () => {
    const convertTransaction = buildConfirmedLocalMusdConversionTransaction();
    const state = initialStateActivityWithLocalTransactions([
      convertTransaction,
    ])
      .withOverrides(activityUsdcTokenRatesOverride)
      .withOverrides(
        bridgeHistoryOverride(
          convertTransaction.id,
          activityCvMusdConversionHistoryEntry,
        ),
      )
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
        chainId: MAINNET_CAIP,
        txIdentifier: convertTransaction.id,
      },
    });

    expect(await findByTestId(SCREEN)).toBeOnTheScreen();
    expect(await findByText('Converted mUSD')).toBeOnTheScreen();

    const amountHeader = await findByTestId(AMOUNT_HEADER);
    expect(getByText(strings('activity_details.you_sent'))).toBeOnTheScreen();
    expect(
      getByText(strings('activity_details.you_received')),
    ).toBeOnTheScreen();
    expect(within(amountHeader).getByText(/^-.*USDC/)).toBeOnTheScreen();
    expect(within(amountHeader).getByText(/^\+.*mUSD/)).toBeOnTheScreen();
    expect(findAmountTextColor(UNSAFE_getAllByType, /^\+.*mUSD/)).toBe(
      TextColor.SuccessDefault,
    );

    expect(await findByTestId(STATUS_PILL)).toHaveTextContent(
      strings('transaction.confirmed'),
    );

    const expectedDate = formatTimestampToDateTime(convertTransaction.time);
    expect(getByTestId(DATE_ROW)).toHaveTextContent(expectedDate as string, {
      exact: false,
    });

    expect(getByTestId(TRANSACTION_ID_ROW)).toHaveTextContent(
      renderShortAddress(convertTransaction.hash as string),
      { exact: false },
    );
    await act(async () => {
      fireEvent.press(getByTestId(TRANSACTION_ID_COPY));
    });

    // Convert uses SwapDetails (dual header), not a step-timeline template.
    expect(queryByTestId(BLOCK_EXPLORER_BUTTON)).toBeOnTheScreen();
    expect(queryByTestId(`${BLOCK_EXPLORER_BUTTON}-source`)).toBeNull();
    expect(queryByTestId(`${BLOCK_EXPLORER_BUTTON}-dest`)).toBeNull();

    await waitFor(() => {
      expect(getByTestId(FEE_ROW)).toHaveTextContent(/\$/);
    });
    expect(getByTestId(TOTAL_ROW)).toHaveTextContent(/\$/);
  });

  it('shows confirmed Bridged ETH → mUSD Linea with dual network and fee/total', async () => {
    const bridgeTransaction =
      buildConfirmedLocalBridgeEthToMusdLineaTransaction();
    const state = initialStateActivityWithLocalTransactions([bridgeTransaction])
      .withOverrides(activityLineaNetworkOverride)
      .withOverrides(activityMusdTokenRatesOverride)
      .withOverrides(
        bridgeHistoryOverride(
          bridgeTransaction.id,
          activityCvBridgeEthToMusdLineaHistoryEntry,
        ),
      )
      .build();

    const {
      findByTestId,
      findByText,
      getByTestId,
      getByText,
      UNSAFE_getAllByType,
    } = renderActivityDetailsView({
      state,
      params: {
        chainId: MAINNET_CAIP,
        txIdentifier: bridgeTransaction.id,
      },
    });

    expect(await findByTestId(SCREEN)).toBeOnTheScreen();
    expect(await findByText('Bridged mUSD')).toBeOnTheScreen();

    const amountHeader = await findByTestId(AMOUNT_HEADER);
    expect(getByText(strings('activity_details.you_sent'))).toBeOnTheScreen();
    expect(
      getByText(strings('activity_details.you_received')),
    ).toBeOnTheScreen();
    expect(within(amountHeader).getByText(/^-.*ETH/)).toBeOnTheScreen();
    expect(within(amountHeader).getByText(/^\+.*mUSD/)).toBeOnTheScreen();
    expect(findAmountTextColor(UNSAFE_getAllByType, /^\+.*mUSD/)).toBe(
      TextColor.SuccessDefault,
    );

    expect(await findByTestId(STATUS_PILL)).toHaveTextContent(
      strings('transaction.confirmed'),
    );

    const expectedDate = formatTimestampToDateTime(bridgeTransaction.time);
    expect(getByTestId(DATE_ROW)).toHaveTextContent(expectedDate as string, {
      exact: false,
    });

    const accountRow = getByTestId(ACCOUNT_ROW);
    expect(accountRow).toHaveTextContent('Group 1', { exact: false });
    expect(accountRow).toHaveTextContent(
      renderShortAddress(ACTIVITY_CV_ACCOUNT),
      { exact: false },
    );

    const networkRow = getByTestId(NETWORK_ROW);
    expect(networkRow).toHaveTextContent('Ethereum', { exact: false });
    expect(networkRow).toHaveTextContent('Linea', { exact: false });
    expect(networkRow).toHaveTextContent('→', { exact: false });

    expect(getByTestId(TRANSACTION_ID_ROW)).toHaveTextContent(
      renderShortAddress(bridgeTransaction.hash as string),
      { exact: false },
    );
    await act(async () => {
      fireEvent.press(getByTestId(TRANSACTION_ID_COPY));
    });

    await waitFor(() => {
      expect(getByTestId(FEE_ROW)).toHaveTextContent(/\$/);
    });
    expect(getByTestId(TOTAL_ROW)).toHaveTextContent(/\$/);
  });

  it('shows confirmed Bridged ETH → SOL with dual network and explorer sheet CTA', async () => {
    const bridgeTransaction = buildConfirmedLocalBridgeEthToSolTransaction();
    const state = initialStateActivityWithLocalTransactions([bridgeTransaction])
      .withOverrides(
        bridgeHistoryOverride(
          bridgeTransaction.id,
          activityCvBridgeEthToSolHistoryEntry,
        ),
      )
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
        chainId: MAINNET_CAIP,
        txIdentifier: bridgeTransaction.id,
      },
    });

    expect(await findByTestId(SCREEN)).toBeOnTheScreen();
    expect(await findByText('Bridged SOL')).toBeOnTheScreen();

    const amountHeader = await findByTestId(AMOUNT_HEADER);
    expect(getByText(strings('activity_details.you_sent'))).toBeOnTheScreen();
    expect(
      getByText(strings('activity_details.you_received')),
    ).toBeOnTheScreen();
    expect(within(amountHeader).getByText(/^-.*ETH/)).toBeOnTheScreen();
    expect(within(amountHeader).getByText(/^\+.*SOL/)).toBeOnTheScreen();
    expect(findAmountTextColor(UNSAFE_getAllByType, /^\+.*SOL/)).toBe(
      TextColor.SuccessDefault,
    );

    expect(await findByTestId(STATUS_PILL)).toHaveTextContent(
      strings('transaction.confirmed'),
    );

    const expectedDate = formatTimestampToDateTime(bridgeTransaction.time);
    expect(getByTestId(DATE_ROW)).toHaveTextContent(expectedDate as string, {
      exact: false,
    });

    const accountRow = getByTestId(ACCOUNT_ROW);
    expect(accountRow).toHaveTextContent('Group 1', { exact: false });

    const networkRow = getByTestId(NETWORK_ROW);
    expect(networkRow).toHaveTextContent('Ethereum', { exact: false });
    expect(networkRow).toHaveTextContent('Solana', { exact: false });
    expect(networkRow).toHaveTextContent('→', { exact: false });

    expect(getByTestId(TRANSACTION_ID_ROW)).toHaveTextContent(
      renderShortAddress(bridgeTransaction.hash as string),
      { exact: false },
    );
    await act(async () => {
      fireEvent.press(getByTestId(TRANSACTION_ID_COPY));
    });

    await waitFor(() => {
      expect(getByTestId(FEE_ROW)).toHaveTextContent(/\$/);
    });
    expect(getByTestId(TOTAL_ROW)).toHaveTextContent(/\$/);

    // Local EVM→nonEVM bridges open one explorer sheet, not per-leg buttons.
    expect(getByTestId(BLOCK_EXPLORER_BUTTON)).toBeOnTheScreen();
    expect(queryByTestId(`${BLOCK_EXPLORER_BUTTON}-source`)).toBeNull();
    expect(queryByTestId(`${BLOCK_EXPLORER_BUTTON}-dest`)).toBeNull();
    await act(async () => {
      fireEvent.press(getByTestId(BLOCK_EXPLORER_BUTTON));
    });
    const bridgeModalsParamsEl = await findByTestId(
      getRouteParamsProbeTestId(Routes.BRIDGE.MODALS.ROOT),
    );
    expect(bridgeModalsParamsEl).toBeOnTheScreen();
    const bridgeModalsParams = JSON.parse(
      bridgeModalsParamsEl.props.children as string,
    );
    expect(bridgeModalsParams.screen).toBe(
      Routes.BRIDGE.MODALS.TRANSACTION_DETAILS_BLOCK_EXPLORER,
    );
    expect(bridgeModalsParams.params.evmTxMeta.id).toBe(bridgeTransaction.id);
  });
});

const LINEA_CAIP = 'eip155:59144';

describeForPlatforms('ActivityDetails — claim / deposit', () => {
  afterEach(() => {
    clearAccountsTransactionsApiMocks();
  });

  it('shows confirmed Claimed mUSD bonus with fee and total', async () => {
    const claimTransaction = buildConfirmedLocalMusdClaimTransaction();
    const state = initialStateActivityWithLocalTransactions([claimTransaction])
      .withOverrides(activityLineaNetworkOverride)
      .withOverrides(activityLineaMusdTokenRatesOverride)
      .withOverrides({
        engine: {
          backgroundState: {
            NetworkEnablementController: {
              enabledNetworkMap: {
                eip155: {
                  '0x1': true,
                  '0xe708': true,
                },
                solana: {},
              },
            },
          },
        },
      } as never)
      .build();

    const { findByTestId, findByText, getByTestId, UNSAFE_getAllByType } =
      renderActivityDetailsView({
        state,
        params: {
          chainId: LINEA_CAIP,
          txIdentifier: claimTransaction.id,
        },
      });

    expect(await findByTestId(SCREEN)).toBeOnTheScreen();
    expect(
      await findByText(strings('transactions.activity_claim_musd_bonus')),
    ).toBeOnTheScreen();

    const amountHeader = await findByTestId(AMOUNT_HEADER);
    expect(
      within(amountHeader).getByTestId(AMOUNT_AVATAR_SINGLE),
    ).toBeOnTheScreen();
    expect(within(amountHeader).getByText(/^\+.*mUSD/)).toBeOnTheScreen();
    expect(findAmountTextColor(UNSAFE_getAllByType, /^\+.*mUSD/)).toBe(
      TextColor.SuccessDefault,
    );

    expect(await findByTestId(STATUS_PILL)).toHaveTextContent(
      strings('transaction.confirmed'),
    );

    const expectedDate = formatTimestampToDateTime(claimTransaction.time);
    expect(getByTestId(DATE_ROW)).toHaveTextContent(expectedDate as string, {
      exact: false,
    });

    const accountRow = getByTestId(ACCOUNT_ROW);
    expect(accountRow).toHaveTextContent('Group 1', { exact: false });
    expect(accountRow).toHaveTextContent(
      renderShortAddress(ACTIVITY_CV_ACCOUNT),
      { exact: false },
    );

    expect(getByTestId(NETWORK_ROW)).toHaveTextContent('Linea', {
      exact: false,
    });

    expect(getByTestId(TRANSACTION_ID_ROW)).toHaveTextContent(
      renderShortAddress(claimTransaction.hash as string),
      { exact: false },
    );
    await act(async () => {
      fireEvent.press(getByTestId(TRANSACTION_ID_COPY));
    });

    await waitFor(() => {
      expect(getByTestId(FEE_ROW)).toHaveTextContent(/\$/);
    });
    expect(getByTestId(TOTAL_ROW)).toHaveTextContent(/\$/);
  });

  it('shows confirmed Deposited USDC with total and no fee row', async () => {
    setupAccountsTransactionsApiMock([
      {
        hash: ACTIVITY_CV_DEPOSIT_USDC_HASH,
        timestamp: new Date(
          ACTIVITY_CV_DEPOSIT_USDC_TIMESTAMP_MS,
        ).toISOString(),
        chainId: 1,
        from: ACTIVITY_CV_ACCOUNT,
        to: ACTIVITY_CV_DEPOSIT_CONTRACT,
        value: '0',
        gasUsed: 21000,
        effectiveGasPrice: 1_000_000_000,
        valueTransfers: [
          {
            from: ACTIVITY_CV_ACCOUNT,
            to: ACTIVITY_CV_DEPOSIT_CONTRACT,
            amount: '1000000',
            symbol: 'USDC',
            decimal: 6,
            contractAddress: ACTIVITY_CV_USDC,
            transferType: 'ERC20',
          },
        ],
        isError: false,
        transactionCategory: 'DEPOSIT',
      },
    ]);

    const state = initialStateActivityWithAccountsApi()
      .withOverrides(activityUsdcTokenRatesOverride)
      .build();

    const {
      findByTestId,
      findByText,
      getByTestId,
      queryByTestId,
      UNSAFE_getAllByType,
    } = renderActivityDetailsView({
      state,
      params: {
        chainId: MAINNET_CAIP,
        txIdentifier: ACTIVITY_CV_DEPOSIT_USDC_HASH,
      },
    });

    expect(await findByTestId(SCREEN)).toBeOnTheScreen();
    expect(await findByText('Deposited USDC')).toBeOnTheScreen();

    const amountHeader = await findByTestId(AMOUNT_HEADER);
    expect(
      within(amountHeader).getByTestId(AMOUNT_AVATAR_SINGLE),
    ).toBeOnTheScreen();
    expect(within(amountHeader).getByText(/^-.*USDC/)).toBeOnTheScreen();
    expect(findAmountTextColor(UNSAFE_getAllByType, /^-.*USDC/)).toBe(
      TextColor.TextDefault,
    );

    expect(await findByTestId(STATUS_PILL)).toHaveTextContent(
      strings('transaction.confirmed'),
    );

    const expectedDate = formatTimestampToDateTime(
      ACTIVITY_CV_DEPOSIT_USDC_TIMESTAMP_MS,
    );
    expect(getByTestId(DATE_ROW)).toHaveTextContent(expectedDate as string, {
      exact: false,
    });

    const accountRow = getByTestId(ACCOUNT_ROW);
    expect(accountRow).toHaveTextContent('Group 1', { exact: false });
    expect(accountRow).toHaveTextContent(
      renderShortAddress(ACTIVITY_CV_ACCOUNT),
      { exact: false },
    );

    expect(getByTestId(NETWORK_ROW)).toHaveTextContent(
      'Ethereum Main Network',
      { exact: false },
    );

    expect(getByTestId(TRANSACTION_ID_ROW)).toHaveTextContent(
      renderShortAddress(ACTIVITY_CV_DEPOSIT_USDC_HASH),
      { exact: false },
    );
    await act(async () => {
      fireEvent.press(getByTestId(TRANSACTION_ID_COPY));
    });

    expect(queryByTestId(FEE_ROW)).not.toBeOnTheScreen();
    expect(getByTestId(TOTAL_ROW)).toHaveTextContent(/\$/);
  });
});

describeForPlatforms('ActivityDetails — stake', () => {
  it('shows confirmed Staked Ethereum with fee, total, tx id, and explorer', async () => {
    const stakeTransaction = buildConfirmedLocalStakingDepositTransaction();
    const state = initialStateActivityWithLocalTransactions([
      stakeTransaction,
    ]).build();

    const {
      findByTestId,
      findByText,
      getByTestId,
      queryByTestId,
      UNSAFE_getAllByType,
    } = renderActivityDetailsView({
      state,
      params: {
        chainId: MAINNET_CAIP,
        txIdentifier: stakeTransaction.id,
      },
    });

    expect(await findByTestId(SCREEN)).toBeOnTheScreen();
    expect(await findByText('Staked Ethereum')).toBeOnTheScreen();
    expect(getByTestId(HEADER)).toBeOnTheScreen();

    const amountHeader = await findByTestId(AMOUNT_HEADER);
    expect(
      within(amountHeader).getByTestId(AMOUNT_AVATAR_SINGLE),
    ).toBeOnTheScreen();
    expect(within(amountHeader).getByText(/^-.*ETH/)).toBeOnTheScreen();
    expect(findAmountTextColor(UNSAFE_getAllByType, /^-.*ETH/)).toBe(
      TextColor.TextDefault,
    );

    expect(await findByTestId(STATUS_PILL)).toHaveTextContent(
      strings('transaction.confirmed'),
    );

    const expectedDate = formatTimestampToDateTime(stakeTransaction.time);
    expect(getByTestId(DATE_ROW)).toHaveTextContent(expectedDate as string, {
      exact: false,
    });

    const accountRow = getByTestId(ACCOUNT_ROW);
    expect(accountRow).toHaveTextContent('Group 1', { exact: false });
    expect(accountRow).toHaveTextContent(
      renderShortAddress(ACTIVITY_CV_ACCOUNT),
      { exact: false },
    );

    expect(getByTestId(NETWORK_ROW)).toHaveTextContent(
      'Ethereum Main Network',
      { exact: false },
    );

    expect(getByTestId(TRANSACTION_ID_ROW)).toHaveTextContent(
      renderShortAddress(stakeTransaction.hash as string),
      { exact: false },
    );
    await act(async () => {
      fireEvent.press(getByTestId(TRANSACTION_ID_COPY));
    });

    await waitFor(() => {
      expect(getByTestId(FEE_ROW)).toHaveTextContent(/\$/);
    });
    expect(
      within(getByTestId(FEE_ROW)).getByTestId(FEE_TOKEN_AVATAR),
    ).toBeOnTheScreen();
    expect(within(getByTestId(FEE_ROW)).getByText('ETH')).toBeOnTheScreen();
    expect(getByTestId(TOTAL_ROW)).toHaveTextContent(/\$/);

    expect(queryByTestId(DO_IT_AGAIN_BUTTON)).toBeNull();

    const blockExplorer = getByTestId(BLOCK_EXPLORER_BUTTON);
    expect(blockExplorer).toHaveTextContent(
      strings('activity_details.view_on_block_explorer'),
    );
    fireEvent.press(blockExplorer);
  });
});

/**
 * Details resolves local txs from TransactionController. Keep EVM networks
 * disabled so useTransactionsQuery does not hit the Accounts API.
 */
const disableEvmNetworkFetch = {
  engine: {
    backgroundState: {
      NetworkEnablementController: {
        enabledNetworkMap: {
          eip155: {},
          solana: {},
        },
      },
    },
  },
} as const;

describeForPlatforms(
  'ActivityDetails — Core UX swap / Solana regressions',
  () => {
    it('shows Swapped title, dual amounts, and Confirmed status for a local swap', async () => {
      const swapTransaction = buildConfirmedLocalCrossChainSwapTransaction();
      const state = initialStateActivityWithLocalTransactions([swapTransaction])
        .withOverrides({
          engine: {
            backgroundState: {
              BridgeStatusController: {
                txHistory: {
                  [swapTransaction.id]:
                    activityCvCrossChainSwapBridgeHistoryEntry,
                },
              },
              ...disableEvmNetworkFetch.engine.backgroundState,
            },
          },
        } as never)
        .build();

      const { findByTestId, queryByText } = renderActivityDetailsView({
        state,
        params: {
          chainId: MAINNET_CAIP,
          txIdentifier: swapTransaction.id,
        },
      });

      expect(
        await findByTestId(ActivityDetailsSelectorsIDs.SCREEN),
      ).toBeOnTheScreen();

      const header = await findByTestId(ActivityDetailsSelectorsIDs.HEADER);
      expect(within(header).getByText('Swapped')).toBeOnTheScreen();
      expect(
        queryByText(strings('transactions.smart_contract_interaction')),
      ).toBeNull();

      const amountHeader = await findByTestId(
        ActivityDetailsSelectorsIDs.AMOUNT_HEADER,
      );
      expect(
        within(amountHeader).getByText(strings('activity_details.you_sent')),
      ).toBeOnTheScreen();
      expect(
        within(amountHeader).getByText(
          strings('activity_details.you_received'),
        ),
      ).toBeOnTheScreen();
      expect(within(amountHeader).getByText(/ETH/)).toBeOnTheScreen();
      expect(within(amountHeader).getByText(/USDC/)).toBeOnTheScreen();

      expect(
        await findByTestId(ActivityDetailsSelectorsIDs.STATUS_PILL),
      ).toHaveTextContent(strings('transaction.confirmed'));
    });

    it('shows Pending status for a submitted local swap', async () => {
      const swapTransaction = buildPendingLocalCrossChainSwapTransaction();
      const state = initialStateActivityWithLocalTransactions([swapTransaction])
        .withOverrides({
          engine: {
            backgroundState: {
              BridgeStatusController: {
                txHistory: {
                  [swapTransaction.id]:
                    activityCvPendingCrossChainSwapBridgeHistoryEntry,
                },
              },
              ...disableEvmNetworkFetch.engine.backgroundState,
            },
          },
        } as never)
        .build();

      const { findByTestId } = renderActivityDetailsView({
        state,
        params: {
          chainId: MAINNET_CAIP,
          txIdentifier: swapTransaction.id,
        },
      });

      expect(
        await findByTestId(ActivityDetailsSelectorsIDs.STATUS_PILL),
      ).toHaveTextContent(strings('transaction.pending'));
    });

    it('shows Solana send amount and fiat total from multichain asset rates', async () => {
      const state = initialStateActivity()
        .withOverrides(activityCvSolanaSendStateOverrides)
        .build();

      const { findByTestId } = renderActivityDetailsView({
        state,
        params: {
          chainId: ACTIVITY_CV_SOLANA_CHAIN_ID,
          txIdentifier: ACTIVITY_CV_SOLANA_SEND_ID,
        },
      });

      expect(
        await findByTestId(ActivityDetailsSelectorsIDs.SCREEN),
      ).toBeOnTheScreen();

      const amountHeader = await findByTestId(
        ActivityDetailsSelectorsIDs.AMOUNT_HEADER,
      );
      expect(within(amountHeader).getByText(/SOL/)).toBeOnTheScreen();

      const totalRow = await findByTestId(
        ActivityDetailsSelectorsIDs.TOTAL_ROW,
      );
      // 2 SOL * multichain rate 4 → $8.00 (formatCurrencyWithMinThreshold)
      // The row renders before the rate resolves, so poll for the converted value.
      await waitFor(() =>
        expect(within(totalRow).getByText('$8.00')).toBeOnTheScreen(),
      );

      expect(
        await findByTestId(ActivityDetailsSelectorsIDs.STATUS_PILL),
      ).toHaveTextContent(strings('transaction.confirmed'));
    });
  },
);

describeForPlatforms('ActivityDetails — Solana swap', () => {
  it('shows confirmed Swapped SOL → USDC with fee, explorer, and Swap again', async () => {
    const state = initialStateActivity()
      .withOverrides(activityCvSolanaSwapStateOverrides)
      .build();

    const { findByTestId, findByText, getByTestId, UNSAFE_getAllByType } =
      renderActivityDetailsView({
        state,
        params: {
          chainId: ACTIVITY_CV_SOLANA_CHAIN_ID,
          txIdentifier: ACTIVITY_CV_SOLANA_SWAP_ID,
        },
      });

    expect(await findByTestId(SCREEN)).toBeOnTheScreen();
    expect(await findByText('Swapped')).toBeOnTheScreen();

    const amountHeader = await findByTestId(AMOUNT_HEADER);
    expect(
      within(amountHeader).getByText(strings('activity_details.you_sent')),
    ).toBeOnTheScreen();
    expect(
      within(amountHeader).getByText(strings('activity_details.you_received')),
    ).toBeOnTheScreen();
    expect(within(amountHeader).getByText(/^-.*SOL/)).toBeOnTheScreen();
    expect(within(amountHeader).getByText(/^\+.*USDC/)).toBeOnTheScreen();
    expect(findAmountTextColor(UNSAFE_getAllByType, /^\+.*USDC/)).toBe(
      TextColor.SuccessDefault,
    );

    expect(await findByTestId(STATUS_PILL)).toHaveTextContent(
      strings('transaction.confirmed'),
    );

    const expectedDate = formatTimestampToDateTime(1_716_367_796_000);
    expect(getByTestId(DATE_ROW)).toHaveTextContent(expectedDate as string, {
      exact: false,
    });

    const accountRow = getByTestId(ACCOUNT_ROW);
    expect(accountRow).toHaveTextContent('AccountGroup 1', {
      exact: false,
    });
    expect(accountRow).toHaveTextContent(
      renderShortAddress(ACTIVITY_CV_SOLANA_ADDRESS),
      { exact: false },
    );

    expect(getByTestId(NETWORK_ROW)).toHaveTextContent('Solana', {
      exact: false,
    });

    expect(getByTestId(TRANSACTION_ID_ROW)).toHaveTextContent('activit', {
      exact: false,
    });
    expect(getByTestId(TRANSACTION_ID_ROW)).toHaveTextContent('-swap', {
      exact: false,
    });
    await act(async () => {
      fireEvent.press(getByTestId(TRANSACTION_ID_COPY));
    });

    expect(await findByTestId(FEE_ROW)).toHaveTextContent('0.01', {
      exact: false,
    });
    expect(within(getByTestId(FEE_ROW)).getByText('SOL')).toBeOnTheScreen();
    // 1 SOL × multichain rate 4; Solana base fees stay token-denominated.
    // The row renders before the rate resolves, so poll for the converted value.
    await waitFor(() =>
      expect(getByTestId(TOTAL_ROW)).toHaveTextContent('$4.00', {
        exact: false,
      }),
    );

    expect(getByTestId(BLOCK_EXPLORER_BUTTON)).toHaveTextContent(
      strings('activity_details.view_on_block_explorer'),
    );

    const swapAgain = getByTestId(DO_IT_AGAIN_BUTTON);
    expect(swapAgain).toHaveTextContent(strings('activity_details.swap_again'));
    fireEvent.press(swapAgain);
  });
});
