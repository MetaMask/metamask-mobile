'use strict';
import { web } from 'detox';
import detox from 'detox/internals';
import rpcCoverageTool from '@open-rpc/test-coverage';
import { parseOpenRPCDocument } from '@open-rpc/schema-utils-js';
import JsonSchemaFakerRule from '@open-rpc/test-coverage/build/rules/json-schema-faker-rule';
import HtmlReporter from '@open-rpc/test-coverage/build/reporters/html-reporter';

import Browser from '../pages/Browser/BrowserView';
// eslint-disable-next-line import/no-commonjs
const mockServer = require('@open-rpc/mock-server/build/index').default;
import TabBarComponent from '../pages/wallet/TabBarComponent';
import FixtureBuilder from '../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../framework/fixtures/FixtureHelper';
import { loginToApp } from '../viewHelper';

import ExamplesRule from '@open-rpc/test-coverage/build/rules/examples-rule';
import ConfirmationsRejectRule from './ConfirmationsRejectionRule';
import { createDriverTransport } from './helpers';
import { BrowserViewSelectorsIDs } from '../selectors/Browser/BrowserView.selectors';
import { getGanachePort } from '../framework/fixtures/FixtureUtils';
import { DappVariants } from '../framework/Constants';
import { setupMockRequest } from '../api-mocking/helpers/mockHelpers';
import { setupRemoteFeatureFlagsMock } from '../api-mocking/helpers/remoteFeatureFlagsHelper';
import { oldConfirmationsRemoteFeatureFlags } from '../api-mocking/mock-responses/feature-flags-mocks';

const port = getGanachePort(8545, process.pid);
const chainId = 1337;

const main = async () => {
  const openrpcDocument = await parseOpenRPCDocument(
    'https://metamask.github.io/api-specs/0.10.8/openrpc.json',
  );

  const signTypedData4 = openrpcDocument.methods.find(
    (m) => m.name === 'eth_signTypedData_v4',
  );
  const switchEthereumChain = openrpcDocument.methods.find(
    (m) => m.name === 'wallet_switchEthereumChain',
  );
  switchEthereumChain.examples = [
    {
      name: 'wallet_switchEthereumChain',
      description: 'Example of a wallet_switchEthereumChain request to sepolia',
      params: [
        {
          name: 'SwitchEthereumChainParameter',
          value: {
            chainId: '0xaa36a7',
          },
        },
      ],
      result: {
        name: 'wallet_switchEthereumChain',
        value: null,
      },
    },
  ];

  const chainIdMethod = openrpcDocument.methods.find(
    (m) => m.name === 'eth_chainId',
  );

  chainIdMethod.examples = [
    {
      name: 'chainIdExample',
      description: 'Example of a chainId request',
      params: [],
      result: {
        name: 'chainIdResult',
        value: `0x${chainId.toString(16)}`,
      },
    },
  ];

  const blockNumber = openrpcDocument.methods.find(
    (m) => m.name === 'eth_blockNumber',
  );

  blockNumber.examples = [
    {
      name: 'blockNumberExample',
      description: 'Example of a blockNumber request',
      params: [],
      result: {
        name: 'blockNumberResult',
        value: '0x1',
      },
    },
  ];

  // just update address for signTypedData
  signTypedData4.examples[0].params[0].value =
    '0x76cf1CdD1fcC252442b50D6e97207228aA4aefC3';

  signTypedData4.examples[0].params[1].value.domain.chainId = chainId;

  const personalSign = openrpcDocument.methods.find(
    (m) => m.name === 'personal_sign',
  );

  personalSign.examples = [
    {
      name: 'personalSignExample',
      description: 'Example of a personalSign request',
      params: [
        {
          name: 'data',
          value: '0xdeadbeef',
        },
        {
          name: 'address',
          value: '0x76cf1CdD1fcC252442b50D6e97207228aA4aefC3',
        },
      ],
      result: {
        name: 'personalSignResult',
        value: '0x1a8819e0c9bab700',
      },
    },
  ];

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

  const testSpecificMock = async (mockServer) => {
    await setupRemoteFeatureFlagsMock(
      mockServer,
      Object.assign({}, ...oldConfirmationsRemoteFeatureFlags),
    );
  };

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
      testSpecificMock,
    },
    async () => {
      await loginToApp();
      await TabBarComponent.tapBrowser();
      await Browser.navigateToTestDApp();

      const myWebView = web(by.id(BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID));
      const webElement = await myWebView.element(by.web.tag('body'));
      const transport = createDriverTransport(webElement);

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

      // replace this with pulling tags out of the api-spec
      // tag: Confirmations
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
        'wallet_watchAsset',
        'personal_sign', // quarantined for now due to mysterious flakiness, resolution tracked here: https://github.com/MetaMask/MetaMask-planning/issues/5207
        'eth_signTypedData_v4', // quarantined for now due to mysterious flakiness, resolution tracked here: https://github.com/MetaMask/MetaMask-planning/issues/5207
      ];

      const results = await rpcCoverageTool({
        openrpcDocument,
        transport,
        reporters: [
          'console-streaming',
          new HtmlReporter({ autoOpen: !process.env.CI }),
        ],
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
            driver: webElement,
            only: methodsWithConfirmations,
          }),
        ],
        skip,
      });
      const failing = results.filter((r) => !r.valid);
      await detox.cleanup();

      // wait 1s to allow for cleanup
      await new Promise((resolve, reject) => {
        setTimeout(() => {
          resolve();
        }, 1000);
      });
      process.exit(failing.length > 0 ? 1 : 0);
    },
  );
};

const start = async () => {
  await detox.init({ workerId: null });
  await detox.installWorker({
    global: this.global,
    workerId: `w1`,
  });
  await main();
};

start();
