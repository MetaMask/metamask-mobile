import { loginToApp } from '../../viewHelper';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import WalletView from '../../pages/wallet/WalletView';
import FundActionMenu from '../../pages/UI/FundActionMenu';
import FixtureBuilder from '../../../tests/framework/fixtures/FixtureBuilder';
import { Assertions } from '../../../tests/framework';
import BuyGetStartedView from '../../pages/Ramps/BuyGetStartedView';
import AccountListBottomSheet from '../../pages/wallet/AccountListBottomSheet';
import BuildQuoteView from '../../pages/Ramps/BuildQuoteView';
import { SmokeTrade } from '../../tags';
import { withFixtures } from '../../../tests/framework/fixtures/FixtureHelper';
import { LocalNodeType } from '../../../tests/framework/types';
import { Hardfork } from '../../../tests/seeder/anvil-manager';
import {
  RampsRegions,
  RampsRegionsEnum,
} from '../../../tests/framework/Constants';
import { Mockttp } from 'mockttp';
import { setupRegionAwareOnRampMocks } from '../../../tests/api-mocking/mock-responses/ramps/ramps-region-aware-mock-setup';

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

describe.skip(SmokeTrade('Ramps with Account Switching'), () => {
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
