import TestHelpers from '../../helpers';
import { loginToApp } from '../../flows/wallet.flow';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import { SmokeRamps } from '../../tags';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import BuildQuoteView from '../../page-objects/Ramps/BuildQuoteView';
import TokenSelectScreen from '../../page-objects/Ramps/TokenSelectScreen';

import { setupRegionAwareOnRampMocks } from '../../api-mocking/mock-responses/ramps/ramps-region-aware-mock-setup';
import { Mockttp } from 'mockttp';
import { RampsRegions, RampsRegionsEnum } from '../../framework/Constants';
import { remoteFeatureFlagRampsUnifiedEnabled } from '../../api-mocking/mock-responses/feature-flags-mocks';
import { setupRemoteFeatureFlagsMock } from '../../api-mocking/helpers/remoteFeatureFlagsHelper';
import Assertions from '../../framework/Assertions';

describe(SmokeRamps('OffRamps Deeplinks'), () => {
  beforeAll(async () => {
    await TestHelpers.reverseServerPort();
  });

  beforeEach(async () => {
    jest.setTimeout(150000);
  });

  it('deep link to sell mUSD on Linea', async () => {
    const sellDeepLinkURL = 'metamask://sell?chainId=1&amount=50';
    const selectedRegion = RampsRegions[RampsRegionsEnum.FRANCE];

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
          url: sellDeepLinkURL,
        });
        await BuildQuoteView.tapTokenDropdown('Ethereum');

        await TokenSelectScreen.tapTokenByName('mUSD');
        await Assertions.expectTextDisplayed('50 mUSD');
      },
    );
  });
});
