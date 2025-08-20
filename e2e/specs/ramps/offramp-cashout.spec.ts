import { loginToApp } from '../../viewHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import { SmokeTrade } from '../../tags';
import BuildQuoteView from '../../pages/Ramps/BuildQuoteView';
import Assertions from '../../framework/Assertions';
import WalletView from '../../pages/wallet/WalletView';
import FundActionMenu from '../../pages/UI/FundActionMenu';
import SelectPaymentMethodView from '../../pages/Ramps/SelectPaymentMethodView';
import SellGetStartedView from '../../pages/Ramps/SellGetStartedView';
import {
  EventPayload,
  findEvent,
  getEventsPayloads,
} from '../analytics/helpers';
import SoftAssert from '../../utils/SoftAssert';
import { RampsRegions, RampsRegionsEnum } from '../../framework/Constants';

const PaymentMethods = {
  SEPA_BANK_TRANSFER: 'SEPA Bank Transfer',
};
const expectedEvents = {
  OFFRAMP_PAYMENT_METHOD_SELECTED: 'Off-ramp Payment Method Selected',
};

describe(SmokeTrade('Off-Ramp Cashout destination'), () => {
  const eventsToCheck: EventPayload[] = [];

  beforeEach(async () => {
    jest.setTimeout(150000);
  });

  it('should change cashout destination', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder()
          .withRampsSelectedRegion(RampsRegions[RampsRegionsEnum.FRANCE])
          .withRampsSelectedPaymentMethod()
          .withMetaMetricsOptIn()
          .build(),
        restartDevice: true,
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
        await WalletView.tapWalletFundButton();
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
