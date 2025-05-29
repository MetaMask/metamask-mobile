'use strict';
import { loginToApp } from '../../viewHelper';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import WalletActionsBottomSheet from '../../pages/wallet/WalletActionsBottomSheet';
import FixtureBuilder from '../../fixtures/fixture-builder';
import { CustomNetworks } from '../../resources/networks.e2e';
import TestHelpers from '../../helpers';
import { SmokeTrade } from '../../tags';
import Assertions from '../../utils/Assertions';
import BuildQuoteView from '../../pages/Ramps/BuildQuoteView';
import BuyGetStartedView from '../../pages/Ramps/BuyGetStartedView';
import QuotesView from '../../pages/Ramps/QuotesView';
import { withFixtures } from '../../fixtures/fixture-helper';
import { mockEvents } from '../../api-mocking/mock-config/mock-events';
import { getEventsPayloads } from '../analytics/helpers';
import { startMockServer, stopMockServer } from '../../api-mocking/mock-server';
import { getMockServerPort } from '../../fixtures/utils';
import SoftAssert from '../../utils/SoftAssert';

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

let mockServer;
let mockServerPort;

const setupOnRampTest = async (testFn) => {

  await withFixtures(
    {
      fixture: new FixtureBuilder()
        .withNetworkController(CustomNetworks.Tenderly.Mainnet)
        .withRampsSelectedRegion(franceRegion)
        .withMetaMetricsOptIn()
        .build(),
      restartDevice: true,
      launchArgs: {
        mockServerPort,
        sendMetaMetricsinE2E: true,
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

describe(SmokeTrade('Onramp quote build screen'), () => {
  beforeAll(async () => {
    const segmentMock = {
      POST: [mockEvents.POST.segmentTrack],
    };

    mockServerPort = getMockServerPort();
    mockServer = await startMockServer(segmentMock, mockServerPort);
    await TestHelpers.reverseServerPort();
  });

  afterAll(async () => {
    await stopMockServer(mockServer);
  });

  beforeEach(async () => {
    jest.setTimeout(150000);
  });

  it('should get to the Amount to buy screen, after selecting Get Started', async () => {
    await setupOnRampTest(async () => {
      await Assertions.checkIfVisible(BuildQuoteView.amountToBuyLabel);
      await Assertions.checkIfVisible(BuildQuoteView.getQuotesButton);
      await BuildQuoteView.tapCancelButton();
    });
  });

  it('should skip to the Amount to buy screen for returning user', async () => {
    await TabBarComponent.tapActions();
    await WalletActionsBottomSheet.tapBuyButton();
    await Assertions.checkIfVisible(BuildQuoteView.amountToBuyLabel);
    await Assertions.checkIfVisible(BuildQuoteView.getQuotesButton);
  });

  it('should enter amount and show quotes', async () => {
    await setupOnRampTest(async () => {
      await BuildQuoteView.enterAmount('100');
      await BuildQuoteView.tapGetQuotesButton();
      await Assertions.checkIfVisible(QuotesView.quotes);
    });
  });

  it('should validate segment/metametric events for a successful onramp flow', async () => {
    const expectedEvents = {
      BUY_BUTTON_CLICKED: 'Buy Button Clicked',
      ONRAMP_GET_STARTED_CLICKED: 'On-ramp Get Started Clicked',
      ONRAMP_CANCELED: 'On-ramp Canceled',
      ONRAMP_QUOTES_REQUESTED: 'On-ramp Quotes Requested',
      ONRAMP_QUOTES_RECEIVED: 'On-ramp Quotes Received',
      ONRAMP_QUOTE_ERROR: 'On-ramp Quote Error',
    };

    const softAssert = new SoftAssert();
    const events = await getEventsPayloads(mockServer, [
      expectedEvents.BUY_BUTTON_CLICKED,
      expectedEvents.ONRAMP_CANCELED,
      expectedEvents.ONRAMP_GET_STARTED_CLICKED,
      expectedEvents.ONRAMP_QUOTES_REQUESTED,
      expectedEvents.ONRAMP_QUOTES_RECEIVED,
      expectedEvents.ONRAMP_QUOTE_ERROR,
    ]);

    const buyButtonClicked = events.find((event) => event.event === expectedEvents.BUY_BUTTON_CLICKED);
    await softAssert.checkAndCollect(async () => {
      await Assertions.checkIfValueIsPresent(buyButtonClicked);
    }, 'Buy Button Clicked: Should be present');

    const onRampGetStartedClicked = events.find((event) => event.event === expectedEvents.ONRAMP_GET_STARTED_CLICKED);
    await softAssert.checkAndCollect(async () => {
      await Assertions.checkIfValueIsPresent(onRampGetStartedClicked);
    });
    await softAssert.checkAndCollect(async () => {
      await Assertions.checkIfObjectContains(onRampGetStartedClicked.properties, {
        text: 'Get Started',
        location: 'Get Started Screen',
      });
    }, 'On-ramp Get Started Clicked: Should be present');

    const onRampCanceled = events.find((event) => event.event === expectedEvents.ONRAMP_CANCELED);
    await softAssert.checkAndCollect(async () => {
      await Assertions.checkIfValueIsPresent(onRampCanceled);
    }, 'On-ramp Canceled: Should be present');
    await softAssert.checkAndCollect(async () => {
      await Assertions.checkIfObjectContains(onRampCanceled.properties, {
        location: 'Amount to Buy Screen',
        chain_id_destination: '1',
      });
    }, 'On-ramp Canceled: Should have correct properties');

    const onRampQuotesRequested = events.find((event) => event.event === expectedEvents.ONRAMP_QUOTES_REQUESTED);
    await softAssert.checkAndCollect(async () => {
      await Assertions.checkIfValueIsPresent(onRampQuotesRequested);
    }, 'On-ramp Quotes Requested: Should be present');
    await softAssert.checkAndCollect(async () => {
      await Assertions.checkIfObjectHasKeysAndValidValues(onRampQuotesRequested.properties, {
        amount: 'number',
        payment_method_id: 'string',
        location: 'string',
        currency_source: 'string',
        currency_destination: 'string',
        chain_id_destination: 'string',
      });
    }, 'On-ramp Quotes Requested: Should have correct properties');

    const onRampQuotesReceived = events.find((event) => event.event === expectedEvents.ONRAMP_QUOTES_RECEIVED);
    await softAssert.checkAndCollect(async () => {
      await Assertions.checkIfValueIsPresent(onRampQuotesReceived);
    }, 'On-ramp Quotes Received: Should be present');
    await softAssert.checkAndCollect(async () => {
      await Assertions.checkIfObjectHasKeysAndValidValues(onRampQuotesReceived.properties, {
        amount: 'number',
        payment_method_id: 'string',
        refresh_count: 'number',
        results_count: 'number',
        average_total_fee: 'number',
        average_gas_fee: 'number',
        average_processing_fee: 'number',
        average_total_fee_of_amount: 'number',
        quotes_amount_list: 'array',
        quotes_amount_first: 'number',
        quotes_amount_last: 'number',
        currency_source: 'string',
        currency_destination: 'string',
        average_crypto_out: 'number',
        chain_id_destination: 'string',
        provider_onramp_list: 'array',
        provider_onramp_first: 'string',
        provider_onramp_last: 'string',
        provider_onramp_most_reliable: 'string',
        provider_onramp_best_price: 'string',
      });
    }, 'On-ramp Quotes Received: Should have correct properties');

    // !!IMPORTANT!!
    // This event is currently being triggered given the current status of the onramp e2e flow.
    // It should be removed once the onramp e2e flow is fixed.
    const onRampQuoteError = events.find((event) => event.event === expectedEvents.ONRAMP_QUOTE_ERROR);
    softAssert.checkAndCollect(async () => {
      await Assertions.checkIfValueIsPresent(onRampQuoteError);
    });
    await softAssert.checkAndCollect(async () => {
      await Assertions.checkIfObjectHasKeysAndValidValues(onRampQuoteError.properties, {
        amount: 'number',
        payment_method_id: 'string',
        error_message: 'string',
        currency_source: 'string',
        currency_destination: 'string',
        provider_onramp: 'string',
        chain_id_destination: 'string',
      });
    }, 'On-ramp Quote Error: Should have correct properties');

    softAssert.throwIfErrors();
  });
});
