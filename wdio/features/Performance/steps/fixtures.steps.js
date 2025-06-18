import { Given, When, Then } from '@cucumber/cucumber';
import { withFixtures } from '../fixture-helper';

import FixtureBuilder from '../../../../e2e/fixtures/fixture-builder';
import { loadFixture, startFixtureServer } from '../../../../e2e/fixtures/fixture-helper';
import FixtureServer from '../../../../e2e/fixtures/fixture-server';


Given('I start the fixture server with login state', async function() {
  const fixtureServer = new FixtureServer();
    await startFixtureServer(fixtureServer);
    const state = new FixtureBuilder().build();
    await loadFixture(fixtureServer, { fixture: state });
    // await driver.delay(5000)
    await driver.pause(5000);
  const bundleId = 'io.metamask.qa';

        await driver.terminateApp(bundleId);
    await driver.pause(1000);
    await driver.activateApp(bundleId);
    // await driver.setOrientation('PORTRAIT'); // Removed to avoid UiAutomator2 errors
    console.log('App launched, waiting for UI to stabilize...');


  // Wait for fixture server to be ready
});

// Given('I restart the app to apply the fixture', async function() {
//   // The app restart is handled in the previous step
//   // Launch the app after fixture is loaded
//   const bundleId = 'io.metamask.qa';
//   console.log(`Launching Android app with bundleId: ${bundleId}`);
  
//   try {
//     await driver.terminateApp(bundleId);
//     await driver.pause(1000);
//     await driver.activateApp(bundleId);
//     // await driver.setOrientation('PORTRAIT'); // Removed to avoid UiAutomator2 errors
//     console.log('App launched, waiting for UI to stabilize...');
//     await driver.pause(2000);
//   } catch (error) {
//     console.error('Failed to launch app:', error);
//     throw error;
//   }

//   await browser.pause(5000); // Give more time for the app to fully restart and load fixture
  
//   // Verify we're on the login screen
//   const passwordInput = await browser.$('~password-input');
//   await passwordInput.waitForDisplayed({ timeout: 10000 });
// });

// When('I fill my password in the Login screen', async function() {
//   const passwordInput = await browser.$('~password-input');
//   await passwordInput.waitForDisplayed({ timeout: 10000 });
//   await passwordInput.setValue('password123');
// });

// When('The timer starts running after I tap the login button', async function() {
//   const loginButton = await browser.$('~login-button');
//   await loginButton.waitForDisplayed({ timeout: 10000 });
//   this.startTime = Date.now();
//   await loginButton.click();
// });

// Then('The wallet view appears in {string} seconds', async function(expectedSeconds) {
//   const walletView = await browser.$('~wallet-view');
//   await walletView.waitForDisplayed({ timeout: parseInt(expectedSeconds) * 1000 });
  
//   const endTime = Date.now();
//   const actualSeconds = (endTime - this.startTime) / 1000;
  
//   if (actualSeconds > parseInt(expectedSeconds)) {
//     throw new Error(`Wallet view took ${actualSeconds} seconds to appear, which is longer than the expected ${expectedSeconds} seconds`);
//   }
// }); 