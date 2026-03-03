import { SmokeNetworkAbstractions } from '../../../tags';
import WalletView from '../../../page-objects/wallet/WalletView';
import Assertions from '../../../framework/Assertions';
import { withFixtures } from '../../../framework/fixtures/FixtureHelper';
import FixtureBuilder from '../../../framework/fixtures/FixtureBuilder';
import { loginToApp } from '../../../flows/wallet.flow';
import { Mockttp } from 'mockttp';
import { setupMockRequest } from '../../../api-mocking/helpers/mockHelpers';
import { setupRemoteFeatureFlagsMock } from '../../../api-mocking/helpers/remoteFeatureFlagsHelper';
import { remoteFeatureFlagHomepageSectionsV1Enabled } from '../../../api-mocking/mock-responses/feature-flags-mocks';
import { defiPositionsWithData } from '../../../api-mocking/mock-responses/defi-api-mocks';
import DefiView from '../../../page-objects/wallet/DefiView';
import DefiPositionView from '../../../page-objects/wallet/DefiPositionView';

describe(SmokeNetworkAbstractions('View DeFi details'), () => {
  it('open the Aave V3 position details', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().withPopularNetworks().build(),
        restartDevice: true,
        testSpecificMock: async (mockServer: Mockttp) => {
          await setupRemoteFeatureFlagsMock(
            mockServer,
            remoteFeatureFlagHomepageSectionsV1Enabled(),
          );

          const { urlEndpoint, response } = defiPositionsWithData;
          await setupMockRequest(mockServer, {
            requestMethod: 'GET',
            url: urlEndpoint,
            response,
            responseCode: 200,
          });
        },
        languageAndLocale: {
          language: 'en',
          locale: 'en_US',
        },
      },
      async () => {
        await loginToApp();
        // await Assertions.expectElementToBeVisible(WalletView.defiPositionsNew);

        await WalletView.scrollAndTapDefiSection();
        await Assertions.expectTextDisplayed('Aave V3');
        await Assertions.expectTextDisplayed('$14.74');
        await Assertions.expectTextDisplayed('WETH +1 other');
        await Assertions.expectTextDisplayed('Uniswap V3');
        await Assertions.expectTextDisplayed('$8.48');
        await Assertions.expectTextDisplayed('WETH +1 other');
        await Assertions.expectTextDisplayed('Uniswap V2');
        await Assertions.expectTextDisplayed('$4.24');
        await Assertions.expectTextDisplayed('USDC +1 other');
        await Assertions.expectTextDisplayed('Aave V2');
        await Assertions.expectTextDisplayed('$0.33');
        await Assertions.expectTextDisplayed('USDC +1 other');
        await DefiView.checkContainerIsDisplayed();
        await Assertions.expectTextDisplayed('Aave V3');
        await Assertions.expectTextDisplayed('$14.74');
        await Assertions.expectTextDisplayed('WETH +1 other');
        await Assertions.expectTextDisplayed('Uniswap V3');
        await Assertions.expectTextDisplayed('$8.48');
        await Assertions.expectTextDisplayed('WETH +1 other');
        await Assertions.expectTextDisplayed('Uniswap V2');
        await Assertions.expectTextDisplayed('$4.24');
        await Assertions.expectTextDisplayed('USDC +1 other');
        await Assertions.expectTextDisplayed('Aave V2');
        await Assertions.expectTextDisplayed('$0.33');
        await Assertions.expectTextDisplayed('USDC +1 other');
        await WalletView.tapOnDeFiPosition('Aave V3');
        await DefiPositionView.checkContainersIsDisplayed();
        await Assertions.expectTextDisplayed('Supplied');
        await Assertions.expectTextDisplayed('USDT');
        await Assertions.expectTextDisplayed('WETH');
        await Assertions.expectTextDisplayed('$14.74');
        await Assertions.expectTextDisplayed('$0.30');
      },
    );
  });
});
