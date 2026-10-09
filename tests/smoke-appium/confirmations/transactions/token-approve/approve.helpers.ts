import { SMART_CONTRACTS } from '../../../../../app/util/test/smart-contracts.js';
import FixtureBuilder from '../../../../framework/fixtures/FixtureBuilder.js';
import {
  AnvilPort,
  buildPermissions,
  getDappUrlForFixture,
} from '../../../../framework/fixtures/FixtureUtils.js';
import { SIMULATION_ENABLED_NETWORKS_MOCK } from '../../../../api-mocking/mock-responses/simulations.js';
import { setupMockRequest } from '../../../../api-mocking/helpers/mockHelpers.js';
import { Mockttp } from 'mockttp';
import { setupRemoteFeatureFlagsMock } from '../../../../api-mocking/helpers/remoteFeatureFlagsHelper.js';
import { confirmationFeatureFlags } from '../../../../api-mocking/mock-responses/feature-flags-mocks.js';
import { LocalNode } from '../../../../framework/types.js';
import { AnvilManager } from '../../../../seeder/anvil-manager.js';

export const ERC_20_CONTRACT = SMART_CONTRACTS.HST;
export const ERC_721_CONTRACT = SMART_CONTRACTS.NFTS;
export const APPROVE_ACTIVITY = 'Approve';

export function buildApproveFixture({
  localNodes,
}: {
  localNodes?: LocalNode[];
}) {
  const node = localNodes?.[0] as unknown as AnvilManager;
  const rpcPort =
    node instanceof AnvilManager ? (node.getPort() ?? AnvilPort()) : undefined;

  const fixture = new FixtureBuilder()
    .withNetworkController({
      chainId: '0x539',
      rpcUrl: `http://localhost:${rpcPort ?? AnvilPort()}`,
      type: 'custom',
      nickname: 'Local RPC',
      ticker: 'ETH',
    })
    .withPermissionControllerConnectedToTestDapp(buildPermissions(['0x539']))
    .build();

  fixture.state.browser.tabs[0].url = getDappUrlForFixture(0);

  return fixture;
}

export const approveTestSpecificMock = async (mockServer: Mockttp) => {
  await setupMockRequest(mockServer, {
    requestMethod: 'GET',
    url: SIMULATION_ENABLED_NETWORKS_MOCK.urlEndpoint,
    response: SIMULATION_ENABLED_NETWORKS_MOCK.response,
    responseCode: 200,
  });
  await setupRemoteFeatureFlagsMock(
    mockServer,
    Object.assign({}, ...confirmationFeatureFlags),
  );
};
