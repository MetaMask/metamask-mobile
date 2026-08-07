import type { TestInfo } from '@playwright/test';

export const attachPageSourceToTest = async (
  testDriver: WebdriverIO.Browser,
  testInfo: TestInfo,
): Promise<void> => {
  const pageSource = await testDriver.getPageSource();
  await testInfo.attach('page-source.html', { body: pageSource });
};
