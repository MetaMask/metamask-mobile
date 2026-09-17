import '../../../../../../tests/component-view/mocks';
import { userEvent, within } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import { renderShortAddress } from '../../../../../util/address';
import { formatTimestampToDateTime } from '../../../../../util/date';
import {
  clearRecurringOrdersDataServiceMock,
  setupRecurringOrdersDataServiceMock,
} from '../../../../../../tests/component-view/api-mocking/recurringOrders';
import { describeForPlatforms } from '../../../../../../tests/component-view/platform';
import { renderRecurringOrderDetailsView } from '../../../../../../tests/component-view/renderers/bridge';
import {
  MOCK_RECURRING_OPEN_ORDER,
  MOCK_RECURRING_WALLET_ADDRESS,
} from '../../api/recurringOrders.mock';
import type { RecurringSwap } from '../../api/recurringOrders.types';
import { MOCK_RECURRING_OPEN_ORDER_SWAPS } from '../../api/recurringSwaps.mock';
import { RecurringOrderDetailsViewSelectorsIDs } from '../RecurringOrderDetailsView';
import { RecurringSwapDetailsViewSelectorsIDs } from './RecurringSwapDetailsView.testIds';

const BLOCK_EXPLORER_BUTTON_LABEL = strings(
  'activity_details.view_on_block_explorer',
);

function getRequiredTxHash(swap: RecurringSwap): string {
  if (!swap.txHash) {
    throw new Error(`Expected swap ${swap.swapId} to have a transaction hash`);
  }

  return swap.txHash;
}

async function openSwapDetails(swapIndex: number) {
  const renderResult = renderRecurringOrderDetailsView({
    order: MOCK_RECURRING_OPEN_ORDER,
  });
  await userEvent.press(
    renderResult.getByTestId(
      RecurringOrderDetailsViewSelectorsIDs.TEST_ENTRY_BUTTON,
    ),
  );
  const swap = MOCK_RECURRING_OPEN_ORDER_SWAPS[swapIndex];

  await userEvent.press(
    await renderResult.findByTestId(
      RecurringOrderDetailsViewSelectorsIDs.HISTORY_ROW(swap.swapId),
    ),
  );
  await renderResult.findByTestId(RecurringSwapDetailsViewSelectorsIDs.SCREEN);

  return { renderResult, swap };
}

describeForPlatforms('RecurringSwapDetailsView', () => {
  beforeEach(() => {
    setupRecurringOrdersDataServiceMock();
  });

  afterEach(() => {
    clearRecurringOrdersDataServiceMock();
  });

  it('shows filled swap details and returns to the order', async () => {
    const { renderResult, swap } = await openSwapDetails(0);
    const expectedDate = formatTimestampToDateTime(
      Date.parse(swap.executedAt ?? swap.scheduledAt),
    );
    if (!expectedDate) {
      throw new Error(`Expected swap ${swap.swapId} to have a valid date`);
    }

    expect(
      renderResult.getByText(
        strings('bridge.recurring.swap_details_title', {
          source: 'ETH',
          dest: 'USDC',
        }),
      ),
    ).toBeOnTheScreen();
    expect(
      renderResult.getByText(strings('activity_details.you_sent')),
    ).toBeOnTheScreen();
    expect(renderResult.getByText('-0.0015 ETH')).toBeOnTheScreen();
    expect(
      renderResult.getByText(strings('activity_details.you_received')),
    ).toBeOnTheScreen();
    expect(renderResult.getByText('+3 USDC')).toBeOnTheScreen();
    expect(
      within(
        renderResult.getByTestId(
          RecurringSwapDetailsViewSelectorsIDs.STATUS_ROW,
        ),
      ).getByText(strings('transaction.confirmed')),
    ).toBeOnTheScreen();
    expect(
      renderResult.getByTestId(RecurringSwapDetailsViewSelectorsIDs.DATE_ROW),
    ).toHaveTextContent(expectedDate, { exact: false });
    expect(
      renderResult.getByTestId(
        RecurringSwapDetailsViewSelectorsIDs.ACCOUNT_ROW,
      ),
    ).toHaveTextContent(renderShortAddress(MOCK_RECURRING_WALLET_ADDRESS), {
      exact: false,
    });
    expect(
      renderResult.getByTestId(
        RecurringSwapDetailsViewSelectorsIDs.NETWORK_ROW,
      ),
    ).toHaveTextContent('Ethereum Main Network', { exact: false });
    expect(
      renderResult.getByTestId(
        RecurringSwapDetailsViewSelectorsIDs.TRANSACTION_ID_ROW,
      ),
    ).toHaveTextContent(renderShortAddress(getRequiredTxHash(swap)), {
      exact: false,
    });
    expect(
      renderResult.getByText(BLOCK_EXPLORER_BUTTON_LABEL),
    ).toBeOnTheScreen();

    await userEvent.press(
      renderResult.getByTestId(
        RecurringSwapDetailsViewSelectorsIDs.BACK_BUTTON,
      ),
    );

    expect(
      await renderResult.findByTestId(
        RecurringOrderDetailsViewSelectorsIDs.SCREEN,
      ),
    ).toBeOnTheScreen();
  });

  it('shows failed on-chain swap details', async () => {
    const { renderResult, swap } = await openSwapDetails(4);

    expect(
      within(
        renderResult.getByTestId(
          RecurringSwapDetailsViewSelectorsIDs.STATUS_ROW,
        ),
      ).getByText(strings('transaction.failed')),
    ).toBeOnTheScreen();
    expect(
      renderResult.getByTestId(
        RecurringSwapDetailsViewSelectorsIDs.TRANSACTION_ID_ROW,
      ),
    ).toHaveTextContent(renderShortAddress(getRequiredTxHash(swap)), {
      exact: false,
    });
    expect(
      renderResult.getByText(BLOCK_EXPLORER_BUTTON_LABEL),
    ).toBeOnTheScreen();
  });

  it('shows skipped attempt details without transaction-only content', async () => {
    const { renderResult } = await openSwapDetails(2);

    expect(
      within(
        renderResult.getByTestId(
          RecurringSwapDetailsViewSelectorsIDs.STATUS_ROW,
        ),
      ).getByText(strings('bridge.recurring.skipped')),
    ).toBeOnTheScreen();
    expect(
      within(
        renderResult.getByTestId(
          RecurringSwapDetailsViewSelectorsIDs.REASON_ROW,
        ),
      ).getByText(strings('bridge.recurring.not_enough_gas')),
    ).toBeOnTheScreen();
    expect(renderResult.getByText('-0 ETH')).toBeOnTheScreen();
    expect(renderResult.getByText('+0 USDC')).toBeOnTheScreen();
    expect(
      renderResult.queryByTestId(
        RecurringSwapDetailsViewSelectorsIDs.TRANSACTION_ID_ROW,
      ),
    ).not.toBeOnTheScreen();
    expect(
      renderResult.queryByTestId(
        RecurringSwapDetailsViewSelectorsIDs.FEES_AND_TOTAL,
      ),
    ).not.toBeOnTheScreen();
    expect(
      renderResult.queryByText(BLOCK_EXPLORER_BUTTON_LABEL),
    ).not.toBeOnTheScreen();
  });

  it('opens an on-chain swap in the block explorer', async () => {
    const { renderResult } = await openSwapDetails(0);

    await userEvent.press(
      renderResult.getByText(BLOCK_EXPLORER_BUTTON_LABEL),
    );

    expect(
      await renderResult.findByTestId(`route-${Routes.WEBVIEW.MAIN}-params`),
    ).toHaveTextContent(getRequiredTxHash(MOCK_RECURRING_OPEN_ORDER_SWAPS[0]), {
      exact: false,
    });
  });
});
