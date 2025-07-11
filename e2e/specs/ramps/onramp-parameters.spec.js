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
import SelectCurrencyView from '../../pages/Ramps/SelectCurrencyView';
import TokenSelectBottomSheet from '../../pages/Ramps/TokenSelectBottomSheet';
import SelectRegionView from '../../pages/Ramps/SelectRegionView';
import SelectPaymentMethodView from '../../pages/Ramps/SelectPaymentMethodView';
import BuyGetStartedView from '../../pages/Ramps/BuyGetStartedView';
import { withFixtures } from '../../fixtures/fixture-helper';
import { startMockServer, stopMockServer } from '../../api-mocking/mock-server';
import { getMockServerPort } from '../../fixtures/utils';
import { mockEvents } from '../../api-mocking/mock-config/mock-events';
import { getEventsPayloads } from '../analytics/helpers';
import SoftAssert from '../../utils/SoftAssert';

const unitedStatesRegion = {
  currencies: ['/currencies/fiat/usd'],
  emoji: '🇺🇸',
  id: '/regions/us-ca',
  name: 'California',
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
        .withRampsSelectedRegion(unitedStatesRegion)
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
      await WalletActionsBottomSheet.tapBuyButton();
      await BuyGetStartedView.tapGetStartedButton();
      await testFn();
    },
  );
};

describe(SmokeTrade('On-Ramp Parameters'), () => {
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

  it('should select currency and verify display', async () => {
    await setupOnRampTest(async () => {
      await BuildQuoteView.tapCurrencySelector();
      await SelectCurrencyView.tapCurrencyOption('Euro');
      await Assertions.checkIfTextIsDisplayed('€0');
      await Assertions.checkIfTextIsNotDisplayed('$0');
    });
  });

  it('should select token and verify display', async () => {
    await setupOnRampTest(async () => {
      await BuildQuoteView.tapTokenDropdown('Ethereum');
      await TokenSelectBottomSheet.tapTokenByName('DAI');
      await Assertions.checkIfTextIsDisplayed('Dai Stablecoin');
      await Assertions.checkIfTextIsNotDisplayed('Ethereum');
    });
  });

  it('should select region and verify display', async () => {
    await setupOnRampTest(async () => {
      await BuildQuoteView.tapRegionSelector();
      await SelectRegionView.tapRegionOption('Spain');
      await Assertions.checkIfTextIsNotDisplayed('🇺🇸');
      await Assertions.checkIfTextIsDisplayed('🇪🇸');
    });
  });

  it('should select payment method and verify display', async () => {
    await setupOnRampTest(async () => {
      const paymentMethod =
        device.getPlatform() === 'ios' ? 'Apple Pay' : 'Google Pay';
      await BuildQuoteView.tapPaymentMethodDropdown(paymentMethod);
      await SelectPaymentMethodView.tapPaymentMethodOption('Debit or Credit');
      await Assertions.checkIfTextIsNotDisplayed(paymentMethod);
      await Assertions.checkIfTextIsDisplayed('Debit or Credit');
    });
  });

  it('should validate segment/metametric events for a successful onramp flow (parameters)', async () => {
    const expectedEvents = {
      RAMPS_REGION_SELECTED: 'Ramp Region Selected',
      ONRAMP_PAYMENT_METHOD_SELECTED: 'On-ramp Payment Method Selected',
    };

    const events = await getEventsPayloads(mockServer, [
      expectedEvents.RAMPS_REGION_SELECTED,
      expectedEvents.ONRAMP_PAYMENT_METHOD_SELECTED,
    ]);

    const softAssert = new SoftAssert();

    const rampRegionSelected = events.find(
      (event) => event.event === expectedEvents.RAMPS_REGION_SELECTED,
    );
    const onRampPaymentMethodSelected = events.find(
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
          rampRegionSelected.properties,
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
          onRampPaymentMethodSelected.properties,
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
