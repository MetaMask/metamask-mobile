import { loginToApp } from '../../viewHelper';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import WalletActionsBottomSheet from '../../pages/wallet/WalletActionsBottomSheet';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import { CustomNetworks } from '../../resources/networks.e2e';
import { SmokeTrade } from '../../tags';
import Assertions from '../../framework/Assertions';
import BuildQuoteView from '../../pages/Ramps/BuildQuoteView';
import SelectCurrencyView from '../../pages/Ramps/SelectCurrencyView';
import TokenSelectBottomSheet from '../../pages/Ramps/TokenSelectBottomSheet';
import SelectRegionView from '../../pages/Ramps/SelectRegionView';
import SelectPaymentMethodView from '../../pages/Ramps/SelectPaymentMethodView';
import BuyGetStartedView from '../../pages/Ramps/BuyGetStartedView';
import { startMockServer, stopMockServer } from '../../api-mocking/mock-server';
import { getMockServerPort } from '../../framework/fixtures/FixtureUtils';
import { mockEvents } from '../../api-mocking/mock-config/mock-events';
import { EventPayload, getEventsPayloads } from '../analytics/helpers';
import SoftAssert from '../../utils/SoftAssert';
import { RampsRegions, RampsRegionsEnum } from '../../framework/Constants';
import { Mockttp } from 'mockttp';

let mockServer: Mockttp;
let mockServerPort: number;
const eventsToCheck: EventPayload[] = [];

const setupOnRampTest = async (testFn: () => Promise<void>) => {
  await withFixtures(
    {
      fixture: new FixtureBuilder()
        .withNetworkController(CustomNetworks.Tenderly.Mainnet)
        .withRampsSelectedRegion(RampsRegions[RampsRegionsEnum.UNITED_STATES])
        .withMetaMetricsOptIn()
        .build(),
      mockServerInstance: mockServer,
      restartDevice: true,
      endTestfn: async ({ mockServer: mockServerInstance }) => {
        const events = await getEventsPayloads(mockServerInstance);
        eventsToCheck.push(...events);
      },
    },
    async () => {
      await loginToApp();
      await TabBarComponent.tapActions();
      await WalletActionsBottomSheet.tapBuyButton();
      await BuyGetStartedView.tapGetStartedButton();
      await testFn();
    },
  );
};

const segmentMock = {
  POST: [mockEvents.POST.segmentTrack],
};

describe(SmokeTrade('On-Ramp Parameters'), () => {
  beforeEach(async () => {
    jest.setTimeout(150000);
    mockServerPort = getMockServerPort();
    mockServer = await startMockServer(segmentMock, mockServerPort);
  });

  // We need to manually stop the mock server after all the tests as each test
  // will create a new instance of the mockServer and the segment validation
  // does not require the app to be launched
  afterAll(async () => {
    if (mockServer) {
      await stopMockServer(mockServer);
    }
  });

  it('should select currency and verify display', async () => {
    await setupOnRampTest(async () => {
      await BuildQuoteView.tapCurrencySelector();
      await SelectCurrencyView.tapCurrencyOption('Euro');
      await Assertions.expectTextDisplayed('€0');
      await Assertions.expectTextNotDisplayed('$0');
    });
  });

  it('should select token and verify display', async () => {
    await setupOnRampTest(async () => {
      await BuildQuoteView.tapTokenDropdown('Ethereum');
      await TokenSelectBottomSheet.tapTokenByName('DAI');
      await Assertions.expectTextDisplayed('Dai Stablecoin');
    });
  });

  it('should select region and verify display', async () => {
    await setupOnRampTest(async () => {
      await BuildQuoteView.tapRegionSelector();
      await SelectRegionView.tapRegionOption('Spain');
      await Assertions.expectTextNotDisplayed('🇺🇸');
      await Assertions.expectTextDisplayed('🇪🇸');
    });
  });

  it('should select payment method and verify display', async () => {
    await setupOnRampTest(async () => {
      const paymentMethod =
        device.getPlatform() === 'ios' ? 'Apple Pay' : 'Google Pay';
      await BuildQuoteView.tapPaymentMethodDropdown(paymentMethod);
      await SelectPaymentMethodView.tapPaymentMethodOption('Debit or Credit');
      await Assertions.expectTextNotDisplayed(paymentMethod);
      await Assertions.expectTextDisplayed('Debit or Credit');
    });
  });

  it('should validate segment/metametric events for a successful onramp flow (parameters)', async () => {
    const expectedEvents = {
      RAMPS_REGION_SELECTED: 'Ramp Region Selected',
      ONRAMP_PAYMENT_METHOD_SELECTED: 'On-ramp Payment Method Selected',
    };

    const softAssert = new SoftAssert();

    const rampRegionSelected = eventsToCheck.find(
      (event) => event.event === expectedEvents.RAMPS_REGION_SELECTED,
    );
    const onRampPaymentMethodSelected = eventsToCheck.find(
      (event) => event.event === expectedEvents.ONRAMP_PAYMENT_METHOD_SELECTED,
    );

    const checkRampRegionSelectedDefined = softAssert.checkAndCollect(
      async () => {
        await Assertions.checkIfValueIsDefined(rampRegionSelected);
      },
      'Ramp Region Selected: Should be present',
    );

    const checkRampRegionSelectedProperties = softAssert.checkAndCollect(
      async () => {
        await Assertions.checkIfObjectHasKeysAndValidValues(
          rampRegionSelected?.properties ?? {},
          {
            is_unsupported_onramp: 'boolean',
            is_unsupported_offramp: 'boolean',
            country_id: 'string',
            state_id: 'string',
            location: 'string',
          },
        );
      },
      'Ramp Region Selected: Should have correct properties',
    );

    const checkOnRampPaymentMethodSelectedDefined = softAssert.checkAndCollect(
      async () => {
        await Assertions.checkIfValueIsDefined(onRampPaymentMethodSelected);
      },
      'On-ramp Payment Method Selected: Should be present',
    );

    const checkOnRampPaymentMethodSelectedProperties =
      softAssert.checkAndCollect(async () => {
        await Assertions.checkIfObjectHasKeysAndValidValues(
          onRampPaymentMethodSelected?.properties ?? {},
          {
            payment_method_id: 'string',
            available_payment_method_ids: 'array',
            region: 'string',
            location: 'string',
          },
        );
      }, 'On-ramp Payment Method Selected: Should have correct properties');

    await Promise.all([
      checkRampRegionSelectedDefined,
      checkRampRegionSelectedProperties,
      checkOnRampPaymentMethodSelectedDefined,
      checkOnRampPaymentMethodSelectedProperties,
    ]);

    softAssert.throwIfErrors();
  });
});
