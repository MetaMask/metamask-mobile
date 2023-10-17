'use strict';

import { Regression } from '../../tags';
import TestHelpers from '../../helpers';
import SendView from '../../pages/SendView';
import { loginToApp } from '../../viewHelper';
import TabBarComponent from '../../pages/TabBarComponent';
import WalletActionsModal from '../../pages/modals/WalletActionsModal';
import FixtureBuilder from '../../fixtures/fixture-builder';
import {
  withFixtures,
} from '../../fixtures/fixture-helper';

describe(Regression('ENS'), () => {
  const SAMPLE_ADDRESS = '1111111111111111111111111111111111111111';
  const SAMPLE_ENS = 'confirmationstest.eth';
  const INFURA_URL =
    `https://mainnet.infura.io/v3/${process.env.MM_INFURA_PROJECT_ID}`;

  const AMOUNT = '0';

  async function mockInfura(mockServer) {
    await mockServer
      .forPost(INFURA_URL)
      .withJsonBodyIncluding({ method: 'eth_blockNumber' })
      .thenCallback(() => {
        return {
          statusCode: 200,
          json: {
            jsonrpc: '2.0',
            id: '1111111111111111',
            result: '0x1',
          },
        };
      });

    await mockServer
      .forPost(INFURA_URL)
      .withJsonBodyIncluding({ method: 'eth_getBalance' })
      .thenCallback(() => {
        return {
          statusCode: 200,
          json: {
            jsonrpc: '2.0',
            id: '1111111111111111',
            result: '0x3c8df1c1adb306aa1',
          },
        };
      });

    await mockServer
      .forPost(INFURA_URL)
      .withJsonBodyIncluding({ method: 'eth_getBlockByNumber' })
      .thenCallback(() => {
        return {
          statusCode: 200,
          json: {
            jsonrpc: '2.0',
            id: '1111111111111111',
            result: {},
          },
        };
      });

    await mockServer
      .forPost(INFURA_URL)
      .withJsonBodyIncluding({ method: 'eth_call' })
      .thenCallback(() => {
        return {
          statusCode: 200,
          json: {
            jsonrpc: '2.0',
            id: '1111111111111111',
            result: `0x000000000000000000000000${SAMPLE_ADDRESS}`,
          },
        };
      });
  }

  beforeAll(async () => {
    jest.setTimeout(2500000);
    await TestHelpers.reverseServerPort();
  });

  it('domain resolves to the correct address', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
        mocks: true,
        testSpecificMock: mockInfura,
      },
      async () => {


        await loginToApp();

        await TabBarComponent.tapActions();
        await WalletActionsModal.tapSendButton();

        await SendView.inputAddress(SAMPLE_ENS);
        await SendView.tapNextButton();

      },
    );
  });
});
