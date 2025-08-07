import { loginToApp } from '../../viewHelper';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import WalletActionsBottomSheet from '../../pages/wallet/WalletActionsBottomSheet';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import Assertions from '../../framework/Assertions';
import BuyGetStartedView from '../../pages/Ramps/BuyGetStartedView';
import AccountListBottomSheet from '../../pages/wallet/AccountListBottomSheet';
import BuildQuoteView from '../../pages/Ramps/BuildQuoteView';
import { SmokeTrade } from '../../tags';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import { getRampsApiMocks } from '../../api-mocking/mock-responses/ramps-mocks';
import { LocalNodeType } from '../../framework/types';
import { Hardfork } from '../../seeder/anvil-manager';
import { RampsRegions, RampsRegionsEnum } from '../../framework/Constants';

// Anvil configuration for local blockchain node
const anvilLocalNodeOptions = {
  hardfork: 'London' as Hardfork,
  mnemonic:
    'drive manage close raven tape average sausage pledge riot furnace august tip',
  chainId: 1,
};

// Get ramps API mocks from the dedicated mock file
const rampsApiMocks = getRampsApiMocks();

const setupRampsAccountSwitchTest = async (
  testFunction: () => Promise<void>,
) => {
  await withFixtures(
    {
      fixture: new FixtureBuilder()
        .withImportedHdKeyringAndTwoDefaultAccountsOneImportedHdAccountKeyringController()
        .withRampsSelectedRegion(RampsRegions[RampsRegionsEnum.FRANCE])
        .build(),
      restartDevice: true,
      localNodeOptions: [
        {
          type: LocalNodeType.anvil,
          options: anvilLocalNodeOptions,
        },
      ],
      testSpecificMock: rampsApiMocks,
    },
    async () => {
      await loginToApp();
      await testFunction();
    },
  );
};

describe(SmokeTrade('Ramps with Account Switching'), () => {
  beforeEach(async () => {
    jest.setTimeout(150000);
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
