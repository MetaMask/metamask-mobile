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
import { getEventsPayloads , EventPayload } from '../../helpers/analytics/helpers';
import SoftAssert from '../../framework/SoftAssert';
import { RampsRegion } from '../../framework/types';
import { UnifiedRampRoutingType } from '../../../app/reducers/fiatOrders/types';

const selectedRegion = RampsRegions[RampsRegionsEnum.UNITED_STATES];

const unifiedBuyV2Mocks = async (mockServer: Mockttp) => {
  await setupRemoteFeatureFlagsMock(
    mockServer,
    remoteFeatureFlagRampsUnifiedEnabled(true),
  );
  await setupRegionAwareOnRampMocks(mockServer, selectedRegion);
};

const tokenToBuy = 'ETH';

const eventsToCheck: EventPayload[] = [];

const expectedEvents = {
  RampsButtonClicked: 'Ramps Button Clicked',
  RampsTokenSelected: 'Ramps Token Selected',
};

const expectedEventNames = [
  expectedEvents.RampsButtonClicked,
  expectedEvents.RampsTokenSelected,
];

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
        endTestfn: async ({ mockServer }) => {
          const events = await getEventsPayloads(
            mockServer,
            expectedEventNames,
          );
          eventsToCheck.push(...events);
        },
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
        await TokenSelectScreen.tapTokenByName(tokenToBuy);
        await BuildQuoteView.tapKeypadDeleteButton(1);
        await BuildQuoteView.tapKeypadDeleteButton(1);

        await BuildQuoteView.enterAmount('5', 'unifiedBuy');

        await Assertions.expectTextDisplayed('$15.00');
      },
    );
  });

  it('validates the segment events from the onramp unified buy test', async () => {
    const softAssert = new SoftAssert();
    for (const ev of expectedEventNames) {
      const event = eventsToCheck.find((event) => event.event === ev);
      await softAssert.checkAndCollect(
        async () => await Assertions.checkIfValueIsDefined(event),
        `${ev}: Should be defined`,
      );
    }

    // Ramps Button Clicked - Property checks
    const rampsButtonClicked = eventsToCheck.find(
      (event) => event.event === expectedEvents.RampsButtonClicked,
    );
    await softAssert.checkAndCollect(
      async () =>
        await Assertions.checkIfValueIsDefined(
          rampsButtonClicked?.properties.location,
        ),
      `Ramps Button Clicked: location should be defined`,
    );
    await softAssert.checkAndCollect(
      async () =>
        await Assertions.checkIfValueIsDefined(
          rampsButtonClicked?.properties.chain_id_destination,
        ),
      `Ramps Button Clicked: chain_id_destination should be defined`,
    );
    await softAssert.checkAndCollect(
      async () =>
        await Assertions.checkIfValueIsDefined(
          rampsButtonClicked?.properties.ramp_type,
        ),
      `Ramps Button Clicked: ramp_type should be defined`,
    );
    await softAssert.checkAndCollect(
      async () =>
        await Assertions.checkIfValueIsDefined(
          rampsButtonClicked?.properties.region,
        ),
      `Ramps Button Clicked: region should be defined`,
    );
    await softAssert.checkAndCollect(
      async () =>
        await Assertions.checkIfValueIsDefined(
          rampsButtonClicked?.properties.ramp_routing,
        ),
      `Ramps Button Clicked: ramp_routing should be defined`,
    );
    await softAssert.checkAndCollect(
      async () =>
        await Assertions.checkIfValueIsDefined(
          rampsButtonClicked?.properties.location === 'FundActionMenu',
        ),
      `Ramps Button Clicked: location should be FundActionMenu`,
    );
    await softAssert.checkAndCollect(
      async () =>
        await Assertions.checkIfValueIsDefined(
          rampsButtonClicked?.properties.ramp_type === 'UNIFIED_BUY',
        ),
      `Ramps Button Clicked: ramp_type should be UNIFIED_BUY`,
    );
    const rampsButtonClickedRegion = JSON.parse(
      rampsButtonClicked?.properties?.region as string,
    ) as RampsRegion;
    await softAssert.checkAndCollect(
      async () =>
        await Assertions.checkIfValueIsDefined(
          rampsButtonClickedRegion.id === selectedRegion.id &&
            rampsButtonClickedRegion.name === selectedRegion.name,
        ),
      `Ramps Button Clicked: region should be ${selectedRegion.name} and ${selectedRegion.id}`,
    );

    // Ramps Token Selected - Property checks
    const rampsTokenSelected = eventsToCheck.find(
      (event) => event.event === expectedEvents.RampsTokenSelected,
    );
    await softAssert.checkAndCollect(
      async () =>
        await Assertions.checkIfObjectHasKeysAndValidValues(
          rampsTokenSelected?.properties ?? {},
          {
            ramp_type: 'string',
            region: 'string',
            chain_id: 'string',
            currency_destination: 'string',
            currency_destination_symbol: 'string',
            currency_destination_network: 'string',
            currency_source: 'string',
            is_authenticated: 'boolean',
            token_caip19: 'string',
            token_symbol: 'string',
            ramp_routing: 'string',
          },
        ),
      `Ramps Token Selected: Should have the correct properties`,
    );

    const rampsTokenSelectedRegion = JSON.parse(
      rampsTokenSelected?.properties?.region as string,
    ) as RampsRegion;
    await softAssert.checkAndCollect(
      async () =>
        await Assertions.checkIfValueIsDefined(
          rampsTokenSelectedRegion.id === selectedRegion.id &&
            rampsTokenSelectedRegion.name === selectedRegion.name,
        ),
      `Ramps Token Selected: region should be ${selectedRegion.name} and ${selectedRegion.id}`,
    );

    await softAssert.checkAndCollect(
      async () =>
        await Assertions.checkIfValueIsDefined(
          rampsTokenSelected?.properties.token_symbol === tokenToBuy &&
            rampsTokenSelected?.properties.token_caip19 ===
              `eip155:1/slip44:60` &&
            rampsTokenSelected?.properties.currency_destination ===
              `eip155:1/slip44:60` &&
            rampsTokenSelected?.properties.currency_destination_symbol ===
              tokenToBuy &&
            rampsTokenSelected?.properties.currency_destination_network ===
              CustomNetworks.Tenderly.Mainnet.providerConfig.nickname &&
            rampsTokenSelected?.properties.ramp_routing ===
              UnifiedRampRoutingType.DEPOSIT,
        ),
      `Ramps Token Selected: token_symbol should be ${tokenToBuy}`,
    );

    softAssert.throwIfErrors();
  });
});
