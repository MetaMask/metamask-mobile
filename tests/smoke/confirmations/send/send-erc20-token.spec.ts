import FixtureBuilder, {
  DEFAULT_FIXTURE_ACCOUNT_CHECKSUM,
} from '../../../framework/fixtures/FixtureBuilder';
import FooterActions from '../../../page-objects/Browser/Confirmations/FooterActions';
import SendView from '../../../page-objects/Send/RedesignedSendView';
import WalletView from '../../../page-objects/wallet/WalletView';
import { DappVariants } from '../../../framework/Constants';
import { SmokeConfirmations } from '../../../tags';
import { AnvilPort } from '../../../framework/fixtures/FixtureUtils';
import { loginToApp } from '../../../flows/wallet.flow';
import { withFixtures } from '../../../framework/fixtures/FixtureHelper';
import { AnvilManager } from '../../../seeder/anvil-manager';
import { Mockttp } from 'mockttp';
import { setupMockRequest } from '../../../api-mocking/helpers/mockHelpers';
import { getDecodedProxiedURL } from '../../notifications/utils/helpers';

const RECIPIENT = '0x0c54fccd2e384b4bb6f2e405bf5cbc15a017aafb';

const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const DAI_ADDRESS = '0x6B175474E89094C44Da98b954EedeAC495271d0F';
const TEST_ACCOUNT = DEFAULT_FIXTURE_ACCOUNT_CHECKSUM.toLowerCase();

/**
 * Mock Accounts API V4/V2 to return ETH + USDC + DAI balances on Mainnet.
 * Required because the `assetsAccountApiBalances` flag (from feature-flag-registry)
 * causes the app to fetch balances from the Accounts API instead of RPC.
 * Without these mocks, USDC does not appear in the token picker.
 */
async function setupAccountsApiMocks(mockServer: Mockttp): Promise<void> {
  await setupMockRequest(mockServer, {
    url: /accounts\.api\.cx\.metamask\.io\/v4\/multiaccount\/balances/,
    response: {
      balances: [
        {
          object: 'token',
          address: '0x0000000000000000000000000000000000000000',
          symbol: 'ETH',
          name: 'Ether',
          type: 'native',
          decimals: 18,
          chainId: 1,
          balance: '10.000000000000000000',
          accountAddress: `eip155:1:${TEST_ACCOUNT}`,
        },
        {
          object: 'token',
          address: USDC_ADDRESS,
          symbol: 'USDC',
          name: 'USD Coin',
          type: 'erc20',
          decimals: 6,
          chainId: 1,
          balance: '10000.000000',
          accountAddress: `eip155:1:${TEST_ACCOUNT}`,
        },
        {
          object: 'token',
          address: DAI_ADDRESS,
          symbol: 'DAI',
          name: 'Dai Stablecoin',
          type: 'erc20',
          decimals: 18,
          chainId: 1,
          balance: '5000.000000000000000000',
          accountAddress: `eip155:1:${TEST_ACCOUNT}`,
        },
      ],
      unprocessedNetworks: [],
    },
    requestMethod: 'GET',
    responseCode: 200,
  });

  await setupMockRequest(mockServer, {
    url: /accounts\.api\.cx\.metamask\.io\/v2\/accounts\/[^/]+\/balances/,
    response: {
      count: 3,
      balances: [
        {
          object: 'token',
          address: '0x0000000000000000000000000000000000000000',
          symbol: 'ETH',
          name: 'Ether',
          type: 'native',
          timestamp: '2015-07-30T15:26:13.000Z',
          decimals: 18,
          chainId: 1,
          balance: '10.0',
        },
        {
          object: 'token',
          address: USDC_ADDRESS,
          symbol: 'USDC',
          name: 'USD Coin',
          type: 'erc20',
          timestamp: '2018-05-28T00:00:00.000Z',
          decimals: 6,
          chainId: 1,
          balance: '10000.0',
        },
        {
          object: 'token',
          address: DAI_ADDRESS,
          symbol: 'DAI',
          name: 'Dai Stablecoin',
          type: 'erc20',
          timestamp: '2017-12-18T00:00:00.000Z',
          decimals: 18,
          chainId: 1,
          balance: '5000.0',
        },
      ],
      unprocessedNetworks: [],
    },
    requestMethod: 'GET',
    responseCode: 200,
  });

  await setupMockRequest(mockServer, {
    url: /transaction\.api\.cx\.metamask\.io\/networks\/\d+\/getFees/,
    response: {
      blockNumber: '0x1',
      baseFeePerGas: '0x3B9ACA00',
      priorityFeeRange: ['0x3B9ACA00', '0x77359400'],
      estimatedBaseFees: {
        medium: [
          {
            maxPriorityFeePerGas: '0x3B9ACA00',
            maxFeePerGas: '0x77359400',
          },
        ],
      },
    },
    requestMethod: 'POST',
    responseCode: 200,
  });

  const MAINNET_RPC_RESPONSES: Record<string, unknown> = {
    eth_chainId: '0x1',
    eth_getBalance: '0x8AC7230489E80000',
    eth_call: '0x',
    eth_estimateGas: '0xCAFE',
    eth_gasPrice: '0x3B9ACA00',
    eth_getTransactionCount: '0x0',
    eth_blockNumber: '0x1234567',
    eth_getBlockByNumber: {
      number: '0x1234567',
      hash: '0xabc123',
      timestamp: '0x' + Math.floor(Date.now() / 1000).toString(16),
      gasLimit: '0x1c9c380',
      gasUsed: '0x5208',
      baseFeePerGas: '0x3B9ACA00',
      transactions: [],
    },
    eth_maxPriorityFeePerGas: '0x3B9ACA00',
    eth_feeHistory: {
      baseFeePerGas: ['0x3B9ACA00', '0x3B9ACA00'],
      gasUsedRatio: [0.5],
      oldestBlock: '0x1234566',
      reward: [['0x3B9ACA00']],
    },
    net_version: '1',
  };

  const createMainnetRpcCallback =
    () =>
    async (request: {
      body: { getText: () => Promise<string | undefined> };
    }) => {
      try {
        const bodyText = await request.body.getText();
        const body = bodyText ? JSON.parse(bodyText) : null;

        if (Array.isArray(body)) {
          const results = body.map((req: { id?: number; method?: string }) => ({
            id: req.id ?? 1,
            jsonrpc: '2.0',
            result: MAINNET_RPC_RESPONSES[req.method ?? ''] ?? '0x',
          }));
          return { statusCode: 200, body: JSON.stringify(results) };
        }

        return {
          statusCode: 200,
          body: JSON.stringify({
            id: body?.id ?? 1,
            jsonrpc: '2.0',
            result: MAINNET_RPC_RESPONSES[body?.method ?? ''] ?? '0x',
          }),
        };
      } catch {
        return {
          statusCode: 200,
          body: JSON.stringify({ id: 1, jsonrpc: '2.0', result: '0x' }),
        };
      }
    };

  await mockServer
    .forPost(/^https:\/\/mainnet\.infura\.io\/v3\/.*$/)
    .asPriority(1000)
    .thenCallback(createMainnetRpcCallback());

  await mockServer
    .forPost('/proxy')
    .matching((request) => {
      const url = getDecodedProxiedURL(request.url);
      return url.includes('mainnet.infura.io');
    })
    .asPriority(1000)
    .thenCallback(createMainnetRpcCallback());

  const simulationResponse = {
    jsonrpc: '2.0',
    result: {
      transactions: [
        {
          return: '0x',
          status: '0x1',
          gasUsed: '0xCAFE',
          gasLimit: '0xCAFE',
          fees: [
            {
              maxFeePerGas: '0xe49f91ac',
              maxPriorityFeePerGas: '0x3b9aca04',
              gas: '0xCAFE',
              balanceNeeded: '0xDE0FFF5E909F768',
              currentBalance: '0x3635C9ADC5DEA00000',
              error: '',
            },
          ],
          stateDiff: {
            post: {
              [TEST_ACCOUNT]: { balance: '0x3625c9adc19b620000', nonce: '0x1' },
            },
            pre: {
              [TEST_ACCOUNT]: { balance: '0x3635C9adc5dea00000', nonce: '0x0' },
            },
          },
          callTrace: {
            from: TEST_ACCOUNT,
            to: USDC_ADDRESS,
            type: 'CALL',
            gas: '0x1dcd6500',
            gasUsed: '0xCAFE',
            value: '0x0',
            input: '0x',
            output: '0x',
            error: '',
            calls: null,
          },
          feeEstimate: 58176096363000,
          baseFeePerGas: 1770290302,
        },
      ],
      blockNumber: '0x53afbb',
      id: '09156630-b754-4bb8-bfc4-3390d934cec6',
    },
    id: '42',
  };

  for (const sentinelUrl of [
    'https://tx-sentinel-ethereum-mainnet.api.cx.metamask.io/',
    'https://tx-sentinel-localhost.api.cx.metamask.io/',
    'https://tx-sentinel-127.0.0.1.api.cx.metamask.io/',
  ]) {
    await mockServer
      .forPost(sentinelUrl)
      .asPriority(999)
      .thenJson(200, simulationResponse);
  }
}

describe(SmokeConfirmations('Send ERC20 asset'), () => {
  it('should send USDC amount 5 to an address', async () => {
    await withFixtures(
      {
        dapps: [
          {
            dappVariant: DappVariants.TEST_DAPP,
          },
        ],
        fixture: ({ localNodes }) => {
          const node = localNodes?.[0] as unknown as AnvilManager;
          const rpcPort =
            node instanceof AnvilManager
              ? (node.getPort() ?? AnvilPort())
              : undefined;

          return new FixtureBuilder()
            .withNetworkController({
              providerConfig: {
                chainId: '0x539',
                rpcUrl: `http://localhost:${rpcPort ?? AnvilPort()}`,
                type: 'custom',
                nickname: 'Local RPC',
                ticker: 'ETH',
              },
            })
            .withTokensForAllPopularNetworks([
              {
                address: '0x0000000000000000000000000000000000000000',
                symbol: 'ETH',
                decimals: 18,
                name: 'Ethereum',
              },
              {
                address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
                symbol: 'USDC',
                decimals: 6,
                name: 'USD Coin',
              },
              {
                address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
                symbol: 'DAI',
                decimals: 18,
                name: 'Dai Stablecoin',
              },
            ])
            .build();
        },
        testSpecificMock: setupAccountsApiMocks,
        restartDevice: true,
      },
      async () => {
        await loginToApp();
        await device.disableSynchronization();

        // send 5 USDC
        await WalletView.tapWalletSendButton();
        await SendView.selectERC20Token();
        await SendView.pressAmountFiveButton();
        await SendView.pressContinueButton();
        await SendView.inputRecipientAddress(RECIPIENT);
        await SendView.pressReviewButton();
        await FooterActions.tapCancelButton();
      },
    );
  });

  it('should send USDC amount 50% to an address', async () => {
    await withFixtures(
      {
        dapps: [
          {
            dappVariant: DappVariants.TEST_DAPP,
          },
        ],
        fixture: ({ localNodes }) => {
          const node = localNodes?.[0] as unknown as { getPort?: () => number };
          const rpcPort =
            node instanceof AnvilManager
              ? (node.getPort() ?? AnvilPort())
              : undefined;

          return new FixtureBuilder()
            .withNetworkController({
              providerConfig: {
                chainId: '0x539',
                rpcUrl: `http://localhost:${rpcPort ?? AnvilPort()}`,
                type: 'custom',
                nickname: 'Local RPC',
                ticker: 'ETH',
              },
            })
            .withTokensForAllPopularNetworks([
              {
                address: '0x0000000000000000000000000000000000000000',
                symbol: 'ETH',
                decimals: 18,
                name: 'Ethereum',
              },
              {
                address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
                symbol: 'USDC',
                decimals: 6,
                name: 'USD Coin',
              },
              {
                address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
                symbol: 'DAI',
                decimals: 18,
                name: 'Dai Stablecoin',
              },
            ])
            .build();
        },
        testSpecificMock: setupAccountsApiMocks,
        restartDevice: true,
      },
      async () => {
        await loginToApp();
        await device.disableSynchronization();

        // send 50% USDC
        await WalletView.tapWalletSendButton();
        await SendView.selectERC20Token();
        await SendView.pressFiftyPercentButton();
        await SendView.pressContinueButton();
        await SendView.inputRecipientAddress(RECIPIENT);
        await SendView.pressReviewButton();
        await FooterActions.tapCancelButton();
      },
    );
  });

  it('should send USDC send maxto an address', async () => {
    await withFixtures(
      {
        dapps: [
          {
            dappVariant: DappVariants.TEST_DAPP,
          },
        ],
        fixture: ({ localNodes }) => {
          const node = localNodes?.[0] as unknown as AnvilManager;
          const rpcPort =
            node instanceof AnvilManager
              ? (node.getPort() ?? AnvilPort())
              : undefined;

          return new FixtureBuilder()
            .withNetworkController({
              providerConfig: {
                chainId: '0x539',
                rpcUrl: `http://localhost:${rpcPort ?? AnvilPort()}`,
                type: 'custom',
                nickname: 'Local RPC',
                ticker: 'ETH',
              },
            })
            .withTokensForAllPopularNetworks([
              {
                address: '0x0000000000000000000000000000000000000000',
                symbol: 'ETH',
                decimals: 18,
                name: 'Ethereum',
              },
              {
                address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
                symbol: 'USDC',
                decimals: 6,
                name: 'USD Coin',
              },
              {
                address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
                symbol: 'DAI',
                decimals: 18,
                name: 'Dai Stablecoin',
              },
            ])
            .build();
        },
        testSpecificMock: setupAccountsApiMocks,
        restartDevice: true,
      },
      async () => {
        await loginToApp();
        await device.disableSynchronization();

        // send Max USDC
        await WalletView.tapWalletSendButton();
        await SendView.selectERC20Token();
        await SendView.pressAmountMaxButton();
        await SendView.pressContinueButton();
        await SendView.inputRecipientAddress(RECIPIENT);
        await SendView.pressReviewButton();
        await FooterActions.tapCancelButton();
      },
    );
  });
});
