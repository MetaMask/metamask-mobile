import { loginToApp } from '../../page-objects/viewHelper.ts';
import WalletView from '../../page-objects/wallet/WalletView';
import FundActionMenu from '../../page-objects/UI/FundActionMenu';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import { CustomNetworks } from '../../resources/networks.e2e';
import { SmokeTrade } from '../../tags';
import Assertions from '../../framework/Assertions';
import BuildQuoteView from '../../page-objects/Ramps/BuildQuoteView';
import BuyGetStartedView from '../../page-objects/Ramps/BuyGetStartedView';
import QuotesView from '../../page-objects/Ramps/QuotesView';
import SoftAssert from '../../framework/SoftAssert';
import { EventPayload, getEventsPayloads } from '../wallet/analytics/helpers';
import { RampsRegions, RampsRegionsEnum } from '../../framework/Constants';
import { Mockttp } from 'mockttp';
import { setupRegionAwareOnRampMocks } from '../../api-mocking/mock-responses/ramps/ramps-region-aware-mock-setup';

const eventsToCheck: EventPayload[] = [];

const setupOnRampTest = async (testFn: () => Promise<void>) => {
  const selectedRegion = RampsRegions[RampsRegionsEnum.FRANCE];

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

/**
 * TODO:
 * Moving to quaratine since all tests are being skipped.
 * When this test is fixed we need to add a second shard to CI.
 */
describe.skip(SmokeTrade('Onramp quote build screen'), () => {
  let shouldCheckProviderSelectedEvents = true;
  beforeEach(async () => {
    jest.setTimeout(200000);
  });

  it.skip('should get to the Amount to buy screen, after selecting Get Started', async () => {
    await setupOnRampTest(async () => {
      await Assertions.expectElementToBeVisible(
        BuildQuoteView.amountToBuyLabel,
      );
      await Assertions.expectElementToBeVisible(BuildQuoteView.getQuotesButton);
      await BuildQuoteView.tapCancelButton();

      // Should not show the Get Started screen again
      await WalletView.tapWalletBuyButton();
      await FundActionMenu.tapBuyButton();
      await Assertions.expectElementToBeVisible(
        BuildQuoteView.amountToBuyLabel,
      );
      await Assertions.expectElementToBeVisible(BuildQuoteView.getQuotesButton);
    });
  });

  it.skip('should enter amount, show quotes and expand quotes section', async () => {
    await setupOnRampTest(async () => {
      await BuildQuoteView.enterAmount('100');
      await BuildQuoteView.tapGetQuotesButton();
      await Assertions.expectElementToBeVisible(QuotesView.quotes);

      // Expand quotes section
      await device.disableSynchronization();
      try {
        await QuotesView.tapExploreMoreOptions();
        await Assertions.expectElementToBeVisible(
          QuotesView.expandedQuotesSection,
          {
            timeout: 30000,
          },
        );
        await Assertions.expectElementToBeVisible(
          QuotesView.continueWithProvider,
          {
            timeout: 30000,
          },
        );
        await QuotesView.tapContinueWithProvider();
      } catch (error) {
        // We're ok catching this as there were not enough providers to select from
        shouldCheckProviderSelectedEvents = false;
        console.warn('No provider will be selected');
      }
    });
  });

  // Keep this test at the end of the suite
  it.skip('should validate segment/metametric events for a successful onramp flow', async () => {
    const expectedEvents = {
      BUY_BUTTON_CLICKED: 'Buy Button Clicked',
      ONRAMP_GET_STARTED_CLICKED: 'On-ramp Get Started Clicked',
      ONRAMP_CANCELED: 'On-ramp Canceled',
      ONRAMP_QUOTES_REQUESTED: 'On-ramp Quotes Requested',
      ONRAMP_QUOTES_RECEIVED: 'On-ramp Quotes Received',
      ONRAMP_QUOTE_ERROR: 'On-ramp Quote Error',
      ONRAMP_QUOTES_EXPANDED: 'On-ramp Quotes Expanded',
      ONRAMP_PROVIDER_SELECTED: 'On-ramp Provider Selected',
    };

    const softAssert = new SoftAssert();
    // Find all events
    const buyButtonClicked = eventsToCheck.find(
      (event) => event.event === expectedEvents.BUY_BUTTON_CLICKED,
    );
    const onRampGetStartedClicked = eventsToCheck.find(
      (event) => event.event === expectedEvents.ONRAMP_GET_STARTED_CLICKED,
    );
    const onRampCanceled = eventsToCheck.find(
      (event) => event.event === expectedEvents.ONRAMP_CANCELED,
    );
    const onRampQuotesRequested = eventsToCheck.find(
      (event) => event.event === expectedEvents.ONRAMP_QUOTES_REQUESTED,
    );
    const onRampQuotesReceived = eventsToCheck.find(
      (event) => event.event === expectedEvents.ONRAMP_QUOTES_RECEIVED,
    );

    // Define all base assertion calls as variables
    const checkBuyButtonClicked = softAssert.checkAndCollect(async () => {
      await Assertions.checkIfValueIsDefined(buyButtonClicked);
    }, 'Buy Button Clicked: Should be present');

    const checkOnRampGetStartedClickedDefined = softAssert.checkAndCollect(
      async () => {
        await Assertions.checkIfValueIsDefined(onRampGetStartedClicked);
      },
      'On-ramp Get Started Clicked: Should be defined',
    );

    const checkOnRampGetStartedClickedProperties = softAssert.checkAndCollect(
      async () => {
        await Assertions.checkIfObjectContains(
          onRampGetStartedClicked?.properties ?? {},
          {
            text: 'Get Started',
            location: 'Get Started Screen',
          },
        );
      },
      'On-ramp Get Started Clicked: Should be present',
    );

    const checkOnRampCanceledDefined = softAssert.checkAndCollect(async () => {
      await Assertions.checkIfValueIsDefined(onRampCanceled);
    }, 'On-ramp Canceled: Should be present');

    const checkOnRampCanceledProperties = softAssert.checkAndCollect(
      async () => {
        await Assertions.checkIfObjectContains(
          onRampCanceled?.properties ?? {},
          {
            location: 'Amount to Buy Screen',
            chain_id_destination: '1',
          },
        );
      },
      'On-ramp Canceled: Should have correct properties',
    );

    const checkOnRampQuotesRequestedDefined = softAssert.checkAndCollect(
      async () => {
        await Assertions.checkIfValueIsDefined(onRampQuotesRequested);
      },
      'On-ramp Quotes Requested: Should be present',
    );

    const checkOnRampQuotesRequestedProperties = softAssert.checkAndCollect(
      async () => {
        await Assertions.checkIfObjectHasKeysAndValidValues(
          onRampQuotesRequested?.properties ?? {},
          {
            amount: 'number',
            payment_method_id: 'string',
            location: 'string',
            currency_source: 'string',
            currency_destination: 'string',
            chain_id_destination: 'string',
          },
        );
      },
      'On-ramp Quotes Requested: Should have correct properties',
    );

    const checkOnRampQuotesReceivedDefined = softAssert.checkAndCollect(
      async () => {
        await Assertions.checkIfValueIsDefined(onRampQuotesReceived);
      },
      'On-ramp Quotes Received: Should be present',
    );

    const checkOnRampQuotesReceivedProperties = softAssert.checkAndCollect(
      async () => {
        await Assertions.checkIfObjectHasKeysAndValidValues(
          onRampQuotesReceived?.properties ?? {},
          {
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
          },
        );
      },
      'On-ramp Quotes Received: Should have correct properties',
    );

    // Collect all base assertions
    const baseAssertions = [
      checkBuyButtonClicked,
      checkOnRampGetStartedClickedDefined,
      checkOnRampGetStartedClickedProperties,
      checkOnRampCanceledDefined,
      checkOnRampCanceledProperties,
      checkOnRampQuotesRequestedDefined,
      checkOnRampQuotesRequestedProperties,
      checkOnRampQuotesReceivedDefined,
      checkOnRampQuotesReceivedProperties,
    ];

    // iOS-specific assertions
    let iosAssertions: Promise<void>[] = [];
    if (device.getPlatform() === 'ios') {
      const onRampQuoteError = eventsToCheck.find(
        (event) => event.event === expectedEvents.ONRAMP_QUOTE_ERROR,
      );

      const checkOnRampQuoteErrorDefined = softAssert.checkAndCollect(
        async () => {
          await Assertions.checkIfValueIsDefined(onRampQuoteError);
        },
        'On-ramp Quote Error: Should be defined',
      );

      const checkOnRampQuoteErrorProperties = softAssert.checkAndCollect(
        async () => {
          await Assertions.checkIfObjectHasKeysAndValidValues(
            onRampQuoteError?.properties ?? {},
            {
              amount: 'number',
              payment_method_id: 'string',
              error_message: 'string',
              currency_source: 'string',
              currency_destination: 'string',
              provider_onramp: 'string',
              chain_id_destination: 'string',
            },
          );
        },
        'On-ramp Quote Error: Should have correct properties',
      );

      iosAssertions = [
        checkOnRampQuoteErrorDefined,
        checkOnRampQuoteErrorProperties,
      ];
    }

    // Provider-specific assertions
    let providerAssertions: Promise<void>[] = [];
    if (shouldCheckProviderSelectedEvents) {
      const onRampQuotesExpanded = eventsToCheck.find(
        (event) => event.event === expectedEvents.ONRAMP_QUOTES_EXPANDED,
      );
      const onRampProviderSelected = eventsToCheck.find(
        (event) => event.event === expectedEvents.ONRAMP_PROVIDER_SELECTED,
      );

      const checkOnRampQuotesExpandedDefined = softAssert.checkAndCollect(
        async () => {
          await Assertions.checkIfValueIsDefined(onRampQuotesExpanded);
        },
        'On-ramp Quotes Expanded: Should be present',
      );

      const checkOnRampQuotesExpandedProperties = softAssert.checkAndCollect(
        async () => {
          await Assertions.checkIfObjectHasKeysAndValidValues(
            onRampQuotesExpanded?.properties ?? {},
            {
              payment_method_id: 'string',
              amount: 'number',
              refresh_count: 'number',
              results_count: 'number',
              provider_onramp_first: 'string',
              provider_onramp_list: 'array',
              previously_used_count: 'number',
              chain_id_destination: 'string',
              currency_source: 'string',
              currency_destination: 'string',
            },
          );
        },
        'On-ramp Quotes Expanded: Should have correct properties',
      );

      const checkOnRampProviderSelectedDefined = softAssert.checkAndCollect(
        async () => {
          await Assertions.checkIfValueIsDefined(onRampProviderSelected);
        },
        'On-ramp Provider Selected: Should be present',
      );

      const checkOnRampProviderSelectedProperties = softAssert.checkAndCollect(
        async () => {
          await Assertions.checkIfObjectHasKeysAndValidValues(
            onRampProviderSelected?.properties ?? {},
            {
              refresh_count: 'number',
              quote_position: 'number',
              results_count: 'number',
              payment_method_id: 'string',
              total_fee: 'number',
              gas_fee: 'number',
              processing_fee: 'number',
              exchange_rate: 'number',
              amount: 'number',
              is_best_rate: 'boolean',
              is_recommended: 'boolean',
              currency_source: 'string',
              currency_destination: 'string',
              provider_onramp: 'string',
              crypto_out: 'number',
              chain_id_destination: 'string',
            },
          );
        },
        'On-ramp Provider Selected: Should have correct properties',
      );

      providerAssertions = [
        checkOnRampQuotesExpandedDefined,
        checkOnRampQuotesExpandedProperties,
        checkOnRampProviderSelectedDefined,
        checkOnRampProviderSelectedProperties,
      ];
    }

    await Promise.all([
      ...baseAssertions,
      ...iosAssertions,
      ...providerAssertions,
    ]);

    softAssert.throwIfErrors();
  });
});
