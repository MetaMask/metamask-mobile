import FixtureBuilder from '../../framework/fixtures/FixtureBuilder.js';
import { LocalNodeType, type TestSpecificMock } from '../../framework/types.js';
import { testSpecificMock } from './swap-mocks.js';
import { setupSmartTransactionsMocks } from './smart-transactions-mocks.js';
import { DEFAULT_ANVIL_PORT } from '../../seeder/anvil-manager.js';

export const buildSwapFixture = () =>
  new FixtureBuilder()
    .withNetworkController({
      chainId: '0x1',
      rpcUrl: `http://localhost:${DEFAULT_ANVIL_PORT}`,
      type: 'custom',
      nickname: 'Localhost',
      ticker: 'ETH',
    })
    .withMetaMetricsOptIn()
    .build();

export const ANVIL_WITH_TOKENS_OPTIONS = [
  {
    type: LocalNodeType.anvil,
    options: {
      chainId: 1,
      loadState: './tests/smoke-appium/swap/withTokens.json',
    },
  },
];

export const swapTestSpecificMock: TestSpecificMock = async (mockServer) => {
  await testSpecificMock(mockServer);
  await setupSmartTransactionsMocks(mockServer, DEFAULT_ANVIL_PORT);
};
