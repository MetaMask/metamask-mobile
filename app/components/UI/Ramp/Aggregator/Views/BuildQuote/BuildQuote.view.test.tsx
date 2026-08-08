import '../../../../../../../tests/component-view/mocks';
import React from 'react';
import {
  fireEvent,
  waitFor,
  type RenderAPI,
} from '@testing-library/react-native';
import { RampType } from '../../types';
import {
  renderBuildQuoteView,
  renderBuildQuoteWithRoutes,
  TRANSACTIONS_VIEW_PLACEHOLDER_TEXT,
} from '../../../../../../../tests/component-view/renderers/ramps';
import {
  setupRampSdkApiMock,
  clearRampSdkApiMocks,
} from '../../../../../../../tests/component-view/api-mocking/ramp';
import { selectTokenSelectors } from '../../components/TokenSelectModal/SelectToken.testIds';
import { BuildQuoteSelectors } from './BuildQuote.testIds';
import { NavbarSelectorsIDs } from '../../../../Navbar/Navbar.testIds';
import {
  RAMPS_FRANCE_REGION,
  RAMPS_SDK_LIMITS,
} from '../../../../../../../tests/component-view/presets/ramps';
import { MULTICHAIN_TEST_ACCOUNTS } from '../../../../../../../tests/component-view/presets/multichainAccounts';
import Routes from '../../../../../../constants/navigation/Routes';

const ETH_MAINNET_ASSET_ID = 'eip155:1/slip44:60';

async function waitForBuildQuoteReady({
  getByText,
  queryByText,
}: Pick<RenderAPI, 'getByText' | 'queryByText'>) {
  await waitFor(
    () => {
      expect(queryByText('Oops, something went wrong')).not.toBeOnTheScreen();
      expect(getByText('Ethereum')).toBeOnTheScreen();
    },
    { timeout: 10000 },
  );
}

async function selectTokenInOpenModal(
  renderApi: Pick<RenderAPI, 'findByTestId' | 'queryByTestId' | 'getAllByText'>,
  searchQuery: string | undefined,
  tokenLabel: string,
) {
  const { findByTestId, queryByTestId, getAllByText } = renderApi;

  expect(
    await findByTestId(selectTokenSelectors.TOKEN_SELECT_MODAL_SEARCH_INPUT),
  ).toBeOnTheScreen();

  await waitFor(() => {
    expect(getAllByText(tokenLabel).length).toBeGreaterThan(0);
  });

  if (searchQuery) {
    fireEvent.changeText(
      await findByTestId(selectTokenSelectors.TOKEN_SELECT_MODAL_SEARCH_INPUT),
      searchQuery,
    );
    await waitFor(() => {
      expect(getAllByText(tokenLabel).length).toBeGreaterThan(0);
    });
  }

  fireEvent.press(getAllByText(tokenLabel)[0]);

  await waitFor(() => {
    expect(
      queryByTestId(selectTokenSelectors.TOKEN_SELECT_MODAL_SEARCH_INPUT),
    ).not.toBeOnTheScreen();
  });
}

async function selectTokenViaSearch(
  renderApi: Pick<
    RenderAPI,
    'findByText' | 'findByTestId' | 'queryByTestId' | 'getAllByText'
  >,
  searchQuery: string | undefined,
  tokenLabel: string,
) {
  const { findByText } = renderApi;

  fireEvent.press(await findByText('Ethereum'));
  await selectTokenInOpenModal(renderApi, searchQuery, tokenLabel);
}

async function enterSellAmountViaKeypad(
  renderApi: Pick<RenderAPI, 'findByRole' | 'findByTestId' | 'getByTestId'>,
  amount: string,
  tokenSymbol: string,
) {
  const { findByRole, findByTestId } = renderApi;

  fireEvent.press(await findByTestId(BuildQuoteSelectors.AMOUNT_INPUT));

  for (const digit of amount) {
    fireEvent.press(await findByRole('button', { name: digit }));
  }

  expect(
    await findByRole('button', { name: `${amount} ${tokenSymbol}` }),
  ).toBeOnTheScreen();
}

async function clearSellAmountViaKeypad(
  renderApi: Pick<RenderAPI, 'getByTestId'>,
  deletePresses: number,
) {
  const { getByTestId } = renderApi;
  const deleteButton = getByTestId(BuildQuoteSelectors.KEYPAD_DELETE_BUTTON);

  for (let i = 0; i < deletePresses; i += 1) {
    fireEvent.press(deleteButton);
  }
}

describe('Aggregator BuildQuote', () => {
  beforeEach(() => {
    setupRampSdkApiMock();
  });

  afterEach(() => {
    clearRampSdkApiMocks();
    jest.restoreAllMocks();
  });

  describe('sell mode', () => {
    it('initializes sell amount from deeplink intent params', async () => {
      const { findByText } = renderBuildQuoteView({
        rampType: RampType.SELL,
        initialParams: { amount: '50', assetId: ETH_MAINNET_ASSET_ID },
      });

      expect(await findByText('50 ETH')).toBeOnTheScreen();
    });

    it('selects mUSD, shows France defaults, enforces sell limits, then accepts a valid amount', async () => {
      const renderApi = renderBuildQuoteWithRoutes({
        rampType: RampType.SELL,
        useFranceSellFixture: true,
      });
      const {
        findByText,
        getByText,
        queryByText,
        findByTestId,
        queryByTestId,
        findByRole,
        getByTestId,
        getAllByText,
      } = renderApi;

      await waitForBuildQuoteReady({ getByText, queryByText });

      expect(await findByText(RAMPS_FRANCE_REGION.emoji)).toBeOnTheScreen();
      expect(await findByText('EUR')).toBeOnTheScreen();
      expect(await findByText('Apple Pay')).toBeOnTheScreen();

      expect(await findByText(/current balance/i)).toBeOnTheScreen();

      await selectTokenViaSearch(
        { findByText, findByTestId, queryByTestId, getAllByText },
        'mUSD',
        'mUSD',
      );

      expect(await findByText('0 mUSD')).toBeOnTheScreen();
      expect(await findByText(RAMPS_FRANCE_REGION.emoji)).toBeOnTheScreen();

      const overMaxAmount = String(RAMPS_SDK_LIMITS.maxAmount + 1);
      await enterSellAmountViaKeypad(
        { findByRole, findByTestId, getByTestId },
        overMaxAmount,
        'mUSD',
      );

      expect(
        await findByTestId(BuildQuoteSelectors.MAX_LIMIT_ERROR),
      ).toBeOnTheScreen();
      expect(
        await findByText('Enter a smaller amount to continue'),
      ).toBeOnTheScreen();

      await clearSellAmountViaKeypad({ getByTestId }, overMaxAmount.length + 1);

      await waitFor(() => {
        expect(
          queryByTestId(BuildQuoteSelectors.MAX_LIMIT_ERROR),
        ).not.toBeOnTheScreen();
      });

      await enterSellAmountViaKeypad(
        { findByRole, findByTestId, getByTestId },
        '60',
        'mUSD',
      );

      await waitFor(() => {
        expect(
          queryByTestId(BuildQuoteSelectors.MIN_LIMIT_ERROR),
        ).not.toBeOnTheScreen();
      });
      expect(await findByRole('button', { name: '60 mUSD' })).toBeOnTheScreen();
    });

    it('switches accounts on the sell BuildQuote screen', async () => {
      const renderApi = renderBuildQuoteWithRoutes({
        rampType: RampType.SELL,
        useFranceSellFixture: true,
        includeAccountSelector: true,
      });
      const { findByText, getByText, queryByText, getByTestId } = renderApi;

      await waitForBuildQuoteReady({ getByText, queryByText });

      expect(
        await findByText(MULTICHAIN_TEST_ACCOUNTS.account1.name),
      ).toBeOnTheScreen();

      fireEvent.press(getByTestId(BuildQuoteSelectors.ACCOUNT_PICKER));

      expect(
        await findByText(MULTICHAIN_TEST_ACCOUNTS.activityAccount.name),
      ).toBeOnTheScreen();

      fireEvent.press(
        await findByText(MULTICHAIN_TEST_ACCOUNTS.activityAccount.name),
      );

      await waitFor(() => {
        expect(
          queryByText(MULTICHAIN_TEST_ACCOUNTS.activityAccount.name),
        ).toBeOnTheScreen();
        expect(
          queryByText(MULTICHAIN_TEST_ACCOUNTS.account1.name),
        ).not.toBeOnTheScreen();
      });
      expect(await findByText('You want to sell')).toBeOnTheScreen();
    });

    it('shows insufficient balance error when sell amount exceeds ETH balance', async () => {
      const renderApi = renderBuildQuoteWithRoutes({
        rampType: RampType.SELL,
        useFranceSellFixture: true,
      });
      const {
        findByText,
        getByText,
        queryByText,
        findByTestId,
        findByRole,
        getByTestId,
      } = renderApi;

      await waitForBuildQuoteReady({ getByText, queryByText });

      // France fixture has 100 ETH. Enter amount exceeding it.
      await enterSellAmountViaKeypad(
        { findByRole, findByTestId, getByTestId },
        '101',
        'ETH',
      );

      // Wait for the insufficient balance error to appear — amountBNMinimalUnit
      // recomputation is async after keypad state updates propagate.
      expect(
        await findByTestId(
          BuildQuoteSelectors.INSUFFICIENT_BALANCE_ERROR,
          {},
          { timeout: 5000 },
        ),
      ).toBeOnTheScreen();
    });

    it('navigates to Quotes screen when "Get quotes" is pressed with a valid sell amount', async () => {
      const renderApi = renderBuildQuoteWithRoutes({
        rampType: RampType.SELL,
        useFranceSellFixture: true,
        includeQuotesRoute: true,
      });
      const {
        findByText,
        findByRole,
        getByText,
        queryByText,
        findByTestId,
        getByTestId,
      } = renderApi;

      await waitForBuildQuoteReady({ getByText, queryByText });

      // Wait for all SDK data to load (fiat, payment, limits)
      await findByText('EUR');
      await findByText('Apple Pay');

      await enterSellAmountViaKeypad(
        { findByRole, findByTestId, getByTestId },
        '50',
        'ETH',
      );

      // Wait for "Get quotes" button to become enabled (isFetching=false)
      const getQuotesButton = await findByRole('button', {
        name: 'Get quotes',
      });
      await waitFor(() => {
        expect(getQuotesButton).not.toBeDisabled();
      });

      fireEvent.press(getQuotesButton);

      await findByTestId(`route-${Routes.RAMP.QUOTES}`, {}, { timeout: 5000 });
    });

    it('changes fiat currency from EUR to USD in sell mode', async () => {
      const renderApi = renderBuildQuoteWithRoutes({
        rampType: RampType.SELL,
        useFranceSellFixture: true,
      });
      const { findByText, getByText, queryByText } = renderApi;

      await waitForBuildQuoteReady({ getByText, queryByText });

      expect(await findByText('EUR')).toBeOnTheScreen();

      fireEvent.press(await findByText('EUR'));
      fireEvent.press(await findByText('US Dollar'));

      await waitFor(() => {
        expect(queryByText('EUR')).not.toBeOnTheScreen();
      });
      expect(await findByText('USD')).toBeOnTheScreen();
    });

    it('changes region from France to Spain in sell mode', async () => {
      const renderApi = renderBuildQuoteWithRoutes({
        rampType: RampType.SELL,
        useFranceSellFixture: true,
      });
      const { findByText, getByText, queryByText, getByTestId } = renderApi;

      await waitForBuildQuoteReady({ getByText, queryByText });

      expect(await findByText(RAMPS_FRANCE_REGION.emoji)).toBeOnTheScreen();

      fireEvent.press(getByTestId(BuildQuoteSelectors.REGION_DROPDOWN));
      fireEvent.press(await findByText('Spain'));

      await waitFor(() => {
        expect(queryByText(RAMPS_FRANCE_REGION.emoji)).not.toBeOnTheScreen();
      });
      expect(await findByText('🇪🇸')).toBeOnTheScreen();
    });

    it('fills 50% of balance via quick percentage pill for mUSD', async () => {
      const renderApi = renderBuildQuoteWithRoutes({
        rampType: RampType.SELL,
        useFranceSellFixture: true,
      });
      const {
        findByText,
        getByText,
        queryByText,
        findByTestId,
        queryByTestId,
        getAllByText,
      } = renderApi;

      await waitForBuildQuoteReady({ getByText, queryByText });

      // Switch to mUSD — quick amounts only show for ERC-20 tokens
      // (native ETH requires gas estimation for maxSellAmount)
      await selectTokenViaSearch(
        { findByText, findByTestId, queryByTestId, getAllByText },
        'mUSD',
        'mUSD',
      );

      // Open keypad so quick amounts are visible
      fireEvent.press(await findByTestId(BuildQuoteSelectors.AMOUNT_INPUT));

      fireEvent.press(await findByText('50%'));

      // After pressing 50%, the amount should no longer be "0 mUSD"
      await waitFor(() => {
        expect(queryByText('0 mUSD')).not.toBeOnTheScreen();
      });
    });

    it('resets sell amount to zero when switching token', async () => {
      const renderApi = renderBuildQuoteWithRoutes({
        rampType: RampType.SELL,
        useFranceSellFixture: true,
      });
      const {
        findByText,
        getByText,
        queryByText,
        findByRole,
        findByTestId,
        queryByTestId,
        getByTestId,
        getAllByText,
      } = renderApi;

      await waitForBuildQuoteReady({ getByText, queryByText });

      // Enter 60 ETH
      await enterSellAmountViaKeypad(
        { findByRole, findByTestId, getByTestId },
        '60',
        'ETH',
      );

      // Switch to mUSD
      await selectTokenViaSearch(
        { findByText, findByTestId, queryByTestId, getAllByText },
        'mUSD',
        'mUSD',
      );

      // Amount should reset to 0
      expect(await findByText('0 mUSD')).toBeOnTheScreen();
    });

    it('changes payment method via "Send cash to" selector in sell mode', async () => {
      const renderApi = renderBuildQuoteWithRoutes({
        rampType: RampType.SELL,
        useFranceSellFixture: true,
      });
      const { findByText, getByText, queryByText } = renderApi;

      await waitForBuildQuoteReady({ getByText, queryByText });

      // Sell mode shows "Send cash to" label (not "Update payment method")
      fireEvent.press(await findByText('Apple Pay'));
      fireEvent.press(await findByText('SEPA Bank Transfer'));

      await waitFor(() => {
        expect(queryByText('Apple Pay')).not.toBeOnTheScreen();
      });
      expect(await findByText('SEPA Bank Transfer')).toBeOnTheScreen();
    });

    it('shows min limit error when sell amount is below minimum', async () => {
      const renderApi = renderBuildQuoteWithRoutes({
        rampType: RampType.SELL,
        useFranceSellFixture: true,
      });
      const {
        findByText,
        getByText,
        queryByText,
        findByRole,
        findByTestId,
        getByTestId,
      } = renderApi;

      await waitForBuildQuoteReady({ getByText, queryByText });

      // SDK limits minAmount is 10. Enter 5 which is below.
      await enterSellAmountViaKeypad(
        { findByRole, findByTestId, getByTestId },
        '5',
        'ETH',
      );

      expect(
        await findByTestId(
          BuildQuoteSelectors.MIN_LIMIT_ERROR,
          {},
          { timeout: 5000 },
        ),
      ).toBeOnTheScreen();
    });
  });

  describe('buy mode (Aggregator / V1)', () => {
    it('changes the selected payment method from Apple Pay to Debit or Credit', async () => {
      const { findByText, queryByText } = renderBuildQuoteWithRoutes({
        rampType: RampType.BUY,
      });

      fireEvent.press(await findByText('Apple Pay'));
      fireEvent.press(await findByText('Debit or Credit'));

      await waitFor(() => {
        expect(queryByText('Apple Pay')).not.toBeOnTheScreen();
      });
      expect(await findByText('Debit or Credit')).toBeOnTheScreen();
    });

    it('navigates from settings cog to TransactionsView order history', async () => {
      const renderApi = renderBuildQuoteWithRoutes({
        rampType: RampType.BUY,
        includeBuySettingsAndTransactionsRoutes: true,
      });
      const { findByText, findByTestId } = renderApi;

      await findByText('Ethereum');

      fireEvent.press(
        await findByTestId(NavbarSelectorsIDs.DEPOSIT_CONFIGURATION_BUTTON),
      );

      expect(await findByText('View order history')).toBeOnTheScreen();

      fireEvent.press(await findByText('View order history'));

      expect(
        await findByText(
          new RegExp(
            `${TRANSACTIONS_VIEW_PLACEHOLDER_TEXT} redirectToOrders=true`,
          ),
        ),
      ).toBeOnTheScreen();
    });

    it('changes the selected token from Ethereum to Dai Stablecoin', async () => {
      const { findByText, findByTestId, queryByTestId, getAllByText } =
        renderBuildQuoteWithRoutes({
          rampType: RampType.BUY,
        });

      await selectTokenViaSearch(
        { findByText, findByTestId, queryByTestId, getAllByText },
        'DAI',
        'Dai Stablecoin',
      );

      expect(await findByText('Dai Stablecoin')).toBeOnTheScreen();
    });
  });
});
