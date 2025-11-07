import { test } from '../fixture';
import { expect } from '@playwright/test';
import LoginView from '../../e2e/pages/wallet/LoginView';

const W3C = 'element-6066-11e4-a52e-4f735466cecf';

test('dummy test', async ({ driver }) => {
  await new Promise((resolve) => setTimeout(resolve, 5000));
  const el = await driver.findElement(
    'xpath',
    '//*[@resource-id="login-password-input"]',
  );
  // const elId = (el as any)[W3C] ?? (el as any).ELEMENT;
  await driver.elementSendKeys(el['element-6066-11e4-a52e-4f735466cecf'], 'Secret123');
  await new Promise((resolve) => setTimeout(resolve, 5000));

  // expect(element).toBeDefined();
  // // Use existing Detox-style PO with Appium-backed compat layer
  // await LoginView.enterPassword('Secret123');
  // await new Promise((resolve) => setTimeout(resolve, 1000));
});
