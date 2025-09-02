import { SmokeConfirmationsRedesigned } from '../../tags';
import { loginToApp } from '../../viewHelper';
import Browser from '../../pages/Browser/BrowserView';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import ConfirmationUITypes from '../../pages/Browser/Confirmations/ConfirmationUITypes';
import FooterActions from '../../pages/Browser/Confirmations/FooterActions';
import Assertions from '../../framework/Assertions';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import { buildPermissions } from '../../framework/fixtures/FixtureUtils';
import RowComponents from '../../pages/Browser/Confirmations/RowComponents';
import {
  SEND_ETH_SIMULATION_MOCK,
  SIMULATION_ENABLED_NETWORKS_MOCK,
} from '../../api-mocking/mock-responses/simulations';
import TestDApp from '../../pages/Browser/TestDApp';
import { DappVariants } from '../../framework/Constants';
import { EventPayload, getEventsPayloads } from '../analytics/helpers';
import SoftAssert from '../../utils/SoftAssert';
import { Mockttp } from 'mockttp';
import {
  setupMockRequest,
  setupMockPostRequest,
} from '../../api-mocking/helpers/mockHelpers';
import Gestures from '../../framework/Gestures';
import {
  SECURITY_ALERTS_BENIGN_RESPONSE,
  SECURITY_ALERTS_REQUEST_BODY,
  securityAlertsUrl,
} from '../../api-mocking/mock-responses/security-alerts-mock';
import { setupRemoteFeatureFlagsMock } from '../../api-mocking/helpers/remoteFeatureFlagsHelper';
import { confirmationsRedesignedFeatureFlags } from '../../api-mocking/mock-responses/feature-flags-mocks';

const expectedEvents = {
  TRANSACTION_ADDED: 'Transaction Added',
  CONFIRMATION_SCREEN_VIEWED: 'Confirmation Screen Viewed',
  TRANSACTION_SUBMITTED: 'Transaction Submitted',
  TRANSACTION_APPROVED: 'Transaction Approved',
  TRANSACTION_FINALIZED: 'Transaction Finalized',
};

const expectedEventNames = [
  expectedEvents.TRANSACTION_ADDED,
  expectedEvents.CONFIRMATION_SCREEN_VIEWED,
  expectedEvents.TRANSACTION_SUBMITTED,
  expectedEvents.TRANSACTION_APPROVED,
  expectedEvents.TRANSACTION_FINALIZED,
];

// Quarantining for GNS feature
// Original path e2e/specs/confirmations-redesigned/transactions/dapp-initiated-transfer.spec.ts
// Failing on IOS, Passes on Android
describe(SmokeConfirmationsRedesigned('DApp Initiated Transfer'), () => {
  const testSpecificMock = async (mockServer: Mockttp) => {
    await setupMockPostRequest(
      mockServer,
      securityAlertsUrl('0x539'),
      SECURITY_ALERTS_REQUEST_BODY,
      SECURITY_ALERTS_BENIGN_RESPONSE,
      {
        statusCode: 201,
      },
    );

    await setupMockRequest(mockServer, {
      requestMethod: 'GET',
      url: SIMULATION_ENABLED_NETWORKS_MOCK.urlEndpoint,
      response: SIMULATION_ENABLED_NETWORKS_MOCK.response,
      responseCode: 200,
    });

    const {
      urlEndpoint: simulationEndpoint,
      requestBody,
      response: simulationResponse,
      ignoreFields,
    } = SEND_ETH_SIMULATION_MOCK;

    await setupMockPostRequest(
      mockServer,
      simulationEndpoint,
      requestBody,
      simulationResponse,
      {
        statusCode: 200,
        ignoreFields,
      },
    );
    await setupRemoteFeatureFlagsMock(
      mockServer,
      Object.assign({}, ...confirmationsRedesignedFeatureFlags),
    );
  };
  let eventsToCheck: EventPayload[];

  beforeAll(async () => {
    jest.setTimeout(2500000);
  });

  it('sends native asset', async () => {
    await withFixtures(
      {
        dapps: [
          {
            dappVariant: DappVariants.TEST_DAPP,
          },
        ],
        fixture: new FixtureBuilder()
          .withGanacheNetwork()
          .withMetaMetricsOptIn()
          .withPermissionControllerConnectedToTestDapp(
            buildPermissions(['0x539']),
          )
          .build(),
        restartDevice: true,
        testSpecificMock,
        endTestfn: async ({ mockServer }) => {
          eventsToCheck = await getEventsPayloads(
            mockServer,
            expectedEventNames,
          );
        },
      },
      async () => {
        await loginToApp();

        await TabBarComponent.tapBrowser();
        await Browser.navigateToTestDApp();
        await TestDApp.tapSendEIP1559Button();

        // Check all expected elements are visible
        await Assertions.expectElementToBeVisible(
          ConfirmationUITypes.ModalConfirmationContainer,
        );
        await Assertions.expectElementToBeVisible(RowComponents.TokenHero);
        await Assertions.expectTextDisplayed('0 ETH');
        await Assertions.expectElementToBeVisible(RowComponents.FromTo);
        await Assertions.expectElementToBeVisible(
          RowComponents.SimulationDetails,
        );
        await Assertions.expectElementToBeVisible(RowComponents.GasFeesDetails);

        // Scroll to Advanced Details section on Android
        if (device.getPlatform() === 'android') {
          await Gestures.swipe(RowComponents.GasFeesDetails, 'up');
        }

        await Assertions.expectElementToBeVisible(
          RowComponents.AdvancedDetails,
        );

        // Accept confirmation
        await FooterActions.tapConfirmButton();

        // Check activity tab
        await TabBarComponent.tapActivity();
        await Assertions.expectTextDisplayed('Confirmed');
      },
    );
  });

  it('validates the segment events from the dapp initiated transfer', async () => {
    if (!eventsToCheck) {
      throw new Error('Events to check are not defined');
    }

    const softAssert = new SoftAssert();

    // Transaction Added
    const transactionAddedEvent = eventsToCheck.find(
      (event) => event.event === expectedEvents.TRANSACTION_ADDED,
    );
    await softAssert.checkAndCollect(
      () => Assertions.checkIfValueIsDefined(transactionAddedEvent),
      'Transaction Added: Should be defined',
    );
    await softAssert.checkAndCollect(
      () =>
        Assertions.checkIfObjectHasKeysAndValidValues(
          transactionAddedEvent?.properties ?? {},
          {
            api_method: 'string',
            eip7702_upgrade_transaction: 'boolean',
            chain_id: 'string',
            gas_estimation_failed: 'boolean',
            gas_fee_presented: 'array',
            gas_fee_selected: 'string',
            status: 'string',
            source: 'string',
            transaction_contract_method: 'array',
            transaction_envelope_type: 'string',
            transaction_internal_id: 'string',
            transaction_type: 'string',
            from_address: 'string',
            to_address: 'string',
            value: 'string',
          },
        ),
      'Transaction Added: Should have the correct properties',
    );

    // Confirmation Screen Viewed
    const confirmationScreenViewedEvent = eventsToCheck.find(
      (event) => event.event === expectedEvents.CONFIRMATION_SCREEN_VIEWED,
    );
    await softAssert.checkAndCollect(
      () => Assertions.checkIfValueIsDefined(confirmationScreenViewedEvent),
      'Confirmation Screen Viewed: Should be defined',
    );
    await softAssert.checkAndCollect(
      () =>
        Assertions.checkIfObjectHasKeysAndValidValues(
          confirmationScreenViewedEvent?.properties ?? {},
          {
            location: 'string',
          },
        ),
      'Confirmation Screen Viewed: Should have the correct properties',
    );

    // Transaction Submitted
    const transactionSubmittedEvent = eventsToCheck.find(
      (event) => event.event === expectedEvents.TRANSACTION_SUBMITTED,
    );
    await softAssert.checkAndCollect(
      () => Assertions.checkIfValueIsDefined(transactionSubmittedEvent),
      'Transaction Submitted: Should be defined',
    );
    await softAssert.checkAndCollect(
      () =>
        Assertions.checkIfObjectHasKeysAndValidValues(
          transactionSubmittedEvent?.properties ?? {},
          {
            api_method: 'string',
            eip7702_upgrade_transaction: 'boolean',
            chain_id: 'string',
            gas_estimation_failed: 'boolean',
            gas_fee_presented: 'array',
            gas_fee_selected: 'string',
            status: 'string',
            source: 'string',
            transaction_contract_method: 'array',
            transaction_envelope_type: 'string',
            transaction_internal_id: 'string',
            transaction_type: 'string',
            simulation_response: 'string',
            simulation_latency: 'number',
            simulation_receiving_assets_quantity: 'number',
            simulation_receiving_assets_type: 'array',
            simulation_receiving_assets_value: 'array',
            simulation_sending_assets_quantity: 'number',
            simulation_sending_assets_type: 'array',
            simulation_sending_assets_value: 'array',
            transaction_transfer_usd_value: 'string',
            asset_type: 'string',
            from_address: 'string',
            to_address: 'string',
            value: 'string',
            simulation_receiving_assets_total_value: 'number',
            simulation_sending_assets_total_value: 'number',
          },
        ),
      'Transaction Submitted: Should have the correct properties',
    );

    // Transaction Approved
    const transactionApprovedEvent = eventsToCheck.find(
      (event) => event.event === expectedEvents.TRANSACTION_APPROVED,
    );
    await softAssert.checkAndCollect(
      () => Assertions.checkIfValueIsDefined(transactionApprovedEvent),
      'Transaction Approved: Should be defined',
    );
    await softAssert.checkAndCollect(
      () =>
        Assertions.checkIfObjectHasKeysAndValidValues(
          transactionApprovedEvent?.properties ?? {},
          {
            api_method: 'string',
            eip7702_upgrade_transaction: 'boolean',
            chain_id: 'string',
            gas_estimation_failed: 'boolean',
            gas_fee_presented: 'array',
            gas_fee_selected: 'string',
            status: 'string',
            source: 'string',
            transaction_contract_method: 'array',
            transaction_envelope_type: 'string',
            transaction_internal_id: 'string',
            transaction_type: 'string',
            simulation_response: 'string',
            simulation_latency: 'number',
            simulation_receiving_assets_quantity: 'number',
            simulation_receiving_assets_type: 'array',
            simulation_receiving_assets_value: 'array',
            simulation_sending_assets_quantity: 'number',
            simulation_sending_assets_type: 'array',
            simulation_sending_assets_value: 'array',
            transaction_transfer_usd_value: 'string',
            asset_type: 'string',
            from_address: 'string',
            to_address: 'string',
            value: 'string',
            simulation_receiving_assets_total_value: 'number',
            simulation_sending_assets_total_value: 'number',
          },
        ),
      'Transaction Approved: Should have the correct properties',
    );

    // Transaction Finalized
    const transactionFinalizedEvent = eventsToCheck.find(
      (event) => event.event === expectedEvents.TRANSACTION_FINALIZED,
    );
    await softAssert.checkAndCollect(
      () => Assertions.checkIfValueIsDefined(transactionFinalizedEvent),
      'Transaction Finalized: Should be defined',
    );
    await softAssert.checkAndCollect(
      () =>
        Assertions.checkIfObjectHasKeysAndValidValues(
          transactionFinalizedEvent?.properties ?? {},
          {
            api_method: 'string',
            eip7702_upgrade_transaction: 'boolean',
            chain_id: 'string',
            gas_estimation_failed: 'boolean',
            gas_fee_presented: 'array',
            gas_fee_selected: 'string',
            status: 'string',
            source: 'string',
            transaction_contract_method: 'array',
            transaction_envelope_type: 'string',
            transaction_internal_id: 'string',
            transaction_type: 'string',
            simulation_response: 'string',
            simulation_latency: 'number',
            simulation_receiving_assets_quantity: 'number',
            simulation_receiving_assets_type: 'array',
            simulation_receiving_assets_value: 'array',
            simulation_sending_assets_quantity: 'number',
            simulation_sending_assets_type: 'array',
            simulation_sending_assets_value: 'array',
            transaction_transfer_usd_value: 'string',
            asset_type: 'string',
            rpc_domain: 'string',
            from_address: 'string',
            to_address: 'string',
            value: 'string',
            simulation_receiving_assets_total_value: 'number',
            simulation_sending_assets_total_value: 'number',
          },
        ),
      'Transaction Finalized: Should have the correct properties',
    );

    softAssert.throwIfErrors();
  });
});
