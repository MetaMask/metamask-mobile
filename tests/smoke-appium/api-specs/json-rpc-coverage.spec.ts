/**
 * OpenRPC JSON-RPC coverage — iOS Appium only.
 * Excluded from smoke tags unless APPIUM_RUN_API_SPECS=1 (`yarn test:api-specs`).
 */
import rpcCoverageTool from '@open-rpc/test-coverage';
import JsonSchemaFakerRule from '@open-rpc/test-coverage/build/rules/json-schema-faker-rule';
import ExamplesRule from '@open-rpc/test-coverage/build/rules/examples-rule';
import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder.js';
import { withFixtures } from '../../framework/fixtures/FixtureHelper.js';
import { getDappUrl } from '../../framework/fixtures/FixtureUtils.js';
import { DappVariants } from '../../framework/Constants.js';
import { loginToAppPlaywright } from '../../flows/wallet.flow.js';
import {
  navigateToBrowserView,
  waitForTestDappToLoad,
} from '../../flows/browser.flow.js';
import Browser from '../../page-objects/Browser/BrowserView.js';
import { createAppiumDriverTransport } from './helpers/transport.js';
import { startOpenRpcMockServer } from './helpers/mock-server.js';
import ConfirmationsRejectRule from './helpers/ConfirmationsRejectionRule.js';
import { CUSTOM_RPC_PROVIDER_MOCKS } from '../../api-mocking/mock-responses/custom-rpc-provider-mocks.js';
import {
  API_SPECS_CHAIN_ID,
  getFilteredMethodsForNonConfirmationRules,
  METHODS_WITH_CONFIRMATIONS,
  prepareOpenRpcDocument,
  SKIP_METHODS,
} from './helpers/openrpc-document.js';

appiumTest.describe('JSON-RPC OpenRPC coverage', () => {
  appiumTest.describe.configure({ timeout: 45 * 60 * 1000 });

  appiumTest(
    'runs OpenRPC examples + confirmation rejections',
    async ({ driver: _driver, currentDeviceDetails }) => {
      appiumTest.skip(
        currentDeviceDetails.platform !== 'ios',
        'API specs run on iOS Appium only',
      );

      const openrpcDocument = await prepareOpenRpcDocument(API_SPECS_CHAIN_ID);
      const mockServer = startOpenRpcMockServer(openrpcDocument);

      try {
        await withFixtures(
          {
            dapps: [
              {
                dappVariant: DappVariants.TEST_DAPP,
              },
            ],
            fixture: new FixtureBuilder().withGanacheNetwork().build(),
            disableLocalNodes: true,
            restartDevice: true,
            currentDeviceDetails,
            // wallet_addEthereumChain OpenRPC example references Gnosis RPC.
            testSpecificMock: CUSTOM_RPC_PROVIDER_MOCKS,
          },
          async () => {
            await loginToAppPlaywright({ scenarioType: 'e2e' });
            await navigateToBrowserView();
            await Browser.navigateToTestDApp();
            await waitForTestDappToLoad();

            const pageUrl = getDappUrl(0);
            const transport = createAppiumDriverTransport(pageUrl);
            const filteredMethods =
              getFilteredMethodsForNonConfirmationRules(openrpcDocument);

            const results = await rpcCoverageTool({
              openrpcDocument,
              transport,
              reporters: ['console-streaming'],
              rules: [
                new JsonSchemaFakerRule({
                  only: [],
                  skip: filteredMethods,
                  numCalls: 1,
                }),
                new ExamplesRule({
                  only: [],
                  skip: filteredMethods,
                }),
                new ConfirmationsRejectRule({
                  pageUrl,
                  only: [...METHODS_WITH_CONFIRMATIONS],
                }),
              ],
              skip: [...SKIP_METHODS],
            });

            const failing = results.filter((result) => !result.valid);
            if (failing.length > 0) {
              const summary = failing
                .map(
                  (result) =>
                    `${result.methodName ?? 'unknown'}: ${
                      result.reason ?? 'invalid'
                    }`,
                )
                .join('\n');
              throw new Error(
                `OpenRPC coverage failures (${failing.length}):\n${summary}`,
              );
            }
          },
        );
      } finally {
        mockServer.stop();
      }
    },
  );
});
