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
import {
  setupDepositOnRampMocks,
  setupBuyOnRampMocks,
} from '../../api-mocking/mock-responses/ramps/ramps-mocks';
import { remoteFeatureFlagRampsUnifiedEnabled } from '../../api-mocking/mock-responses/feature-flags-mocks';
import { setupRemoteFeatureFlagsMock } from '../../api-mocking/helpers/remoteFeatureFlagsHelper';
import {
  getEventsPayloads,
  EventPayload,
} from '../../helpers/analytics/helpers';
import SoftAssert from '../../framework/SoftAssert';

import { UnifiedRampRoutingType } from '../../../app/reducers/fiatOrders/types';
import TabBarComponent from '../../page-objects/wallet/TabBarComponent';
import ActivitiesView from '../../page-objects/Transactions/ActivitiesView';
const selectedRegion = RampsRegions[RampsRegionsEnum.UNITED_STATES];

const newUserUnifiedBuyV2Mocks = async (mockServer: Mockttp) => {
  await setupRemoteFeatureFlagsMock(mockServer, {
    ...remoteFeatureFlagRampsUnifiedEnabled(true),
    depositConfig: {
      active: true,
      providerApiKey: 'DUMMY_VALUE_FOR_TESTING',
      entrypoints: { walletActions: true },
      minimumVersion: '1.0.0',
    },
  });
  await setupDepositOnRampMocks(mockServer, selectedRegion);
};

const returningUserUnifiedBuyV2Mocks = async (mockServer: Mockttp) => {
  await setupRemoteFeatureFlagsMock(
    mockServer,
    remoteFeatureFlagRampsUnifiedEnabled(true),
  );
  await setupBuyOnRampMocks(mockServer, selectedRegion);
};

// Deposit order mock (ramps-deposit-order-status-response) returns USD; UI shows $ + formatFiatValue
const nativeDepositOrder = {
  token: 'ETH',
  tokenAmount: '0.02455',
  totalFiat: '$100 USD',
  feesFiat: '$23.33 USD',
  quoteDisplayAmount: '100 USD',
  provider: 'Transak (Staging)',
};

const aggregatorBuyOrder = {
  token: 'ETH',
  tokenAmount: '0.00355',
  totalFiat: '$15 USD',
  feesFiat: '$3.5 USD',
  quoteDisplayAmount: '$15.00',
  provider: 'Transak (Staging)',
};

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
        await TokenSelectScreen.tapTokenByName(nativeDepositOrder.token);

        await BuildQuoteView.tapContinueButton();

        await KYCScreen.tapVerifyIdentityContinueButton();

        await KYCScreen.enterEmail('curtis@gmail.com');

        await Assertions.expectElementToBeVisible(KYCScreen.otpScreen, {
          description: 'OTP code screen is visible before entering code',
        });

        await KYCScreen.enterOtpCode('000000');

        // Verify order details screen
        await Assertions.expectElementToBeVisible(OrderDetailsView.container, {
          elemDescription: 'ramps order confirmation screen',
        });
        await Assertions.expectElementToHaveText(
          OrderDetailsView.tokenAmount,
          `${nativeDepositOrder.tokenAmount} ${nativeDepositOrder.token}`,
        );

        for (const text of [
          nativeDepositOrder.totalFiat,
          nativeDepositOrder.feesFiat,
        ]) {
          await Assertions.expectTextDisplayed(text);
        }

        await OrderDetailsView.tapCloseButton();

        // Verify order in transfers list
        await TabBarComponent.tapActivity();
        await ActivitiesView.tapOnTransfersTab();

        await Assertions.expectTextDisplayed(
          `${nativeDepositOrder.tokenAmount} ${nativeDepositOrder.token}`,
        );
        await ActivitiesView.tapRampsOrder('deposit', 1);

        for (const text of [
          `${nativeDepositOrder.tokenAmount} ${nativeDepositOrder.token}`,
          nativeDepositOrder.totalFiat,
        ]) {
          await Assertions.expectTextDisplayed(text);
        }
      },
    );
  });

  it('Returning User Aggregator Flow: Places ETH BUY order', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder()
          .withNetworkController(CustomNetworks.Tenderly.Mainnet)
          .withRampsSelectedRegion(selectedRegion)
          .withMetaMetricsOptIn()
          .build(),
        restartDevice: true,
        testSpecificMock: returningUserUnifiedBuyV2Mocks,
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
        await TokenSelectScreen.tapTokenByName(aggregatorBuyOrder.token);
        await BuildQuoteView.tapKeypadDeleteButton(1);
        await BuildQuoteView.tapKeypadDeleteButton(1);

        await BuildQuoteView.enterAmount('5', 'unifiedBuy');

        await BuildQuoteView.tapContinueButton();

        // Verify order details screen
        await Assertions.expectElementToBeVisible(OrderDetailsView.container, {
          elemDescription: 'ramps order confirmation screen',
        });
        await Assertions.expectElementToHaveText(
          OrderDetailsView.tokenAmount,
          `${aggregatorBuyOrder.tokenAmount} ${aggregatorBuyOrder.token}`,
        );

        for (const text of [
          aggregatorBuyOrder.totalFiat,
          aggregatorBuyOrder.feesFiat,
        ]) {
          await Assertions.expectTextDisplayed(text);
        }

        await OrderDetailsView.tapCloseButton();

        // Verify order in transfers list
        await TabBarComponent.tapActivity();
        await ActivitiesView.tapOnTransfersTab();

        await Assertions.expectTextDisplayed(
          `${aggregatorBuyOrder.tokenAmount} ${aggregatorBuyOrder.token}`,
        );
        await ActivitiesView.tapRampsOrder('buy', 1);

        for (const text of [
          `${aggregatorBuyOrder.tokenAmount} ${aggregatorBuyOrder.token}`,
          aggregatorBuyOrder.totalFiat,
        ]) {
          await Assertions.expectTextDisplayed(text);
        }
      },
    );
  });

  it('validates the segment events from the onramp unified buy test', async () => {
    const softAssert = new SoftAssert();
    for (const ev of expectedEventNames) {
      const event = eventsToCheck.find((e) => e.event === ev);
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
        await Assertions.checkIfObjectContains(
          rampsButtonClicked?.properties ?? {},
          { location: 'FundActionMenu' },
        ),
      `Ramps Button Clicked: location should be FundActionMenu`,
    );
    await softAssert.checkAndCollect(
      async () =>
        await Assertions.checkIfObjectContains(
          rampsButtonClicked?.properties ?? {},
          { ramp_type: 'UNIFIED_BUY_2' },
        ),
      `Ramps Button Clicked: ramp_type should be UNIFIED_BUY_2`,
    );
    const rampsButtonClickedRegion = rampsButtonClicked?.properties
      ?.region as string;
    // The region property is a plain string (e.g. "us-ca") matching the
    // geolocation endpoint response, not a JSON-serialized object.
    const expectedRegionId = selectedRegion.id.replace('/regions/', '');
    await softAssert.checkAndCollect(
      async () =>
        await Assertions.checkIfTextMatches(
          rampsButtonClickedRegion,
          expectedRegionId,
        ),
      `Ramps Button Clicked: region should be ${expectedRegionId}`,
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

    const rampsTokenSelectedRegionStr = rampsTokenSelected?.properties
      ?.region as string | undefined;
    const rampsTokenSelectedRegion = rampsTokenSelectedRegionStr
      ? (JSON.parse(rampsTokenSelectedRegionStr) as RampsRegion)
      : undefined;
    await softAssert.checkAndCollect(
      async () =>
        await Assertions.checkIfObjectContains(
          (rampsTokenSelectedRegion as unknown as Record<string, unknown>) ??
            {},
          { id: selectedRegion.id, name: selectedRegion.name },
        ),
      `Ramps Token Selected: region should be ${expectedRegionId}`,
    );

    await softAssert.checkAndCollect(
      async () =>
        await Assertions.checkIfObjectContains(
          rampsTokenSelected?.properties ?? {},
          {
            token_symbol: tokenToBuy,
            token_caip19: 'eip155:1/slip44:60',
            currency_destination: 'eip155:1/slip44:60',
            currency_destination_symbol: tokenToBuy,
            currency_destination_network:
              CustomNetworks.Tenderly.Mainnet.providerConfig.nickname,
            ramp_routing: UnifiedRampRoutingType.DEPOSIT,
          },
        ),
      `Ramps Token Selected: token_symbol should be ${tokenToBuy}`,
    );

    softAssert.throwIfErrors();
  });
});
