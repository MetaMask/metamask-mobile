import TestHelpers from '../../helpers';
import { loginToApp } from '../../flows/wallet.flow';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import { SmokeRamps } from '../../tags';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import BuildQuoteView from '../../page-objects/Ramps/BuildQuoteView';
import TokenSelectScreen from '../../page-objects/Ramps/TokenSelectScreen';

import Assertions from '../../framework/Assertions';
import { setupRegionAwareOnRampMocks } from '../../api-mocking/mock-responses/ramps/ramps-region-aware-mock-setup';
import { Mockttp } from 'mockttp';
import { RampsRegions, RampsRegionsEnum } from '../../framework/Constants';
import { remoteFeatureFlagRampsUnifiedEnabled } from '../../api-mocking/mock-responses/feature-flags-mocks';
import { setupRemoteFeatureFlagsMock } from '../../api-mocking/helpers/remoteFeatureFlagsHelper';

// This test was migrated to the new framework but should be reworked to use withFixtures properly
describe(SmokeRamps('Buy Crypto Deeplinks'), () => {
  beforeAll(async () => {
    await TestHelpers.reverseServerPort();
  });

  beforeEach(async () => {
    jest.setTimeout(150000);
  });
  it('should deep link to onramp ETH', async () => {
    const buyLink = 'metamask://buy?chainId=1&amount=275';
    const selectedRegion = RampsRegions[RampsRegionsEnum.UNITED_STATES];

    await withFixtures(
      {
        fixture: new FixtureBuilder()
          .withRampsSelectedPaymentMethod()
          .withRampsSelectedRegion(selectedRegion)
          .build(),
        testSpecificMock: async (mockServer: Mockttp) => {
          await setupRemoteFeatureFlagsMock(
            mockServer,
            remoteFeatureFlagRampsUnifiedEnabled(true),
          );
          await setupRegionAwareOnRampMocks(mockServer, selectedRegion);
        },
        restartDevice: true,
      },
      async () => {
        await loginToApp();
        await device.sendToHome();
        await device.launchApp({
          url: buyLink,
        });
        await BuildQuoteView.tapTokenDropdown('Ethereum');

        await TokenSelectScreen.tapTokenByName('DAI');
        await Assertions.expectTextDisplayed('Dai Stablecoin');
        await Assertions.expectTextDisplayed('$275');
        await Assertions.expectTextDisplayed('USD');
      },
    );
  });
  it('should deep link to onramp on Base network', async () => {
    const BuyDeepLink =
      'metamask://buy?chainId=8453&address=0x833589fcd6edb6e08f4c7c32d4f71b54bda02913&amount=25';
    const selectedRegion = RampsRegions[RampsRegionsEnum.UNITED_STATES];

    await withFixtures(
      {
        fixture: new FixtureBuilder()
          .withPopularNetworks()
          .withRampsSelectedRegion(selectedRegion)
          .withRampsSelectedPaymentMethod()
          .build(),
        testSpecificMock: async (mockServer: Mockttp) => {
          await setupRemoteFeatureFlagsMock(
            mockServer,
            remoteFeatureFlagRampsUnifiedEnabled(true),
          );
          await setupRegionAwareOnRampMocks(mockServer, selectedRegion);
        },
        restartDevice: true,
      },
      async () => {
        await loginToApp();
        await device.sendToHome();
        await device.launchApp({
          url: BuyDeepLink,
        });
        await Assertions.expectTextDisplayed('USD Coin');
      },
    );
  });
});
