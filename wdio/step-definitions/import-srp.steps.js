import { When, Then } from '@wdio/cucumber-framework';
import AddCustomImportTokensScreen from '../screen-objects/AddCustomImportTokensScreen.js';
import WalletMainScreen from '../screen-objects/WalletMainScreen.js';
import CommonScreen from '../screen-objects/CommonScreen';
import ImportSrpScreen from '../screen-objects/ImportSRPScreen';
import { IDENTITY_TEAM_SEED_PHRASE_2 } from '../../e2e/specs/identity/utils/constants.ts';
const setTimeout = 1500; //added to run on physical device

When(/^I type in my SRP/, async () => {
        const mnemonicArray = IDENTITY_TEAM_SEED_PHRASE_2.split(' ');
        const numberOfWords = mnemonicArray.length;
      
        if (numberOfWords === 24) {
          await ImportSrpScreen.selectNWordSrp(numberOfWords);
        }
      
        for (const [index, word] of mnemonicArray.entries()) {
          await ImportSrpScreen.enterSrpWord(index + 1, word);
        }

      
});

When(/^I tap (.*) of the token Address field/, async (label) => {
  await driver.pause(3000); //added to run on physical device
  await AddCustomImportTokensScreen.tapTokenSymbolField();
});


When(/^I wait/, async () => {
  await driver.pause(25000); //added to run on physical device
});

Then(/^The Token Symbol is displayed/, async () => {
  await AddCustomImportTokensScreen.tapTokenSymbolField();
  await CommonScreen.tapOnText('Token Symbol');
  await AddCustomImportTokensScreen.waitForImportButtonEnabled();
  await AddCustomImportTokensScreen.isTokenSymbolFieldNotNull();
});

When(/^I tap on the Import button/, async () => {
  await AddCustomImportTokensScreen.tapImportButton();
});

Then(/^I should see "([^"]*)?" toast message/, async (toast) => {
  await WalletMainScreen.isTokenTextVisible(toast);
});
