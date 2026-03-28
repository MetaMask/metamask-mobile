import { SmokeConfirmations } from '../../tags';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { Mockttp } from 'mockttp';
import { mockTronApis } from '../../api-mocking/mock-responses/tron-mocks';
import { createTronAccount, selectTronNetwork } from '../../flows/tron.flow';
import WalletView from '../../page-objects/wallet/WalletView';
import TronAccountView from '../../page-objects/Tron/TronAccountView';
import Matchers from '../../framework/Matchers';
import Assertions from '../../framework/Assertions';

jest.setTimeout(150_000);

describe(SmokeConfirmations('Tron Swap'), () => {
  it('gets a TRX to USDT swap quote', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().withTronFeatureFlags().build(),
        restartDevice: true,
        testSpecificMock: async (mockServer: Mockttp) => {
          await mockTronApis(mockServer);
        },
      },
      async () => {
        await createTronAccount();
        await selectTronNetwork();

        await WalletView.tapOnToken('TRX');
        await TronAccountView.tapSwapButton();

        const quoteText = Matchers.getElementByText('Quote');
        await Assertions.expectElementToBeVisible(quoteText);
      },
    );
  });

  it('displays no quotes available message', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().withTronFeatureFlags().build(),
        restartDevice: true,
        testSpecificMock: async (mockServer: Mockttp) => {
          await mockTronApis(mockServer);
          await mockServer
            .forGet(/\/swap\/quotes/)
            .thenJson(200, { quotes: [] });
        },
      },
      async () => {
        await createTronAccount();
        await selectTronNetwork();

        await WalletView.tapOnToken('TRX');
        await TronAccountView.tapSwapButton();

        const noQuotes = Matchers.getElementByText('No quotes available');
        await Assertions.expectElementToBeVisible(noQuotes);
      },
    );
  });
});
