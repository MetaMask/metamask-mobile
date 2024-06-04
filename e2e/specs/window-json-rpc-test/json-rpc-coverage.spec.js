'use strict';
import { web } from 'detox';
import rpcCoverageTool from '@open-rpc/test-coverage';
import { parseOpenRPCDocument } from '@open-rpc/schema-utils-js';
import JsonSchemaFakerRule from '@open-rpc/test-coverage/build/rules/json-schema-faker-rule';
import paramsToObj from '@open-rpc/test-coverage/build/utils/params-to-obj';
import TestHelpers from '../../helpers';
import { SmokeCore } from '../../tags';
import Browser from '../../pages/Browser/BrowserView';
// eslint-disable-next-line import/no-commonjs
const mockServer = require('@open-rpc/mock-server/build/index').default;
import TabBarComponent from '../../pages/TabBarComponent';
import FixtureBuilder from '../../fixtures/fixture-builder';
import {
  withFixtures,
  defaultGanacheOptions,
} from '../../fixtures/fixture-helper';
import { loginToApp } from '../../viewHelper';
import Matchers from '../../utils/Matchers';
import Gestures from '../../utils/Gestures';
import ConnectModal from '../../pages/modals/ConnectModal';

import Assertions from '../../utils/Assertions';
import { addToQueue } from './helpers';

describe(SmokeCore('API Spec Tests'), () => {
  beforeAll(async () => {
    jest.setTimeout(150000);
  });

  it('should run open-rpc/test-coverage tool without any errors', async () => {
    console.log('Running JSON-RPC Coverage Test');
    const port = 8545;
    const chainId = 1337;

    console.log('parseOpenRPCDocument');
    const openrpcDocument = await parseOpenRPCDocument(
      'https://metamask.github.io/api-specs/latest/openrpc.json',
    );

    const signTypedData4 = openrpcDocument.methods.find(
      (m) => m.name === 'eth_signTypedData_v4',
    );

    // just update address for signTypedData
    signTypedData4.examples[0].params[0].value =
      '0x76cf1CdD1fcC252442b50D6e97207228aA4aefC3';

    signTypedData4.examples[0].params[1].value.domain.chainId = chainId;

    const transaction =
      openrpcDocument.components?.schemas?.TransactionInfo?.allOf?.[0];

    if (transaction) {
      delete transaction.unevaluatedProperties;
    }
    // net_version missing from execution-apis. see here: https://github.com/ethereum/execution-apis/issues/540
    const netVersion = {
      name: 'net_version',
      params: [],
      result: {
        description: 'Returns the current network ID.',
        name: 'net_version',
        schema: {
          type: 'string',
        },
      },
      description: 'Returns the current network ID.',
      examples: [
        {
          name: 'net_version',
          description: 'Example of a net_version request',
          params: [],
          result: {
            name: 'net_version',
            description: 'The current network ID',
            value: '0x1',
          },
        },
      ],
    };
    // add net_version
    openrpcDocument.methods.push(netVersion);

    const server = mockServer(port, openrpcDocument);
    server.start();

    class ConfirmationsRejectRule {
      constructor(options) {
        this.driver = options.driver; // Pass element for detox instead of all the driver
        this.only = options.only;
        this.rejectButtonInsteadOfCancel = [
          'personal_sign',
          'eth_signTypedData_v4',
        ];
        this.requiresEthAccountsPermission = [
          'personal_sign',
          'eth_signTypedData_v4',
          'eth_getEncryptionPublicKey',
        ];
      }

      getTitle() {
        return 'Confirmations Rejection Rule';
      }

      async beforeRequest(_, call) {
        addToQueue({
          name: 'beforeRequest',
          task: async () => {
            if (this.requiresEthAccountsPermission.includes(call.methodName)) {
              const requestPermissionsRequest = JSON.stringify({
                jsonrpc: '2.0',
                method: 'wallet_requestPermissions',
                params: [{ eth_accounts: {} }],
              });

              await this.driver.runScript(`(el) => {
                  window.ethereum.request(${requestPermissionsRequest})
                }`);

              /**
               *
               * Screenshot Code Section
               *
               */

              // Connect accounts modal
              await Assertions.checkIfVisible(ConnectModal.container);
              await ConnectModal.tapConnectButton();
              await Assertions.checkIfNotVisible(ConnectModal.container);
              await TestHelpers.delay(3000);
            }

            if (call.methodName === 'eth_signTypedData_v4') {
              call.params[1] = JSON.stringify(call.params[1]);
            }
          },
        });
      }

      // get all the confirmation calls to make and expect to pass
      // Need this now?
      getCalls(_, method) {
        const calls = [];
        const isMethodAllowed = this.only
          ? this.only.includes(method.name)
          : true;
        if (isMethodAllowed) {
          if (method.examples) {
            // pull the first example
            const e = method.examples[0];
            const ex = e;

            if (!ex.result) {
              return calls;
            }
            const p = ex.params.map((e) => e.value);
            const params =
              method.paramStructure === 'by-name'
                ? paramsToObj(p, method.params)
                : p;
            calls.push({
              title: `${this.getTitle()} - with example ${ex.name}`,
              methodName: method.name,
              params,
              url: '',
              resultSchema: method.result.schema,
              expectedResult: ex.result.value,
            });
          } else {
            // naively call the method with no params
            calls.push({
              title: `${method.name} > confirmation rejection`,
              methodName: method.name,
              params: [],
              url: '',
              resultSchema: method.result.schema,
            });
          }
        }
        return calls;
      }

      async afterRequest(_, call) {
        addToQueue({
          name: 'afterRequest',
          task: async () => {
            if (call.methodName === 'wallet_addEthereumChain') {
              const cancelButton = await Matchers.getElementByText('Cancel');
              await Gestures.tap(cancelButton);
            }

            if (call.methodName === 'wallet_switchEthereumChain') {
              await TestHelpers.delay(3000);
              const cancelButton = await Matchers.getElementByText('Cancel');
              await Gestures.tap(cancelButton);
            }

            if (call.methodName === 'eth_signTypedData_v4') {
              await TestHelpers.delay(3000);
              const cancelButton = await Matchers.getElementByText('Cancel');
              await Gestures.tap(cancelButton);
            }

            if (call.methodName === 'wallet_watchAsset') {
              await TestHelpers.delay(5000);
              const cancelButton = await Matchers.getElementByText('CANCEL');
              await Gestures.tap(cancelButton);
            }
          },
        });
        /**
         *
         * Screen shot code section
         */
      }

      async afterResponse(_, call) {
        addToQueue({
          name: 'afterResponse',
          task: async () => {
            // Revoke Permissions
            if (this.requiresEthAccountsPermission.includes(call.methodName)) {
              const revokePermissionRequest = JSON.stringify({
                jsonrpc: '2.0',
                method: 'wallet_revokePermissions',
                params: [{ eth_accounts: {} }],
              });

              await this.driver.runScript(`(el) => {
                window.ethereum.request(${revokePermissionRequest})
              }`);
            }
          },
        });
      }

      validateCall(call) {
        if (call.error) {
          call.valid = call.error.code === 4001;
          if (!call.valid) {
            call.reason = `Expected error code 4001, got ${call.error.code}`;
          }
        }
        return call;
      }
    }

    console.log('about to run withFixtures');
    await withFixtures(
      {
        dapp: true,
        fixture: new FixtureBuilder().withGanacheNetwork().build(),
        ganacheOptions: defaultGanacheOptions,
        disableGanache: true,
        restartDevice: true,
      },
      async () => {
        console.log('about to run loginToApp');
        await loginToApp();
        console.log('about to run TabBarComponent.tapBrowser');
        await TabBarComponent.tapBrowser();
        console.log('about to run Browser.navigateToTestDApp');
        await Browser.navigateToTestDApp();

        const webElement = await web.element(by.web.id('json-rpc-response'));
        await webElement.scrollToView();

        const pollResult = async () =>
          new Promise((resolve, reject) => {
            addToQueue({
              name: 'pollResult',
              task: async () => {
                let result;
                while (!result) {
                  await TestHelpers.delay(500);
                  const text = await webElement.getText();
                  if (typeof text === 'string') {
                    result = JSON.parse(text);
                  }
                }
                return result;
              },
              resolve,
              reject,
            });
          });

        const createDriverTransport = (driver) => (_, method, params) =>
          new Promise((resolve, reject) => {
            const execute = async () => {
              console.log('adding to queue');
              await addToQueue({
                name: 'transport',
                task: async () => {
                  await driver.runScript(
                    (el, m, p) => {
                      window.ethereum
                        .request({ method: m, params: p })
                        .then((res) => {
                          el.innerHTML = JSON.stringify({ result: res });
                        })
                        .catch((err) => {
                          el.innerHTML = JSON.stringify({
                            error: {
                              code: err.code,
                              message: err.message,
                              data: err.data,
                            },
                          });
                        });
                    },
                    [method, params],
                  );
                },
                resolve,
                reject,
              });
            };
            return execute();
          }).then(async () => {
            const result = await pollResult();
            await webElement.clearText();
            return result;
          });

        const transport = await createDriverTransport(webElement);

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
              m.name.includes('filter') ||
              m.name.includes('Filter') ||
              m.name.includes('getBlockReceipts') || // eth_getBlockReceipts not support
              m.name.includes('maxPriorityFeePerGas') || // eth_maxPriorityFeePerGas not supported
              methodsWithConfirmations.includes(m.name),
          )
          .map((m) => m.name);

        const skip = [
          'eth_coinbase',
          'wallet_registerOnboarding',
          'eth_getEncryptionPublicKey',
        ];
        console.log('about to run rpcCoverageTool');

        await rpcCoverageTool({
          openrpcDocument,
          transport,
          reporters: ['console-streaming', 'html'],
          rules: [
            new JsonSchemaFakerRule({
              only: [],
              skip: filteredMethods,
              numCalls: 1,
            }),
            new ConfirmationsRejectRule({
              driver: webElement,
              only: methodsWithConfirmations,
            }),
          ],
          skip,
        });
      },
    );
  });
});
