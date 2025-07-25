'use strict';
import { loginToApp } from '../../viewHelper';
import FixtureBuilder from '../../fixtures/fixture-builder';
import { withFixtures } from '../../fixtures/fixture-helper';
import TestHelpers from '../../helpers';
import { SmokeTrade } from '../../tags';
import BuildQuoteView from '../../pages/Ramps/BuildQuoteView';
import Assertions from '../../utils/Assertions';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import WalletActionsBottomSheet from '../../pages/wallet/WalletActionsBottomSheet';
import SelectPaymentMethodView from '../../pages/Ramps/SelectPaymentMethodView';
import SellGetStartedView from '../../pages/Ramps/SellGetStartedView';
import { startMockServer, stopMockServer } from '../../api-mocking/mock-server';
import { getMockServerPort } from '../../fixtures/utils';
import { mockEvents } from '../../api-mocking/mock-config/mock-events';
import { getEventsPayloads } from '../analytics/helpers';
import SoftAssert from '../../utils/SoftAssert';

const PaymentMethods = {
  SEPA_BANK_TRANSFER: 'SEPA Bank Transfer',
};

let mockServer;
let mockServerPort;

describe(SmokeTrade('Off-Ramp Cashout destination'), () => {
  beforeAll(async () => {
    const segmentMock = {
      POST: [mockEvents.POST.segmentTrack],
    };

    mockServerPort = getMockServerPort();
    mockServer = await startMockServer(segmentMock, mockServerPort);
    await TestHelpers.reverseServerPort();
  });

  beforeEach(async () => {
    jest.setTimeout(150000);
  });

  afterAll(async () => {
    await stopMockServer(mockServer);
  });

  it('should change cashout destination', async () => {
    const franceRegion = {
      currencies: ['/currencies/fiat/eur'],
      emoji: '🇫🇷',
      id: '/regions/fr',
      name: 'France',
      support: { buy: true, sell: true, recurringBuy: true },
      unsupported: false,
      recommended: false,
      detected: false,
    };
    await withFixtures(
      {
        fixture: new FixtureBuilder()
          .withRampsSelectedRegion(franceRegion)
          .withRampsSelectedPaymentMethod()
          .withMetaMetricsOptIn()
          .build(),
        restartDevice: true,
        launchArgs: {
          mockServerPort,
        },
      },
      async () => {
        await loginToApp();
        await TabBarComponent.tapActions();
        await WalletActionsBottomSheet.tapSellButton();
        await SellGetStartedView.tapGetStartedButton();
        await Assertions.checkIfTextIsNotDisplayed('SEPA Bank Transfer');
        await BuildQuoteView.tapPaymentMethodDropdown('Debit or Credit');
        await SelectPaymentMethodView.tapPaymentMethodOption(
          PaymentMethods.SEPA_BANK_TRANSFER,
        );
        await Assertions.checkIfTextIsDisplayed('SEPA Bank Transfer');
      },
    );
  });

  it('should validate segment/metametric events for a successful offramp flow (cashout)', async () => {
    const expectedEvents = {
      OFFRAMP_PAYMENT_METHOD_SELECTED: 'Off-ramp Payment Method Selected',
    };
    const events = await getEventsPayloads(mockServer);

    const softAssert = new SoftAssert();

    const offRampPaymentMethodSelected = events.find(
      (event) => event.event === expectedEvents.OFFRAMP_PAYMENT_METHOD_SELECTED,
    );

    // Define assertion calls as variables
    const checkOffRampPaymentMethodDefined = softAssert.checkAndCollect(
      async () => {
        await Assertions.checkIfValueIsDefined(offRampPaymentMethodSelected);
      },
      'Off-ramp Payment Method Selected: Should be present',
    );

    const checkOffRampPaymentMethodProperties = softAssert.checkAndCollect(
      async () => {
        Assertions.checkIfObjectHasKeysAndValidValues(
          offRampPaymentMethodSelected.properties,
          {
            payment_method_id: 'string',
            available_payment_method_ids: 'array',
            region: 'string',
            location: 'string',
          },
        );
      },
      'Off-ramp Payment Method Selected: Should have correct properties',
    );

    await Promise.all([
      checkOffRampPaymentMethodDefined,
      checkOffRampPaymentMethodProperties,
    ]);

    softAssert.throwIfErrors();
  });
});
