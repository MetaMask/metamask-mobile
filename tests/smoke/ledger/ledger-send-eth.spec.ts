import { SmokeLedger } from '../../tags';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import {
  withSpeculosFixtures,
  importLedgerAccount,
  LEDGER_ACCOUNT_ADDRESS,
  type SpeculosTestSuiteParams,
} from '../../framework/fixtures/SpeculosFixtureHelper';
import WalletView from '../../page-objects/wallet/WalletView';
import SendView from '../../page-objects/Send/RedesignedSendView';
import HardwareWalletBottomSheet from '../../page-objects/Ledger/HardwareWalletBottomSheet';
import Assertions from '../../framework/Assertions';
import Gestures from '../../framework/Gestures';
import Matchers from '../../framework/Matchers';
import TestHelpers from '../../helpers';
import { ConfirmationFooterSelectorIDs } from '../../../app/components/Views/confirmations/ConfirmationView.testIds';
import { LocalNode } from '../../framework/types';
import { AnvilPort } from '../../framework/fixtures/FixtureUtils';
import { AnvilManager } from '../../seeder/anvil-manager';
import { merge } from 'lodash';

jest.setTimeout(600000);

const RECIPIENT = '0x0c54fccd2e384b4bb6f2e405bf5cbc15a017aafb';

const describeIf = process.env.LEDGER_E2E === '1' ? describe : describe.skip;

describeIf(SmokeLedger('Send ETH from Ledger account'), () => {
  it('should send ETH from a Ledger account via local Anvil node', async () => {
    await withSpeculosFixtures(
      {
        fixture: ({ localNodes }: { localNodes?: LocalNode[] }) => {
          const node = localNodes?.[0] as unknown as AnvilManager;
          const rpcPort =
            node instanceof AnvilManager
              ? (node.getPort() ?? AnvilPort())
              : undefined;

          const ledgerAddrLower = LEDGER_ACCOUNT_ADDRESS.toLowerCase();
          // 1000 ETH in hex (wei)
          const ethBalanceWei =
            '0x' + (BigInt(1000) * BigInt(10) ** BigInt(18)).toString(16);

          const fixture = new FixtureBuilder()
            .withDefaultFixture()
            .withNetworkController({
              chainId: '0x539',
              rpcUrl: `http://localhost:${rpcPort ?? AnvilPort()}`,
              type: 'custom',
              nickname: 'Local RPC',
              ticker: 'ETH',
            })
            .withNetworkEnabledMap({
              eip155: { '0x539': true },
            })
            .withTokens(
              [
                {
                  address: '0x0000000000000000000000000000000000000000',
                  symbol: 'ETH',
                  decimals: 18,
                  name: 'Ethereum',
                },
              ],
              '0x539',
              ledgerAddrLower,
            )
            .build();

          // Pre-seed native ETH balance for Ledger account on local chain
          merge(fixture.state.engine.backgroundState.AccountTrackerController, {
            accounts: {
              [ledgerAddrLower]: { balance: ethBalanceWei },
            },
            accountsByChainId: {
              '0x539': {
                [ledgerAddrLower]: { balance: ethBalanceWei },
              },
            },
          });

          return fixture;
        },
        startSpeculos: true,
        enableLocalNode: true,
      },
      async ({ speculos }: SpeculosTestSuiteParams) => {
        // ── Phase 1: Import Ledger account via BLE ──
        await importLedgerAccount();
        await TestHelpers.delay(5000);

        // ── Phase 2: Send flow ──
        await WalletView.tapWalletSendButton();
        // Wait for balance to be fetched from Anvil before token appears
        await SendView.selectEthereumToken({ timeout: 60000 });
        await SendView.pressAmountMaxButton();
        await SendView.pressContinueButton();
        await SendView.inputRecipientAddress(RECIPIENT);
        await SendView.pressReviewButton();

        // ── Phase 3: Confirm transaction ──
        const confirmButton = Matchers.getElementByID(
          ConfirmationFooterSelectorIDs.CONFIRM_BUTTON,
        );
        await Gestures.waitAndTap(confirmButton, {
          elemDescription: 'Confirm button',
          timeout: 60000,
        });

        // ── Phase 4: Ledger BLE signing via Speculos ──
        await HardwareWalletBottomSheet.waitForVisible(60000);

        try {
          await HardwareWalletBottomSheet.waitForDeviceSelection(5000);
          await HardwareWalletBottomSheet.selectVirtualDevice();
          await TestHelpers.delay(1000);
          await HardwareWalletBottomSheet.tapConnect();
        } catch {
          // Already connecting or in another state
        }

        await Assertions.expectElementToBeVisible(
          HardwareWalletBottomSheet.awaitingConfirmationContent,
          { timeout: 120000 },
        );

        await TestHelpers.delay(3000);
        await speculos.approveTransaction();

        await Assertions.expectElementToBeVisible(
          HardwareWalletBottomSheet.successContent,
          { timeout: 60000 },
        );
      },
    );
  });
});
