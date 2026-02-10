import { loginToApp } from '../../../e2e/viewHelper';
import WalletView from '../../../e2e/pages/wallet/WalletView';
import FundActionMenu from '../../../e2e/pages/UI/FundActionMenu';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import { CustomNetworks } from '../../resources/networks.e2e';
import { SmokeTrade } from '../../../e2e/tags';
import Assertions from '../../framework/Assertions';
import BuildQuoteView from '../../../e2e/pages/Ramps/BuildQuoteView';
import TokenSelectScreen from '../../../e2e/pages/Ramps/TokenSelectScreen';

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

describe(SmokeTrade('Onramp quote build screen'), () => {
  it('opens the buy flow', async () => {
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
