import { SmokeLedger } from '../../tags';
import FixtureBuilder, {
  DEFAULT_FIXTURE_ACCOUNT,
} from '../../framework/fixtures/FixtureBuilder';
import {
  withSpeculosFixtures,
  importLedgerAccount,
  type SpeculosTestSuiteParams,
  LEDGER_ACCOUNT_ADDRESS,
} from '../../framework/fixtures/SpeculosFixtureHelper';
import WalletView from '../../page-objects/wallet/WalletView';
import SendView from '../../page-objects/Send/RedesignedSendView';
import FooterActions from '../../page-objects/Browser/Confirmations/FooterActions';
import HardwareWalletBottomSheet from '../../page-objects/Ledger/HardwareWalletBottomSheet';
import Assertions from '../../framework/Assertions';
import { LOCAL_NODE_RPC_URL } from '../../framework/Constants';
import { setupMockRequest } from '../../api-mocking/helpers/mockHelpers';
import { Mockttp } from 'mockttp';
import TestHelpers from '../../helpers';
import { createLogger } from '../../framework/logger';

const logger = createLogger({ name: 'SendEthTest' });

jest.setTimeout(600000);

const RECIPIENT = '0x0c54fccd2e384b4bb6f2e405bf5cbc15a017aafb';

const describeIf = process.env.LEDGER_E2E === '1' ? describe : describe.skip;

function buildSendEthFixture() {
  return new FixtureBuilder()
    .withDefaultFixture()
    .withNetworkController({
      chainId: '0x539',
      rpcUrl: LOCAL_NODE_RPC_URL,
      type: 'custom',
      nickname: 'Local Anvil',
      ticker: 'ETH',
    })
    .build();
}

async function setupLedgerBalanceMock(mockServer: Mockttp) {
  await setupMockRequest(mockServer, {
    url: /accounts\.api\.cx\.metamask\.io\/v4\/multiaccount\/balances/,
    response: {
      balances: [
        {
          object: 'token',
          address: '0x0000000000000000000000000000000000000000',
          symbol: 'ETH',
          name: 'Ether',
          type: 'native',
          decimals: 18,
          chainId: 1337,
          balance: '10.000000000000000000',
          accountAddress: `eip155:1337:${DEFAULT_FIXTURE_ACCOUNT}`,
        },
        {
          object: 'token',
          address: '0x0000000000000000000000000000000000000000',
          symbol: 'ETH',
          name: 'Ether',
          type: 'native',
          decimals: 18,
          chainId: 1337,
          balance: '10.000000000000000000',
          accountAddress: `eip155:1337:${LEDGER_ACCOUNT_ADDRESS}`,
        },
      ],
      unprocessedNetworks: [],
    },
    requestMethod: 'GET',
    responseCode: 200,
  });
}

describeIf(SmokeLedger('Send ETH from Ledger account'), () => {
  it('should send ETH from a Ledger account via local Anvil node', async () => {
    await withSpeculosFixtures(
      {
        fixture: buildSendEthFixture(),
        startSpeculos: true,
        enableLocalNode: true,
        testSpecificMock: setupLedgerBalanceMock,
      },
      async ({ speculos }: SpeculosTestSuiteParams) => {
        // ── Phase 1: Import Ledger account (with restart) ──
        await importLedgerAccount();

        await device.disableSynchronization();
        await TestHelpers.delay(10000);

        // ── Phase 2: Send flow ──
        await WalletView.tapWalletSendButton();
        await TestHelpers.delay(3000);
        await device.takeScreenshot('send-asset-screen');
        await SendView.selectEthereumToken();
        await SendView.pressAmountMaxButton();
        await SendView.pressContinueButton();
        await SendView.inputRecipientAddress(RECIPIENT);
        await SendView.pressReviewButton();

        // ── Phase 3: Ledger signing via Speculos ──
        // The correct flow is:
        // 1. Tap Confirm in MetaMask → triggers BLE transaction to Ledger
        // 2. Ledger shows transaction review screens
        // 3. Press buttons on Ledger to approve
        const approvePromise = (async () => {
          await TestHelpers.delay(10000);
          await speculos.approveTransaction();
        })();
        await FooterActions.tapConfirmButton(60000);
        await approvePromise;

        await Assertions.expectElementToBeVisible(
          HardwareWalletBottomSheet.awaitingConfirmationContent,
          { timeout: 30000 },
        );
        await Assertions.expectElementToBeVisible(
          HardwareWalletBottomSheet.successContent,
          { timeout: 60000 },
        );
      },
    );
  });
});
