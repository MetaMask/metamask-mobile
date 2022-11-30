import {Given, When, Then} from '@wdio/cucumber-framework';
import WalletMainScreen from "../screen-objects/WalletMainScreen";
import DrawerViewScreen from "../screen-objects/DrawerViewScreen";
import BrowserScreen from "../screen-objects/BrowserScreen";

Given(/^I am on browser view$/, async () => {
  await WalletMainScreen.tapBurgerIcon();
  await DrawerViewScreen.tapBrowserButton();
  await BrowserScreen.isScreenContentDisplayed();
});

Given(/^I am on "([^"]*)"$/, async () => {
  await BrowserScreen.tapNavBar();
});

When(/^I input "([^"]*)" in the search field$/, async () => {

});

Then(/^suggested defi app will be displayed while typing$/, async () => {

});

Then(/^"([^"]*)" is the top suggestion$/, async () => {

});

Then(/^the browser view is on "([^"]*)"$/, async () => {

});

Then(/^"([^"]*)" is the active wallet account$/, async () => {

});

Then(/^"([^"]*)" wallet is connected to "([^"]*)"$/, async () => {

});

When(/^I tap the account icon located in the upper right of the browser view$/, async () => {

});
Then(/^select account component is displayed$/, async () => {

});
Then(/^"([^"]*)" is now active in the app$/, async () => {

});
Then(/^account icon for "([^"]*)" is displayed$/, async () => {

});
When(/^I navigate to "([^"]*)"$/, async () => {

});
When(/^I connect "([^"]*)" wallet to "([^"]*)"$/, async () => {

});
Then(/^"([^"]*)" shows "([^"]*)" is connected$/, async () => {

});
Given(/^I am on the browser view$/, async () => {

});
Given(/^I have one browser tab displayed$/, async () => {

});
Given(/^I have no favorites saved$/, async () => {

});

When(/^I navigate to "([^"]*)"$/, async () => {

});
When(/^I tap browser control menu icon on the bottom right of the browser view$/, async () => {

});
Then(/^"([^"]*)" view is displayed$/, async () => {

});
Then(/^Name field is prepopulated with "([^"]*)"$/, async () => {

});
Then(/^Url field is prepopulated with "([^"]*)"$/, async () => {

});
Then(/^the favorite is not added$/, async () => {

});
When(/^I input "([^"]*)" in the favorite name field$/, async () => {

});
When(/^I input "([^"]*)"$/, async () => {

});
When(/^I tap the browser home button$/, async () => {

});
When(/^I tap Favorites on home\.metamask\.io$/, async () => {

});
Then(/^only one favorite is displayed$/, async () => {

});
Then(/^favorite card title is "([^"]*)"$/, async () => {

});
Then(/^favorite card URL is "([^"]*)"$/, async () => {

});
Then(/^the webpage should load successfully$/, async () => {

});
Then(/^I should see a warning screen with "([^"]*)"$/, async () => {

});
Then(/^I should see some text explaining why the site I searched is malicious$/, async () => {

});
Then(/^I should see a "([^"]*)" button$/, async () => {

});
When(/^I tap on the "([^"]*)" button$/, async () => {

});
Then(/^I am taken back to the home page$/, async () => {

});
Then(/^I should see "([^"]*)"$/, async () => {

});
Then(/^a blue button with "([^"]*)" should be visible$/, async () => {

});
When(/^I tap on "([^"]*)"$/, async () => {

});
Then(/^I am taken back to the home page`$/, async () => {

});
Given(/^I have one browser tab active$/, async () => {

});
When(/^I tap on address bar$/, async () => {

});
Then(/^browser address bar input view is displayed$/, async () => {

});
When(/^I tap clear icon in address field$/, async () => {

});
Then(/^address field is cleared$/, async () => {

});
Then(/^browser address bar input view is no longer displayed$/, async () => {

});
When(/^I input "([^"]*)" in address field$/, async () => {

});
When(/^I tap device Go or Next button$/, async () => {

});
Then(/^browser navigates to "([^"]*)"$/, async () => {

});
Given(/^I have one active browser tab$/, async () => {

});
When(/^I tap the back arrow control button$/, async () => {

});
Then(/^browser navigates to "([^"]*)"$/, async () => {

});
When(/^I tap on forward arrow control button$/, async () => {

});
Then(/^browser navigates to "([^"]*)"$/, async () => {

});
When(/^I tap search button$/, async () => {

});
Then(/^address bar search view is displayed$/, async () => {

});
When(/^I tap browser tab button with count (\d+)$/, async () => {

});
Then(/^multi browser tab view is displayed$/, async () => {

});
When(/^I tap add\/plus icon$/, async () => {

});
Then(/^new browser tab is created$/, async () => {

});
Then(/^new browser tab is displayed$/, async () => {

});
Then(/^browser tab count is (\d+)$/, async () => {

});
Then(/^all browser tabs are closed$/, async () => {

});
Then(/^no browser tab is active$/, async () => {

});
When(/^i tap Home button$/, async () => {

});
Given(/^I am on browser homepage$/, async () => {

});
When(/^I tap browser options icon on bottom right of browser view$/, async () => {

});
Then(/^browser options menu is displayed$/, async () => {

});
Then(/^"([^"]*)" option item is displayed in browser options menu$/, async () => {

});
Then(/^new browser tab is added$/, async () => {

});
Then(/^new browser tab is active$/, async () => {

});
Then(/^new browser is on homepage$/, async () => {

});
When(/^I connect my wallet to "([^"]*)"$/, async () => {

});
Then(/^active browser tab is refreshed$/, async () => {

});
Then(/^active browser is on "([^"]*)"$/, async () => {

});
Then(/^wallet is connected to "([^"]*)"$/, async () => {

});
When(/^I input "([^"]*)" in name field$/, async () => {

});
When(/^I input "([^"]*)"$/, async () => {

});
When(/^I tap home button$/, async () => {

});
Then(/^"([^"]*)" favorite is displayed in favorites list$/, async () => {

});
Then(/^"([^"]*)" URL is "([^"]*)"$/, async () => {

});
When(/^I tap on "([^"]*)" favorite$/, async () => {

});
Then(/^"([^"]*)" is not displayed in browser options menu$/, async () => {

});
Then(/^device component is displayed to share current address URL$/, async () => {

});
Then(/^device component to select browser is displayed$/, async () => {

});
Then(/^device may auto switch to device default browser without showing device component$/, async () => {

});
Then(/^device browser is on "([^"]*)"$/, async () => {

});
When(/^I select "([^"]*)"$/, async () => {

});
Then(/^"([^"]*)" is selected for MMM app$/, async () => {

});
Then(/^active browser tab is showing "([^"]*)"$/, async () => {

});
Then(/^wallet is no longer connected to "([^"]*)"$/, async () => {

});
