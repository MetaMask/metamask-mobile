import '../../../../../../../tests/component-view/mocks';
import React from 'react';
import BN from 'bnjs4';
import type { CryptoCurrency } from '@consensys/on-ramp-sdk';
import {
  fireEvent,
  waitFor,
  type RenderAPI,
} from '@testing-library/react-native';
// eslint-disable-next-line import-x/no-namespace
import * as useLimitsHook from '../../hooks/useLimits';
// eslint-disable-next-line import-x/no-namespace
import * as useCryptoCurrenciesHook from '../../hooks/useCryptoCurrencies';
// eslint-disable-next-line import-x/no-namespace
import * as useBalanceHook from '../../hooks/useBalance';

type UseBalanceReturn = ReturnType<typeof useBalanceHook.default>;
import { RampType } from '../../types';
import {
  renderBuildQuoteView,
  renderBuildQuoteWithRoutes,
  TRANSACTIONS_VIEW_PLACEHOLDER_TEXT,
} from '../../../../../../../tests/component-view/renderers/ramps';
import {
  setupRampSdkApiMock,
  clearRampSdkApiMocks,
  mockRampCountryCacheData,
} from '../../../../../../../tests/component-view/api-mocking/ramp';
import { selectTokenSelectors } from '../../components/TokenSelectModal/SelectToken.testIds';
import { useRampSDK } from '../../sdk';
import { BuildQuoteSelectors } from './BuildQuote.testIds';
import {
  RAMPS_FRANCE_REGION,
  RAMPS_SDK_LIMITS,
} from '../../../../../../../tests/component-view/presets/ramps';
import { MULTICHAIN_TEST_ACCOUNTS } from '../../../../../../../tests/component-view/presets/multichainAccounts';

const ETH_MAINNET_ASSET_ID = 'eip155:1/slip44:60';

function mockUseLimitsForSellQuote() {
  return {
    limits: {
      ...RAMPS_SDK_LIMITS,
      quickAmounts: [50, 100, 200],
      feeDynamicRate: 0,
      feeFixedRate: 0,
    },
    isFetching: false,
    isAmountBelowMinimum: (amount: number) =>
      Boolean(amount !== 0 && amount < RAMPS_SDK_LIMITS.minAmount),
    isAmountAboveMaximum: (amount: number) =>
      Boolean(amount !== 0 && amount > RAMPS_SDK_LIMITS.maxAmount),
    isAmountValid: (amount: number) =>
      amount >= RAMPS_SDK_LIMITS.minAmount &&
      amount <= RAMPS_SDK_LIMITS.maxAmount,
    queryGetLimits: jest.fn(),
  };
}

function mockUseCryptoCurrenciesForSellTokenList() {
  const { setSelectedAsset, selectedAsset } = useRampSDK();
  const cryptoCurrencies =
    mockRampCountryCacheData.cryptoCurrencies as unknown as CryptoCurrency[];

  React.useEffect(() => {
    if (!selectedAsset && cryptoCurrencies.length > 0) {
      const ethAsset =
        cryptoCurrencies.find((token) => token.symbol === 'ETH') ??
        cryptoCurrencies[0];
      setSelectedAsset(ethAsset);
    }
  }, [cryptoCurrencies, selectedAsset, setSelectedAsset]);

  return {
    cryptoCurrencies,
    errorCryptoCurrencies: null,
    isFetchingCryptoCurrencies: false,
    queryGetCryptoCurrencies: jest.fn(),
  };
}

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

function mockUseBalanceForHighMusdBalance(): UseBalanceReturn {
  const balanceBN = new BN('ffffffffffffffffffffffffffffffff', 16);
  return {
    balance: '999999',
    balanceFiat: undefined,
    balanceBN,
  };
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
      jest
        .spyOn(useCryptoCurrenciesHook, 'default')
        .mockImplementation(mockUseCryptoCurrenciesForSellTokenList);
      jest
        .spyOn(useLimitsHook, 'default')
        .mockImplementation(mockUseLimitsForSellQuote);
      jest
        .spyOn(useBalanceHook, 'default')
        .mockImplementation(mockUseBalanceForHighMusdBalance);

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

      fireEvent.press(await findByTestId('deposit-configuration-menu-button'));

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
