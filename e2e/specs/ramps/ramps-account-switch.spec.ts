'use strict';
import { loginToApp } from '../../viewHelper';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import WalletActionsBottomSheet from '../../pages/wallet/WalletActionsBottomSheet';
import FixtureBuilder from '../../fixtures/fixture-builder';
import TestHelpers from '../../helpers';
import Assertions from '../../framework/Assertions';
import BuyGetStartedView from '../../pages/Ramps/BuyGetStartedView';
import AccountListBottomSheet from '../../pages/wallet/AccountListBottomSheet';
import BuildQuoteView from '../../pages/Ramps/BuildQuoteView';
import { SmokeTrade } from '../../tags';
import { withFixtures } from '../../fixtures/fixture-helper';
import { startMockServer, stopMockServer } from '../../api-mocking/mock-server';
import { getRampsApiMocks } from '../../api-mocking/mock-responses/ramps-mocks';
import { Mockttp } from 'mockttp';
import { TestSpecificMock } from '../../framework';

// Define the region interface based on the fixture builder's expected type
interface RampsRegion {
  currencies: string[];
  emoji: string;
  id: string;
  name: string;
  support: {
    buy: boolean;
    sell: boolean;
    recurringBuy: boolean;
  };
  unsupported: boolean;
  recommended: boolean;
  detected: boolean;
}

// Define proper types for withFixtures options
interface WithFixturesOptions {
  fixture: object;
  dapp?: boolean;
  multichainDapp?: boolean;
  dappPath?: string;
  ganacheOptions?: object;
  languageAndLocale?: object;
  launchArgs?: object;
  restartDevice?: boolean;
  smartContract?: object;
  testSpecificMock?: object;
  disableGanache?: boolean;
  localNodeOptions?: object;
}

const franceRegion: RampsRegion = {
  currencies: ['/currencies/fiat/eur'],
  emoji: '🇫🇷',
  id: '/regions/fr',
  name: 'France',
  support: { buy: true, sell: true, recurringBuy: true },
  unsupported: false,
  recommended: false,
  detected: false,
};

// Anvil configuration for local blockchain node
const localNodeOptions = {
  hardfork: 'london',
  mnemonic:
    'drive manage close raven tape average sausage pledge riot furnace august tip',
  chainId: 1,
};

// Get ramps API mocks from the dedicated mock file
const rampsApiMocks = getRampsApiMocks() as unknown as TestSpecificMock;

let mockServer: Mockttp | null = null;
let mockServerPort: number;

const setupRampsAccountSwitchTest = async (
  testFunction: () => Promise<void>,
) => {
  await withFixtures(
    {
      fixture: new FixtureBuilder()
        .withImportedHdKeyringAndTwoDefaultAccountsOneImportedHdAccountKeyringController()
        // @ts-expect-error - FixtureBuilder method accepts region objects despite TypeScript signature
        .withRampsSelectedRegion(franceRegion)
        .build(),
      restartDevice: true,
      localNodeOptions,
      testSpecificMock: rampsApiMocks,
      launchArgs: {
        mockServerPort,
      },
    } as WithFixturesOptions,
    async () => {
      await loginToApp();
      await testFunction();
    },
  );
};

describe(SmokeTrade('Ramps with Account Switching'), () => {
  beforeAll(async () => {
    try {
      // Use a high port number to avoid conflicts
      const testPort = 9000 + Math.floor(Math.random() * 1000);
      mockServer = await startMockServer(rampsApiMocks, {
        port: testPort,
      });
      if (mockServer !== null) {
        mockServerPort = mockServer.port;
        console.log(`Mock server started on port ${mockServerPort}`);
      }
      await TestHelpers.reverseServerPort();
    } catch (error) {
      console.error('Failed to start mock server:', error);
      throw error;
    }
  });

  beforeEach(async () => {
    jest.setTimeout(150000);
  });

  afterAll(async () => {
    try {
      if (mockServer !== null) {
        await stopMockServer(mockServer);
        console.log('Mock server stopped successfully');
      }
    } catch (error) {
      console.error('Error stopping mock server:', error);
    }
  });

  it('should navigate to buy page and switch accounts', async () => {
    await setupRampsAccountSwitchTest(async () => {
      await TabBarComponent.tapActions();
      await WalletActionsBottomSheet.tapBuyButton();
      await BuyGetStartedView.tapGetStartedButton();
      await BuildQuoteView.tapAccountPicker();
      await AccountListBottomSheet.tapToSelectActiveAccountAtIndex(2);
      await Assertions.expectTextDisplayed('Account 3', {
        description:
          'Account 3 should be displayed after switching accounts in the ramps flow',
      });
      await Assertions.expectElementToBeVisible(
        BuildQuoteView.amountToBuyLabel,
      );
    });
  });

  it('should navigate to sell page and switch accounts', async () => {
    await setupRampsAccountSwitchTest(async () => {
      await TabBarComponent.tapActions();
      await WalletActionsBottomSheet.tapSellButton();
      await BuyGetStartedView.tapGetStartedButton();
      await BuildQuoteView.tapAccountPicker();
      await AccountListBottomSheet.tapToSelectActiveAccountAtIndex(2);
      await Assertions.expectTextDisplayed('Account 3', {
        description:
          'Account 3 should be displayed after switching accounts in the sell flow',
      });
      await Assertions.expectElementToBeVisible(
        BuildQuoteView.amountToSellLabel,
      );
    });
  });

  it('should maintain account selection across ramp flows', async () => {
    await setupRampsAccountSwitchTest(async () => {
      await TabBarComponent.tapActions();
      await WalletActionsBottomSheet.tapBuyButton();
      await BuyGetStartedView.tapGetStartedButton();
      await BuildQuoteView.tapAccountPicker();
      await AccountListBottomSheet.tapToSelectActiveAccountAtIndex(2);
      await Assertions.expectTextDisplayed('Account 3');
      await BuildQuoteView.tapCancelButton();
      await TabBarComponent.tapWallet();
      await TabBarComponent.tapActions();
      await WalletActionsBottomSheet.tapSellButton();
      await BuyGetStartedView.tapGetStartedButton();
      await Assertions.expectTextDisplayed('Account 3', {
        description:
          'Account 3 should be maintained across different ramp flows',
      });
    });
  });
});
