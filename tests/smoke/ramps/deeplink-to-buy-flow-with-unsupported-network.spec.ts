import TestHelpers from '../../helpers';
import { loginToApp } from '../../flows/wallet.flow';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import { SmokeRamps } from '../../tags';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import BuyGetStartedView from '../../page-objects/Ramps/BuyGetStartedView';
import Assertions from '../../framework/Assertions';
import NetworkAddedBottomSheet from '../../page-objects/Network/NetworkAddedBottomSheet';
import NetworkApprovalBottomSheet from '../../page-objects/Network/NetworkApprovalBottomSheet';
import NetworkEducationModal from '../../page-objects/Network/NetworkEducationModal';
import NetworkListModal from '../../page-objects/Network/NetworkListModal';
import { PopularNetworksList } from '../../resources/networks.e2e';
import { setupRegionAwareOnRampMocks } from '../../api-mocking/mock-responses/ramps/ramps-region-aware-mock-setup';
import { Mockttp } from 'mockttp';
import { RampsRegions, RampsRegionsEnum } from '../../framework/Constants';
import { remoteFeatureFlagRampsUnifiedEnabled } from '../../api-mocking/mock-responses/feature-flags-mocks';
import { setupRemoteFeatureFlagsMock } from '../../api-mocking/helpers/remoteFeatureFlagsHelper';

// This test was migrated to the new framework but should be reworked to use withFixtures properly
describe(SmokeRamps('Buy Crypto Deeplinks - Unsupported Network'), () => {
  beforeAll(async () => {
    await TestHelpers.reverseServerPort();
  });

  beforeEach(async () => {
    jest.setTimeout(150000);
  });

  it('should redirect to mainnet when deep linking to unsupported network', async () => {
    // chainId=2 is Expanse network which is not supported for buy
    const BuyDeepLink = 'metamask://buy?chainId=2';
    const selectedRegion = RampsRegions[RampsRegionsEnum.UNITED_STATES];

    await withFixtures(
      {
        fixture: new FixtureBuilder()
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

        await Assertions.expectElementToBeVisible(
          BuyGetStartedView.getStartedButton,
        );

        await BuyGetStartedView.tapGetStartedButton();

        // When unsupported network, should show "Unsupported buy Network"
        // and route back to mainnet (Ethereum)
        await Assertions.expectTextDisplayed('Unsupported buy Network');

        // After changing to a supported network, the error should disappear
        await NetworkListModal.changeNetworkTo(
          PopularNetworksList.Avalanche.providerConfig.nickname,
        );
        await NetworkApprovalBottomSheet.tapApproveButton();
        await NetworkAddedBottomSheet.tapCloseButton();
        await Assertions.expectElementToBeVisible(
          NetworkEducationModal.container,
        );
        await NetworkEducationModal.tapGotItButton();
        await Assertions.expectTextNotDisplayed('Unsupported buy Network');
        await Assertions.expectTextDisplayed('Avalanche');
      },
    );
  });
});
