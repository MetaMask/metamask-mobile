import LoginView from '../../e2e/pages/wallet/LoginView';
import { asPlaywrightElement, PlaywrightElement } from '../framework';
import { test } from '../fixture';
import { expect } from '@playwright/test';

const E2E_PASSWORD = process.env.E2E_PASSWORD || '';

/**
 * Using helper functions, check LoginView to see the flow
 */
test.only('login with password - page object helper functions flow', async ({
  driver,
}) => {
  expect(driver).toBeDefined();

  // High-level method - works with both frameworks
  await LoginView.enterPassword('asdsad');

  await new Promise((resolve) => setTimeout(resolve, 5000));
});

test('login with password - playing with locator types', async ({ driver }) => {
  expect(driver).toBeDefined();

  // This returns the PlaywrightElement, which is a wrapper around the WebdriverIO element
  const input = await asPlaywrightElement(LoginView.passwordInput);
  await input.fill(E2E_PASSWORD);

  const unlockButton = await LoginView.unlockButton; // This is a EncapsulatedElementType
  const rawPlaywrightElement = unlockButton as PlaywrightElement; // casting directly to PlaywrightElement since we're on an appium context
  const rawWebdriverioElement = await rawPlaywrightElement.unwrap(); // returns the actual previously wrapped WebdriverIO element
  await rawWebdriverioElement.click();

  await new Promise((resolve) => setTimeout(resolve, 5000));
});

test('wfa', async ({ driver }) => {
  // Fetching the elements directly from the driver.
  const welcomeText = await driver.$('~Welcome');
  const text = await welcomeText.getText();
  console.log('Welcome message:', text);
});
