'use strict';
import { web } from 'detox';
import testCoverage from '@open-rpc/test-coverage';
import { parseOpenRPCDocument } from '@open-rpc/schema-utils-js';
import JsonSchemaFakerRule from '@open-rpc/test-coverage/build/rules/json-schema-faker-rule';
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

describe(SmokeCore('OpenRPC method coverage'), () => {
  beforeAll(async () => {
    jest.setTimeout(150000);
    await TestHelpers.reverseServerPort();
  });

  it('asdf', async () => {
    await withFixtures(
      {
        dapp: true,
        fixture: new FixtureBuilder()
          // .withPermissionControllerConnectedToTestDapp()
          .build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();
        await TabBarComponent.tapBrowser();
        await Browser.isVisible();
        await Browser.navigateToTestDApp();

        const webElement = await web.element(by.web.tag('body'));
        await webElement.scrollToView();

        // const pollResult = async () => {
        //   let result = await webElement.runScript(`() => {
        //     return window.response
        //   }`);

        //   while (result === isEmpty) {
        //     await TestHelpers.delay(50);
        //     result = await webElement.runScript(`() => {
        //       return window.response
        //     }`);
        //   }

        //   await webElement.runScript(`() => {
        //     window.response = {}
        //   }`);

        //   return result;
        // };

        // await webElement.runScript(`(el) => {
        //   window.response = {};
        //   window.ethereum.request({
        //     method: 'wallet_requestPermissions',
        //     params: [{
        //       eth_accounts: {}
        //     }]
        //   }).then((res) => {
        //     window.response = { result: res };
        //   }).catch((err) => {
        //     windows.response = {
        //       error: {
        //         code: err.code,
        //         message: err.message,
        //         data: err.date
        //       }
        //     }
        //   });
        // }`);

        await webElement.runScript(`(el) => {
          window.ethereum.request({
            method: 'wallet_requestPermissions',
            params: [{
              eth_accounts: {}
            }]
          }).then((res) => {
            el.innerHTML = JSON.stringify(res);
          }).catch((err) => {
            el.innerHTML = JSON.stringify({
              error: {
                code: err.code,
                message: err.message,
                data: err.date
              }
            })
          });
        }`);
      },
    );
  });
});
