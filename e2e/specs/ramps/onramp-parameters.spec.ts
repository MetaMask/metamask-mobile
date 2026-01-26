import { loginToApp } from '../../viewHelper';
import WalletView from '../../pages/wallet/WalletView';
import FundActionMenu from '../../pages/UI/FundActionMenu';
import FixtureBuilder from '../../../tests/framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../../tests/framework/fixtures/FixtureHelper';
import { CustomNetworks } from '../../../tests/resources/networks.e2e';
import { SmokeTrade } from '../../tags';
import Assertions from '../../../tests/framework/Assertions';
import BuildQuoteView from '../../pages/Ramps/BuildQuoteView';
import SelectCurrencyView from '../../pages/Ramps/SelectCurrencyView';
import TokenSelectBottomSheet from '../../pages/Ramps/TokenSelectBottomSheet';
import SelectRegionView from '../../pages/Ramps/SelectRegionView';
import SelectPaymentMethodView from '../../pages/Ramps/SelectPaymentMethodView';
import BuyGetStartedView from '../../pages/Ramps/BuyGetStartedView';
import { EventPayload, getEventsPayloads } from '../analytics/helpers';
import SoftAssert from '../../../tests/framework/SoftAssert';
import {
  RampsRegions,
  RampsRegionsEnum,
} from '../../../tests/framework/Constants';
import Matchers from '../../../tests/framework/Matchers';
import { Mockttp } from 'mockttp';
import { setupRegionAwareOnRampMocks } from '../../../tests/api-mocking/mock-responses/ramps/ramps-region-aware-mock-setup';

const eventsToCheck: EventPayload[] = [];

const setupOnRampTest = async (testFn: () => Promise<void>) => {
  const selectedRegion = RampsRegions[RampsRegionsEnum.SPAIN];

  await withFixtures(
    {
      fixture: new FixtureBuilder()
        .withNetworkController(CustomNetworks.Tenderly.Mainnet)
        .withRampsSelectedRegion(selectedRegion)
        .withMetaMetricsOptIn()
        .build(),
      restartDevice: true,
      testSpecificMock: async (mockServer: Mockttp) => {
        await setupRegionAwareOnRampMocks(mockServer, selectedRegion);
      },
      endTestfn: async ({ mockServer }) => {
        const events = await getEventsPayloads(mockServer);
        eventsToCheck.push(...events);
      },
    },
    async () => {
      await loginToApp();
      await WalletView.tapWalletBuyButton();
      await FundActionMenu.tapBuyButton();
      await BuyGetStartedView.tapGetStartedButton();
      await testFn();
    },
  );
};

describe.skip(SmokeTrade('On-Ramp Parameters'), () => {
  beforeEach(async () => {
    jest.setTimeout(150000);
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
      const paymentMethod = 'Apple Pay'; // This is now mocked so the dropdown will display the correct options even on Android
      await BuildQuoteView.tapPaymentMethodDropdown(paymentMethod);
      await SelectPaymentMethodView.tapPaymentMethodOption('Debit or Credit');
      await Assertions.expectElementToNotBeVisible(
        Matchers.getElementByText(paymentMethod),
      );
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
