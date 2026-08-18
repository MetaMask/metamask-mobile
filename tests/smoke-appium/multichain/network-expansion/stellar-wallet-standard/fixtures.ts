import { Mockttp } from 'mockttp';
import FixtureBuilder from '../../../../framework/fixtures/FixtureBuilder.js';
import {
  DappServer,
  DappVariants,
  TestDapps,
} from '../../../../framework/index.js';
import { setupRemoteFeatureFlagsMock } from '../../../../api-mocking/helpers/remoteFeatureFlagsHelper.js';
import { remoteFeatureFlagStellarAccounts } from '../../../../api-mocking/mock-responses/feature-flags-mocks.js';
import { STELLAR_DAPP_PORT } from '../../../../page-objects/Browser/StellarTestDapp.js';
import {
  setupAdbReverse,
  cleanupAdbReverse,
  waitForDappServerReady,
} from '../../../mm-connect/utils.js';

/**
 * Truncated address shown in the Stellar test dapp header for SLIP-0010
 * m/44'/148'/0' from the default E2E mnemonic (`drive manage close raven ...`).
 */
export const account1Short = 'GDWA...LDGL';

const mockStellarAccountsEnabled = async (mockServer: Mockttp) => {
  await setupRemoteFeatureFlagsMock(
    mockServer,
    remoteFeatureFlagStellarAccounts(true),
  );
};

export const stellarFixture = {
  fixture: new FixtureBuilder().withStellarEnabled().build(),
  restartDevice: true,
  testSpecificMock: mockStellarAccountsEnabled,
};

export function createStellarDappServer(): DappServer {
  return new DappServer({
    dappCounter: 0,
    rootDirectory: TestDapps[DappVariants.STELLAR_TEST_DAPP].dappPath,
    dappVariant: DappVariants.STELLAR_TEST_DAPP,
  });
}

export async function startStellarDappServer(
  stellarDappServer: DappServer,
): Promise<void> {
  stellarDappServer.setServerPort(STELLAR_DAPP_PORT);
  await stellarDappServer.start();
  await waitForDappServerReady(STELLAR_DAPP_PORT);
  setupAdbReverse(STELLAR_DAPP_PORT);
}

export async function stopStellarDappServer(
  stellarDappServer: DappServer,
): Promise<void> {
  cleanupAdbReverse(STELLAR_DAPP_PORT);
  await stellarDappServer.stop();
}
