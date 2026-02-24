import { loginToApp } from '../../flows/wallet.flow';
import WalletView from '../../page-objects/wallet/WalletView';
import FundActionMenu from '../../page-objects/UI/FundActionMenu';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import { CustomNetworks } from '../../resources/networks.e2e';
import { SmokeRamps } from '../../tags';
import Assertions from '../../framework/Assertions';
import BuildQuoteView from '../../page-objects/Ramps/BuildQuoteView';
import TokenSelectScreen from '../../page-objects/Ramps/TokenSelectScreen';

import { RampsRegions, RampsRegionsEnum } from '../../framework/Constants';
import { Mockttp } from 'mockttp';
import { setupRegionAwareOnRampMocks } from '../../api-mocking/mock-responses/ramps/ramps-region-aware-mock-setup';
import { remoteFeatureFlagRampsUnifiedEnabled } from '../../api-mocking/mock-responses/feature-flags-mocks';
import { setupRemoteFeatureFlagsMock } from '../../api-mocking/helpers/remoteFeatureFlagsHelper';

const selectedRegion = RampsRegions[RampsRegionsEnum.UNITED_STATES];

const unifiedBuyV2Mocks = async (mockServer: Mockttp) => {
  await setupRemoteFeatureFlagsMock(
    mockServer,
    remoteFeatureFlagRampsUnifiedEnabled(true),
  );
  await setupRegionAwareOnRampMocks(mockServer, selectedRegion);
};

describe(SmokeRamps('Onramp Unified Buy'), () => {
  it('build quote', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder()
          .withNetworkController(CustomNetworks.Tenderly.Mainnet)
          .withRampsSelectedRegion(selectedRegion)
          .withMetaMetricsOptIn()
          .build(),
        restartDevice: true,
        testSpecificMock: unifiedBuyV2Mocks,
      },
      async () => {
        await loginToApp();
        await WalletView.tapWalletBuyButton();
        await FundActionMenu.tapUnifiedBuyButton();
        /*
        at the time of this code, the dev team is still working on hooking up the quotes logic
        as of now, you cannot (both manually and via e2e) go past the continue button
        there is an animated infinite spinner. And as a result detox is hanging here
        the disable sync allows detox to proceed without hang
        Once the code is completed, this should be removed and the test shall go past the continue button
        */
        await device.disableSynchronization();
        await TokenSelectScreen.tapTokenByName('ETH');
        await BuildQuoteView.tapKeypadDeleteButton(1);
        await BuildQuoteView.tapKeypadDeleteButton(1);

        await BuildQuoteView.enterAmount('5', 'unifiedBuy');

        await Assertions.expectTextDisplayed('$15.00');
      },
    );
  });
});
