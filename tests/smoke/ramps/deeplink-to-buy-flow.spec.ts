import TestHelpers from '../../helpers';
import { loginToApp } from '../../flows/wallet.flow';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import { SmokeRamps } from '../../tags';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import BuildQuoteView from '../../page-objects/Ramps/BuildQuoteView';
import TokenSelectScreen from '../../page-objects/Ramps/TokenSelectScreen';

import Assertions from '../../framework/Assertions';
import { setupRegionAwareOnRampMocks } from '../../api-mocking/mock-responses/ramps/ramps-mocks';
import { Mockttp } from 'mockttp';
import { RampsRegions, RampsRegionsEnum } from '../../framework/Constants';
import { remoteFeatureFlagRampsUnifiedMatrixForE2E } from '../../api-mocking/mock-responses/feature-flags-mocks';
import { setupRemoteFeatureFlagsMock } from '../../api-mocking/helpers/remoteFeatureFlagsHelper';

const BASE_USDC_BUY_DEEPLINK =
  'metamask://buy?chainId=8453&address=0x833589fcd6edb6e08f4c7c32d4f71b54bda02913&amount=25';

// This test was migrated to the new framework but should be reworked to use withFixtures properly
describe(SmokeRamps('Buy Crypto Deeplinks'), () => {
  beforeAll(async () => {
    await TestHelpers.reverseServerPort();
  });

  beforeEach(async () => {
    jest.setTimeout(150000);
  });
  it('Deep links to onramp ETH', async () => {
    const buyLink = 'metamask://buy?chainId=1&amount=275';
    const selectedRegion = RampsRegions[RampsRegionsEnum.UNITED_STATES];

    await withFixtures(
      {
        fixture: new FixtureBuilder()
          .withRampsUnifiedBuyRemoteFlagsSeededForE2E({
            rampsUnifiedBuyV1: true,
            rampsUnifiedBuyV2: false,
          })
          .withRampsSelectedPaymentMethod()
          .withRampsSelectedRegion(selectedRegion)
          .build(),
        testSpecificMock: async (mockServer: Mockttp) => {
          await setupRemoteFeatureFlagsMock(
            mockServer,
            remoteFeatureFlagRampsUnifiedMatrixForE2E(true, false),
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
  it('Deep links to onramp on Base network', async () => {
    const selectedRegion = RampsRegions[RampsRegionsEnum.UNITED_STATES];

    await withFixtures(
      {
        fixture: new FixtureBuilder()
          .withRampsUnifiedBuyRemoteFlagsSeededForE2E({
            rampsUnifiedBuyV1: true,
            rampsUnifiedBuyV2: false,
          })
          .withPopularNetworks()
          .withRampsSelectedRegion(selectedRegion)
          .withRampsSelectedPaymentMethod()
          .build(),
        testSpecificMock: async (mockServer: Mockttp) => {
          await setupRemoteFeatureFlagsMock(
            mockServer,
            remoteFeatureFlagRampsUnifiedMatrixForE2E(true, false),
          );
          await setupRegionAwareOnRampMocks(mockServer, selectedRegion);
        },
        restartDevice: true,
      },
      async () => {
        await loginToApp();
        await device.sendToHome();
        await device.launchApp({
          url: BASE_USDC_BUY_DEEPLINK,
        });
        await Assertions.expectTextDisplayed('USD Coin');
      },
    );
  });

  // TODO: Uncomment once we have the tests passing according to the UI/UX
  describe.skip('Buy deeplink ramps unified V1/V2 flag matrix (Base USDC)', () => {
    const selectedRegion = RampsRegions[RampsRegionsEnum.UNITED_STATES];

    it('Deep links when unified V1 on and V2 off', async () => {
      await withFixtures(
        {
          fixture: new FixtureBuilder()
            .withRampsUnifiedBuyRemoteFlagsSeededForE2E({
              rampsUnifiedBuyV1: true,
              rampsUnifiedBuyV2: false,
            })
            .withPopularNetworks()
            .withRampsSelectedRegion(selectedRegion)
            .withRampsSelectedPaymentMethod()
            .build(),
          testSpecificMock: async (mockServer: Mockttp) => {
            await setupRemoteFeatureFlagsMock(
              mockServer,
              remoteFeatureFlagRampsUnifiedMatrixForE2E(true, false),
            );
            await setupRegionAwareOnRampMocks(mockServer, selectedRegion);
          },
          restartDevice: true,
        },
        async () => {
          await loginToApp();
          await device.sendToHome();
          await device.launchApp({ url: BASE_USDC_BUY_DEEPLINK });
          await Assertions.expectTextDisplayed('USD Coin');
        },
      );
    });

    it('Deep links when unified V1 off and V2 on', async () => {
      await withFixtures(
        {
          fixture: new FixtureBuilder()
            .withRampsUnifiedBuyRemoteFlagsSeededForE2E({
              rampsUnifiedBuyV1: false,
              rampsUnifiedBuyV2: true,
            })
            .withPopularNetworks()
            .withRampsSelectedRegion(selectedRegion)
            .withRampsSelectedPaymentMethod()
            .build(),
          testSpecificMock: async (mockServer: Mockttp) => {
            await setupRemoteFeatureFlagsMock(
              mockServer,
              remoteFeatureFlagRampsUnifiedMatrixForE2E(false, true),
            );
            await setupRegionAwareOnRampMocks(mockServer, selectedRegion);
          },
          restartDevice: true,
        },
        async () => {
          await loginToApp();
          await device.sendToHome();
          await device.launchApp({ url: BASE_USDC_BUY_DEEPLINK });
          await Assertions.expectTextDisplayed('USDC');
        },
      );
    });

    it('Deep links when unified V1 off and V2 off', async () => {
      await withFixtures(
        {
          fixture: new FixtureBuilder()
            .withRampsUnifiedBuyRemoteFlagsSeededForE2E({
              rampsUnifiedBuyV1: false,
              rampsUnifiedBuyV2: false,
            })
            .withPopularNetworks()
            .withRampsSelectedRegion(selectedRegion)
            .withRampsSelectedPaymentMethod()
            .build(),
          testSpecificMock: async (mockServer: Mockttp) => {
            await setupRemoteFeatureFlagsMock(
              mockServer,
              remoteFeatureFlagRampsUnifiedMatrixForE2E(false, false),
            );
            await setupRegionAwareOnRampMocks(mockServer, selectedRegion);
          },
          restartDevice: true,
        },
        async () => {
          await loginToApp();
          await device.sendToHome();
          await device.launchApp({ url: BASE_USDC_BUY_DEEPLINK });
          await Assertions.expectTextDisplayed('USD Coin');
        },
      );
    });
  });
});
