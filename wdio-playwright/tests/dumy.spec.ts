import { test } from '../fixture';
import { expect } from '@playwright/test';
import LoginView from '../../e2e/pages/wallet/LoginView';

test('dummy test', async ({ driver }) => {
  const element = await driver.findElement(
    'xpath',
    '//*[@text="Welcome Back!"]',
  );
  expect(element).toBeDefined();
  // Use existing Detox-style PO with Appium-backed compat layer
  await LoginView.enterPassword('Secret123');
  await new Promise((resolve) => setTimeout(resolve, 1000));
});
