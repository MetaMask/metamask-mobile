import { test } from '../fixture';
import { PlaywrightMatchers } from '../framework';

/**
 * Example test demonstrating Playwright-like API with WebdriverIO
 *
 * This test showcases:
 * - Clean Playwright syntax (.fill(), .click(), .textContent())
 * - WebdriverIO's robust element finding and retry mechanisms
 * - Playwright's test runner and reporting
 */
test('login with Playwright-style API', async ({ driver }) => {
  // Option 1: Use PlaywrightMatchers for clean, Playwright-like element selection
  const passwordInput = await PlaywrightMatchers.getByXPath(
    '//*[@resource-id="login-password-input"]',
  );
  await passwordInput.fill('MySecurePassword123!');

  const loginButton = await PlaywrightMatchers.getByText('Unlock');
  await loginButton.click();

  // Option 2: Use driver directly if you need direct access
  const welcomeText = await driver.$('~welcome-message');
  const text = await welcomeText.getText();
  console.log('Welcome message:', text);

  // Verify navigation or success
  const homeScreen =
    await PlaywrightMatchers.getByAccessibilityId('home-screen');
  const isVisible = await homeScreen.isVisible();
  expect(isVisible).toBe(true);
});

test('demonstrates various selector types', async () => {
  // By accessibility ID (most common for mobile)
  const element1 =
    await PlaywrightMatchers.getByAccessibilityId('username-input');
  await element1.fill('user@example.com');

  // By XPath
  const element2 = await PlaywrightMatchers.getByXPath(
    '//*[@resource-id="password"]',
  );
  await element2.fill('password123');

  // By text content
  const submitButton = await PlaywrightMatchers.getByText('Submit');
  await submitButton.click();

  // Get multiple elements
  const allButtons = await PlaywrightMatchers.getAllByText('Delete');
  console.log(`Found ${allButtons.length} delete buttons`);
  if (allButtons.length > 0) {
    await allButtons[0].click();
  }

  // Platform-specific selectors (Android)
  // const androidElement = await PlaywrightMatchers.getByAndroidUIAutomator('new UiSelector().textContains("Submit")');
  // await androidElement.click();

  // Platform-specific selectors (iOS)
  // const iosElement = await PlaywrightMatchers.getByIOSPredicate('label == "Submit"');
  // await iosElement.click();
});

test('demonstrates element methods', async () => {
  const input = await PlaywrightMatchers.getByAccessibilityId('search-input');

  // Fill input (replaces existing value)
  await input.fill('search query');

  // Type text (appends to existing value)
  await input.type(' more text');

  // Clear input
  await input.clear();

  // Get text content
  const text = await input.textContent();
  console.log('Input text:', text);

  // Check visibility
  const isVisible = await input.isVisible();
  console.log('Is visible:', isVisible);

  // Check if enabled
  const isEnabled = await input.isEnabled();
  console.log('Is enabled:', isEnabled);

  // Get attribute
  const placeholder = await input.getAttribute('placeholder');
  console.log('Placeholder:', placeholder);

  // Wait for element states
  await input.waitForDisplayed({ timeout: 5000 });
  await input.waitForEnabled({ timeout: 5000 });

  // Access underlying WebdriverIO element if needed
  const wdioElement = input.unwrap();
  // Now you can use any WebdriverIO-specific methods
  await wdioElement.setValue('test');
});
