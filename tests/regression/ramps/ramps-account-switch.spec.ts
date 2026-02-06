import { loginToApp } from '../../../e2e/viewHelper.ts';
import TabBarComponent from '../../../e2e/pages/wallet/TabBarComponent.ts';
import WalletView from '../../../e2e/pages/wallet/WalletView.ts';
import FundActionMenu from '../../../e2e/pages/UI/FundActionMenu.ts';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder.ts';
import { Assertions } from '../../framework';
import BuyGetStartedView from '../../../e2e/pages/Ramps/BuyGetStartedView.ts';
import AccountListBottomSheet from '../../../e2e/pages/wallet/AccountListBottomSheet.ts';
import BuildQuoteView from '../../../e2e/pages/Ramps/BuildQuoteView.ts';
import { RegressionTrade } from '../../../e2e/tags';
import { withFixtures } from '../../framework/fixtures/FixtureHelper.ts';
import { LocalNodeType } from '../../framework/types.ts';
import { Hardfork } from '../../seeder/anvil-manager.ts';
import { RampsRegions, RampsRegionsEnum } from '../../framework/Constants.ts';
import { Mockttp } from 'mockttp';
import { setupRegionAwareOnRampMocks } from '../../api-mocking/mock-responses/ramps/ramps-region-aware-mock-setup.ts';

// Anvil configuration for local blockchain node
const anvilLocalNodeOptions = {
  hardfork: 'London' as Hardfork,
  mnemonic:
    'drive manage close raven tape average sausage pledge riot furnace august tip',
  chainId: 1,
};

const selectedRegion = RampsRegions[RampsRegionsEnum.FRANCE];

const setupRampsAccountSwitchTest = async (
  testFunction: () => Promise<void>,
) => {
  await withFixtures(
    {
      fixture: new FixtureBuilder()
        .withImportedHdKeyringAndTwoDefaultAccountsOneImportedHdAccountKeyringController()
        .withRampsSelectedRegion(selectedRegion)
        .build(),
      restartDevice: true,
      localNodeOptions: [
        {
          type: LocalNodeType.anvil,
          options: anvilLocalNodeOptions,
        },
      ],
      testSpecificMock: async (mockServer: Mockttp) => {
        await setupRegionAwareOnRampMocks(mockServer, selectedRegion);
      },
    },
    async () => {
      await loginToApp();
      await testFunction();
    },
  );
};

describe.skip(RegressionTrade('Ramps with Account Switching'), () => {
  beforeEach(async () => {
    jest.setTimeout(150000);
  });

  it('should navigate to buy page and switch accounts', async () => {
    await setupRampsAccountSwitchTest(async () => {
      await WalletView.tapWalletBuyButton();
      await FundActionMenu.tapBuyButton();
      await BuyGetStartedView.tapGetStartedButton();
      await BuildQuoteView.tapAccountPicker();
      await BuildQuoteView.tapSelectAddressDropdown();
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
      await WalletView.tapWalletBuyButton();
      await FundActionMenu.tapSellButton();
      await BuyGetStartedView.tapGetStartedButton();
      await BuildQuoteView.tapAccountPicker();
      await BuildQuoteView.tapSelectAddressDropdown();
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
      await WalletView.tapWalletBuyButton();
      await FundActionMenu.tapBuyButton();
      await BuyGetStartedView.tapGetStartedButton();
      await BuildQuoteView.tapAccountPicker();
      await BuildQuoteView.tapSelectAddressDropdown();
      await AccountListBottomSheet.tapToSelectActiveAccountAtIndex(2);
      await BuildQuoteView.dismissAccountSelector();
      await Assertions.expectTextDisplayed('Account 3');
      await BuildQuoteView.tapCancelButton();
      await TabBarComponent.tapWallet();
      await WalletView.tapWalletBuyButton();
      await FundActionMenu.tapSellButton();
      await BuyGetStartedView.tapGetStartedButton();
      await Assertions.expectTextDisplayed('Account 3', {
        description:
          'Account 3 should be maintained across different ramp flows',
      });
    });
  });
});
