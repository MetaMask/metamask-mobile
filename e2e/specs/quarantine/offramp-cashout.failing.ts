import { loginToApp } from '../../viewHelper';
import FixtureBuilder from '../../../tests/framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../../tests/framework/fixtures/FixtureHelper';
import { SmokeTrade } from '../../tags';
import BuildQuoteView from '../../pages/Ramps/BuildQuoteView';
import Assertions from '../../../tests/framework/Assertions';
import WalletView from '../../pages/wallet/WalletView';
import FundActionMenu from '../../pages/UI/FundActionMenu';
import SelectPaymentMethodView from '../../pages/Ramps/SelectPaymentMethodView';
import SellGetStartedView from '../../pages/Ramps/SellGetStartedView';
import {
  EventPayload,
  findEvent,
  getEventsPayloads,
} from '../../../tests/helpers/analytics/helpers.ts';
import SoftAssert from '../../../tests/framework/SoftAssert';
import {
  RampsRegions,
  RampsRegionsEnum,
} from '../../../tests/framework/Constants';
import { Mockttp } from 'mockttp';
import { setupRegionAwareOnRampMocks } from '../../../tests/api-mocking/mock-responses/ramps/ramps-region-aware-mock-setup';

const PaymentMethods = {
  SEPA_BANK_TRANSFER: 'SEPA Bank Transfer',
};
const expectedEvents = {
  OFFRAMP_PAYMENT_METHOD_SELECTED: 'Off-ramp Payment Method Selected',
};

/**
 * TODO:
 * Moving to quaratine since all tests are being skipped.
 * When this test is fixed we need to add a second shard to CI.
 */
describe.skip(SmokeTrade('Off-Ramp Cashout destination'), () => {
  const eventsToCheck: EventPayload[] = [];

  beforeEach(async () => {
    jest.setTimeout(150000);
  });

  it('should change cashout destination', async () => {
    const selectedRegion = RampsRegions[RampsRegionsEnum.FRANCE];
    await withFixtures(
      {
        fixture: new FixtureBuilder()
          .withRampsSelectedRegion(selectedRegion)
          .withRampsSelectedPaymentMethod()
          .withMetaMetricsOptIn()
          .build(),
        restartDevice: true,
        testSpecificMock: async (mockServer: Mockttp) => {
          await setupRegionAwareOnRampMocks(mockServer, selectedRegion);
        },
        endTestfn: async ({ mockServer }) => {
          const events = await getEventsPayloads(mockServer);
          const offRampPaymentMethodSelected = findEvent(
            events,
            expectedEvents.OFFRAMP_PAYMENT_METHOD_SELECTED,
          );
          if (offRampPaymentMethodSelected) {
            eventsToCheck.push(offRampPaymentMethodSelected);
          }
        },
      },
      async () => {
        await loginToApp();
        await WalletView.tapWalletBuyButton();
        await FundActionMenu.tapSellButton();
        await SellGetStartedView.tapGetStartedButton();
        await Assertions.expectTextNotDisplayed('SEPA Bank Transfer');
        await BuildQuoteView.tapPaymentMethodDropdown('Debit or Credit');
        await SelectPaymentMethodView.tapPaymentMethodOption(
          PaymentMethods.SEPA_BANK_TRANSFER,
        );
        await Assertions.expectTextDisplayed('SEPA Bank Transfer');
      },
    );
  });

  it('should validate segment/metametric events for a successful offramp flow (cashout)', async () => {
    const softAssert = new SoftAssert();

    const offRampPaymentMethodSelected = eventsToCheck.find(
      (event) => event.event === expectedEvents.OFFRAMP_PAYMENT_METHOD_SELECTED,
    );

    // Define assertion calls as variables
    const checkOffRampPaymentMethodDefined = softAssert.checkAndCollect(
      async () => {
        await Assertions.checkIfValueIsDefined(offRampPaymentMethodSelected);
      },
      'Off-ramp Payment Method Selected: Should be present',
    );

    // Only check properties if the event is defined
    const checkOffRampPaymentMethodProperties = offRampPaymentMethodSelected
      ? softAssert.checkAndCollect(async () => {
          Assertions.checkIfObjectHasKeysAndValidValues(
            offRampPaymentMethodSelected.properties,
            {
              payment_method_id: 'string',
              available_payment_method_ids: 'array',
              region: 'string',
              location: 'string',
            },
          );
        }, 'Off-ramp Payment Method Selected: Should have correct properties')
      : Promise.resolve();

    await Promise.all([
      checkOffRampPaymentMethodDefined,
      checkOffRampPaymentMethodProperties,
    ]);

    softAssert.throwIfErrors();
  });
});
