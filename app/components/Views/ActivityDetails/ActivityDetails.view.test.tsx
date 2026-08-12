import '../../../../tests/component-view/mocks';
import { within } from '@testing-library/react-native';
import { describeForPlatforms } from '../../../../tests/component-view/platform';
import { renderActivityDetailsView } from '../../../../tests/component-view/renderers/activity';
import {
  ACTIVITY_CV_SOLANA_CHAIN_ID,
  ACTIVITY_CV_SOLANA_SEND_ID,
  activityCvCrossChainSwapBridgeHistoryEntry,
  activityCvPendingCrossChainSwapBridgeHistoryEntry,
  activityCvSolanaSendStateOverrides,
  buildConfirmedLocalCrossChainSwapTransaction,
  buildPendingLocalCrossChainSwapTransaction,
  initialStateActivity,
  initialStateActivityWithLocalTransactions,
} from '../../../../tests/component-view/presets/activity';
import { strings } from '../../../../locales/i18n';
import { ActivityDetailsSelectorsIDs } from './ActivityDetails.testIds';

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

describeForPlatforms('ActivityDetails', () => {
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
      initialParams: {
        chainId: 'eip155:1',
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
      within(amountHeader).getByText(strings('activity_details.you_received')),
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
      initialParams: {
        chainId: 'eip155:1',
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
      initialParams: {
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

    const totalRow = await findByTestId(ActivityDetailsSelectorsIDs.TOTAL_ROW);
    // 2 SOL * multichain rate 4 → 8 USD
    expect(within(totalRow).getByText('8 USD')).toBeOnTheScreen();

    expect(
      await findByTestId(ActivityDetailsSelectorsIDs.STATUS_PILL),
    ).toHaveTextContent(strings('transaction.confirmed'));
  });
});
