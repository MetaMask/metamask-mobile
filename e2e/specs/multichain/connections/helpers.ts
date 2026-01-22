import { Matchers } from '../../../framework';
import { createLogger } from '../../../framework/logger';
import { BrowserViewSelectorsIDs } from '../../../../app/components/Views/BrowserTab/BrowserView.testIds';

const logger = createLogger({
  name: 'multichain-connections-helpers.ts',
});

export const requestPermissions = async ({
  accounts,
  params,
}: {
  accounts?: string[];
  params?: unknown[];
} = {}) => {
  logger.debug('Starting requestPermissions');
  const nativeWebView = Matchers.getWebViewByID(
    BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
  );
  const bodyElement = nativeWebView.element(by.web.tag('body'));

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

  await bodyElement.runScript(
    `(el) => { window.ethereum.request(${requestPermissionsRequest}); }`,
  );
  logger.debug('Done requestPermissions');
};
