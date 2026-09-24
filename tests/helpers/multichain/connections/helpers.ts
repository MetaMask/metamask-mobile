import { createLogger } from '../../../framework/logger';
import WebView from '../../../framework/WebView';
import { getDriver } from '../../../framework/AppiumUtilities';

const logger = createLogger({
  name: 'multichain-connections-helpers.ts',
});

export const requestPermissions = async ({
  pageUrl,
  accounts,
  params,
}: {
  pageUrl: string;
  accounts?: string[];
  params?: unknown[];
}): Promise<void> => {
  logger.debug('Starting requestPermissions');

  const requestPermissionsRequest = JSON.stringify({
    jsonrpc: '2.0',
    method: 'wallet_requestPermissions',
    params: params ?? [
      {
        eth_accounts: accounts
          ? { caveats: [{ type: 'restrictReturnedAccounts', value: accounts }] }
          : {},
      },
    ],
  });

  await WebView.withWebViewAction(pageUrl, async () => {
    const driver = getDriver();
    await driver.execute(
      `window.ethereum.request(${requestPermissionsRequest}); return true;`,
    );
  });
  logger.debug('Done requestPermissions');
};
