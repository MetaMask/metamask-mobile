import { SmokeWalletPlatform } from '../../tags';
import TestHelpers from '../../helpers';
import WalletView from '../../pages/wallet/WalletView';
import AmountView from '../../pages/Send/AmountView';
import SendView from '../../pages/Send/SendView';
import { loginToApp } from '../../viewHelper';
import TransactionConfirmationView from '../../pages/Send/TransactionConfirmView';
import TokenOverview from '../../pages/wallet/TokenOverview';
import Assertions from '../../framework/Assertions';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import ActivitiesView from '../../pages/Transactions/ActivitiesView';
import { LocalNode } from '../../framework/types';
import { AnvilPort } from '../../framework/fixtures/FixtureUtils';
import { AnvilManager } from '../../seeder/anvil-manager';

const INCORRECT_SEND_ADDRESS = '0xebe6CcB6B55e1d094d9c58980Bc10Fed69932cAb';
const CORRECT_SEND_ADDRESS = '0x37cc5ef6bfe753aeaf81f945efe88134b238face';
const SHORTHAND_ADDRESS = '0x37Cc...FACE';

// This test was migrated to the new framework but should be reworked to use withFixtures properly
describe(
  SmokeWalletPlatform(
    'Send ETH to the correct address after editing the recipient',
  ),
  () => {
    beforeAll(async () => {
      jest.setTimeout(2500000);
      await TestHelpers.reverseServerPort();
    });
    it('should display correct send address after edit', async () => {
      await withFixtures(
        {
          fixture: ({ localNodes }: { localNodes?: LocalNode[] }) => {
            const node = localNodes?.[0] as unknown as AnvilManager;
            const rpcPort =
              node instanceof AnvilManager
                ? (node.getPort() ?? AnvilPort())
                : undefined;

            return new FixtureBuilder()
              .withNetworkController({
                providerConfig: {
                  chainId: '0x539',
                  rpcUrl: `http://localhost:${rpcPort ?? AnvilPort()}`,
                  type: 'custom',
                  nickname: 'Local RPC',
                  ticker: 'ETH',
                },
              })
              .build();
          },
          restartDevice: true,
        },
        async () => {
          await loginToApp();
          await Assertions.expectElementToBeVisible(WalletView.container);
          await TabBarComponent.tapActions();
          await TokenOverview.tapActionSheetSendButton();
          await SendView.inputAddress(INCORRECT_SEND_ADDRESS);

          await SendView.tapNextButton();
          await AmountView.typeInTransactionAmount('0.000001');

          await AmountView.tapNextButton();

          //Assert Address
          const address = await SendView.splitAddressText();
          await Assertions.checkIfTextMatches(
            address[0],
            INCORRECT_SEND_ADDRESS,
          );

          await SendView.tapBackButton();
          await AmountView.tapBackButton();
          await SendView.removeAddress();
          await SendView.inputAddress(CORRECT_SEND_ADDRESS);
          await SendView.tapNextButton();
          await AmountView.typeInTransactionAmount('0.000001');

          await AmountView.tapNextButton();

          // Assert correct address
          const correctAddress = await SendView.splitAddressText();
          await Assertions.checkIfTextMatches(
            correctAddress[0],
            CORRECT_SEND_ADDRESS,
          );
          //TODO: Currently flakey, requires more work
          //Assert transactions send screen on IOS only due to android limitations
          if (device.getPlatform() === 'ios') {
            // Tap Send
            await TransactionConfirmationView.tapConfirmButton();

            // Transactions view to assert address remains consistent
            await TabBarComponent.tapActivity();
            await TestHelpers.delay(3000);
            await ActivitiesView.tapConfirmedTransaction();
            await Assertions.expectTextDisplayed(`${SHORTHAND_ADDRESS}`);
          }
        },
      );
    });
  },
);
