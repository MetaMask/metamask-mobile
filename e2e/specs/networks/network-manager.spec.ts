import { SmokeNetworkAbstractions } from '../../tags';
import { loginToApp } from '../../viewHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import Assertions from '../../framework/Assertions';
import NetworkManager from '../../pages/wallet/NetworkManager';
import TestHelpers from '../../helpers';

// Shared configuration
const isRemoveGlobalNetworkSelectorEnabled =
  process.env.MM_REMOVE_GLOBAL_NETWORK_SELECTOR === 'true';
console.log(
  'isRemoveGlobalNetworkSelectorEnabled',
  isRemoveGlobalNetworkSelectorEnabled,
);
// const itif = (condition: boolean) => (condition ? it : it.skip);

describe(SmokeNetworkAbstractions('Network Manager'), () => {
  beforeAll(async () => {
    jest.setTimeout(170000);
  });

  it('should reflect the enabled networks state in the network manager', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().withPopularNetworks().build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();

        await NetworkManager.openNetworkManager();

        // eslint-disable-next-line no-restricted-syntax
        await TestHelpers.delay(200);

        await Assertions.expectElementToBeVisible(
          NetworkManager.popularNetworksContainer,
        );
        await Assertions.expectElementToBeVisible(
          NetworkManager.selectAllPopularNetworksSelected,
        );

        // TODO: Is there a source of truth for the network list?
        await NetworkManager.getNotSelectedNetworkByName('Linea Main Network');
      },
    );
  });
});
