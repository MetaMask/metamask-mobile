import { test } from '../fixture';
import { expect } from '@playwright/test';

test('dummy test', async ({ driver }) => {
  const element = await driver.findElement(
    'xpath',
    '//*[@text="Welcome Back!"]',
  );
  expect(element).toBeDefined();
  await new Promise((resolve) => setTimeout(resolve, 10000));
});
