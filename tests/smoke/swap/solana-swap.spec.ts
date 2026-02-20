import { SmokeTrade } from '../../tags';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { loginToApp } from '../../flows/wallet.flow';
import WalletView from '../../page-objects/wallet/WalletView';
import TokenOverview from '../../page-objects/wallet/TokenOverview';
import QuoteView from '../../page-objects/swaps/QuoteView';
import ActivitiesView from '../../page-objects/Transactions/ActivitiesView';
import Assertions from '../../framework/Assertions';
import enContent from '../../../locales/languages/en.json';
import { buildSolanaSwapTestSpecificMock } from '../../helpers/swap/solana-swap-mocks';

const SOLANA_NETWORK_NAME = 'Solana';
const SOL_SYMBOL = 'SOL';
const USDC_SYMBOL = 'USDC';

const openSwapFromSolanaToken = async (): Promise<void> => {
  await WalletView.waitForTokenToBeReady(SOLANA_NETWORK_NAME);
  await WalletView.tapOnToken(SOLANA_NETWORK_NAME);
  await TokenOverview.tapSwapButton();
  await Assertions.expectElementToBeVisible(QuoteView.sourceTokenArea, {
    timeout: 30000,
    description: 'Swap source token area should be visible',
  });
};

const setSourceAmount = async (amount: string): Promise<void> => {
  await QuoteView.tapSourceAmountInput();
  await QuoteView.enterAmount(amount);
  await QuoteView.dismissKeypad();
};

const selectSourceTokenOnSolana = async (symbol: string): Promise<void> => {
  await QuoteView.tapSourceToken();
  await QuoteView.selectNetwork(SOLANA_NETWORK_NAME);
  await QuoteView.selectToken(symbol, 0);
};

const selectDestinationTokenOnSolana = async (
  symbol: string,
): Promise<void> => {
  await QuoteView.tapDestinationToken();
  await QuoteView.selectNetwork(SOLANA_NETWORK_NAME);
  await QuoteView.selectToken(symbol, 0);
};

const submitSwapAndAssertActivity = async (
  sourceToken: string,
  destinationToken: string,
): Promise<void> => {
  await Assertions.expectElementToBeVisible(QuoteView.networkFeeLabel, {
    timeout: 60000,
    description: 'Network fee label should be visible',
  });
  await Assertions.expectElementToBeVisible(QuoteView.confirmSwap, {
    timeout: 30000,
    description: 'Swap confirmation button should be visible',
  });

  await QuoteView.tapConfirmSwap();

  await Assertions.expectElementToBeVisible(ActivitiesView.title, {
    timeout: 90000,
    description: 'Activity view should be visible after submitting swap',
  });
  await Assertions.expectElementToBeVisible(
    ActivitiesView.swapActivityTitle(sourceToken, destinationToken),
    {
      timeout: 90000,
      description: `Swap activity ${sourceToken} to ${destinationToken} should be visible`,
    },
  );
  await Assertions.expectElementToBeVisible(ActivitiesView.confirmedLabel, {
    timeout: 120000,
    description: 'Swap should become confirmed',
  });
};

describe(SmokeTrade('Swap on Solana'), () => {
  beforeEach(() => {
    jest.setTimeout(240000);
  });

  it('completes SOL to USDC swap with mocked Solana tx execution', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        testSpecificMock: buildSolanaSwapTestSpecificMock('sol-to-usdc'),
        restartDevice: true,
      },
      async () => {
        await loginToApp();
        await device.disableSynchronization();

        await openSwapFromSolanaToken();
        await selectDestinationTokenOnSolana(USDC_SYMBOL);
        await setSourceAmount('1');
        await submitSwapAndAssertActivity(SOL_SYMBOL, USDC_SYMBOL);
      },
    );
  });

  it('completes USDC to SOL swap with mocked Solana tx execution', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        testSpecificMock: buildSolanaSwapTestSpecificMock('usdc-to-sol'),
        restartDevice: true,
      },
      async () => {
        await loginToApp();
        await device.disableSynchronization();

        await openSwapFromSolanaToken();
        await selectSourceTokenOnSolana(USDC_SYMBOL);
        await selectDestinationTokenOnSolana(SOL_SYMBOL);
        await setSourceAmount('1');
        await submitSwapAndAssertActivity(USDC_SYMBOL, SOL_SYMBOL);
      },
    );
  });

  it('shows no route available when Solana swap has no quotes', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        testSpecificMock: buildSolanaSwapTestSpecificMock('no-quotes'),
        restartDevice: true,
      },
      async () => {
        await loginToApp();
        await device.disableSynchronization();

        await openSwapFromSolanaToken();
        await selectDestinationTokenOnSolana(USDC_SYMBOL);
        await setSourceAmount('1');

        await Assertions.expectTextDisplayed(
          enContent.bridge.error_banner_description,
          {
            timeout: 90000,
          },
        );
      },
    );
  });
});
