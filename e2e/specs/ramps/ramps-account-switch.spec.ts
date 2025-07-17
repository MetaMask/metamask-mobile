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

const franceRegion = {
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
const rampsApiMocks = getRampsApiMocks();

let mockServer: any;
let mockServerPort: number;

const setupRampsAccountSwitchTest = async (
  testFunction: () => Promise<void>,
) => {
  await withFixtures(
    {
      fixture: new FixtureBuilder()
        .withImportedHdKeyringAndTwoDefaultAccountsOneImportedHdAccountKeyringController()
        .withRampsSelectedRegion(franceRegion as any)
        .build(),
      restartDevice: true,
      // @ts-expect-error - localNodeOptions is not typed
      localNodeOptions,
      testSpecificMock: rampsApiMocks,
      launchArgs: {
        mockServerPort,
      },
    },
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
      mockServer = await startMockServer(rampsApiMocks, testPort);
      mockServerPort = mockServer.port;
      console.log(`Mock server started on port ${mockServerPort}`);
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
      if (mockServer) {
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
      await Assertions.expectTextDisplayed('Account 3');
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
      await Assertions.expectTextDisplayed('Account 3');
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
      await Assertions.expectTextDisplayed('Account 3');
    });
  });
});
