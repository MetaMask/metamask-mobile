import FixtureBuilder from '../../framework/fixtures/FixtureBuilder.js';
import { LocalNode } from '../../framework/types.js';
import { AnvilPort } from '../../framework/fixtures/FixtureUtils.js';
import {
  AnvilManager,
  DEFAULT_ANVIL_PORT,
} from '../../seeder/anvil-manager.js';
import { setupSSEMockRequest } from '../../api-mocking/helpers/mockHelpers.js';
import { toSSEResponse } from './constants.js';
import { testSpecificMock as swapTestSpecificMock } from './swap-mocks.js';
import { setupSmartTransactionsMocks } from './smart-transactions-mocks.js';

export const GASLESS_CHAIN_ID = '0x1';

export function buildLocalhostFixture({
  localNodes,
}: {
  localNodes?: LocalNode[];
}) {
  const node = localNodes?.[0] as unknown as AnvilManager;
  const rpcPort =
    node instanceof AnvilManager ? (node.getPort() ?? AnvilPort()) : undefined;

  return new FixtureBuilder()
    .withNetworkController({
      chainId: GASLESS_CHAIN_ID,
      rpcUrl: `http://localhost:${rpcPort ?? AnvilPort()}`,
      type: 'custom',
      nickname: 'Localhost',
      ticker: 'ETH',
    })
    .build();
}

export async function mockGaslessMusdQuote(
  mockServer: Parameters<typeof swapTestSpecificMock>[0],
  quote: object[],
): Promise<void> {
  await swapTestSpecificMock(mockServer);
  // Priority 1000 > 999 so this rule beats the empty-string MUSD mock in swapTestSpecificMock.
  await setupSSEMockRequest(
    mockServer,
    /getQuoteStream.*destTokenAddress=0xacA92E438df0B2401fF60dA7E4337B687a2435DA/i,
    toSSEResponse(quote),
    1000,
  );
  await setupSmartTransactionsMocks(mockServer, DEFAULT_ANVIL_PORT);
}
