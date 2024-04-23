'use strict';
import { web } from 'detox';
import testCoverage from '@open-rpc/test-coverage';
import { parseOpenRPCDocument } from '@open-rpc/schema-utils-js';
import JsonSchemaFakerRule from '@open-rpc/test-coverage/build/rules/json-schema-faker-rule';
import HtmlReporter from '@open-rpc/test-coverage/build/reporters/html-reporter';
import TestHelpers from '../../helpers';
import { SmokeCore } from '../../tags';
import Browser from '../../pages/Browser';
import TabBarComponent from '../../pages/TabBarComponent';
import FixtureBuilder from '../../fixtures/fixture-builder';
import { withFixtures } from '../../fixtures/fixture-helper';
import { loginToApp } from '../../viewHelper';
import ConnectedAccountsModal from '../../pages/modals/ConnectedAccountsModal';
import { TestDApp } from '../../pages/TestDApp';
import ConnectModal from '../../pages/modals/ConnectModal';

import Assertions from '../../utils/Assertions';

describe(SmokeCore(''), () => {
  beforeAll(async () => {
    jest.setTimeout(150000);
    await TestHelpers.reverseServerPort();
  });

  it('', async () => {
    await withFixtures(
      {
        dapp: true,
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
      },
      async () => {
        const openrpcDocument = await parseOpenRPCDocument(
          'https://metamask.github.io/api-specs/latest/openrpc.json',
        );

        await loginToApp();
        await TabBarComponent.tapBrowser();
        await Browser.isVisible();
        await Browser.navigateToTestDApp();

        const webElement = await web.element(by.web.id('json-rpc-response'));
        await webElement.scrollToView();

        const pollResult = async () => {
          let result = await webElement.runScript(`(el) => {
            return el.innerHTML
          }`);

          while (result.result === '') {
            await TestHelpers.delay(500);
            result = await webElement.runScript(`(el) => {
              return el.innerHTML
            }`);
          }

          // await web.element(by.web.id('json-rpc-response')).replaceText('');

          return result;
        };

        const createDriverTransport = (driver) => async (_, method, params) => {
          await driver.runScript(
            (el, m, p) => {
              window.ethereum
                .request({ method: m, params: p })
                .then((res) => (el.innerHTML = JSON.stringify(res)))
                .catch((err) => (el.innerHTML = JSON.stringify(err)));
            },
            [method, params],
          );
          const response = await pollResult();
          return response;
        };

        const transport = createDriverTransport(webElement);
        // await transport('', 'wallet_registerOnboarding', []);

        const methodsWithConfirmations = [
          'wallet_requestPermissions',
          'eth_requestAccounts',
          'wallet_watchAsset',
          'personal_sign', // requires permissions for eth_accounts
          'wallet_addEthereumChain',
          'eth_signTypedData_v4', // requires permissions for eth_accounts
          'wallet_switchEthereumChain',
          'eth_getEncryptionPublicKey', // requires permissions for eth_accounts
        ];

        const filteredMethods = openrpcDocument.methods
          .filter(
            (m) =>
              m.name.includes('snap') ||
              m.name.includes('Snap') ||
              m.name.toLowerCase().includes('account') ||
              m.name.includes('crypt') ||
              m.name.includes('blob') ||
              m.name.includes('sendTransaction') ||
              m.name.startsWith('wallet_scanQRCode') ||
              methodsWithConfirmations.includes(m.name),
          )
          .map((m) => m.name);

        await testCoverage({
          openrpcDocument,
          transport,
          reporters: ['console'],
          rules: [
            new JsonSchemaFakerRule({
              only: [],
              skip: filteredMethods,
              numCalls: 1,
            }),
          ],
        });
      },
    );
  });
});
