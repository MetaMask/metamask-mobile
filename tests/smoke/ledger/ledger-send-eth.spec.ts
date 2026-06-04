import { SmokeLedger } from '../../tags';
import FixtureBuilder, {
  DEFAULT_FIXTURE_ACCOUNT,
} from '../../framework/fixtures/FixtureBuilder';
import {
  withSpeculosFixtures,
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

jest.setTimeout(600000);

const RECIPIENT = '0x0c54fccd2e384b4bb6f2e405bf5cbc15a017aafb';

const describeIf = process.env.LEDGER_E2E === '1' ? describe : describe.skip;

function buildSendEthFixture() {
  return new FixtureBuilder()
    .withDefaultFixture()
    .withLedgerAccount(LEDGER_ACCOUNT_ADDRESS)
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
        // Ledger account is pre-seeded in the fixture and selected.
        // Anvil is funded with the Speculos seed so the Ledger address has ETH.

        // ── Phase 1: Login ──
        await TestHelpers.delay(5000);
        const { loginToApp } = await import('../../flows/wallet.flow');
        await loginToApp();
        await TestHelpers.delay(5000);
        await device.disableSynchronization();

        // ── Phase 2: Send flow ──
        await WalletView.tapWalletSendButton();
        await TestHelpers.delay(3000);
        await SendView.selectEthereumToken();
        await SendView.pressAmountMaxButton();
        await SendView.pressContinueButton();
        await SendView.inputRecipientAddress(RECIPIENT);
        await SendView.pressReviewButton();

        // ── Phase 3: Ledger signing via Speculos ──
        await TestHelpers.delay(5000);

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
