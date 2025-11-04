import { RegressionConfirmations } from '../../tags';
import AmountView from '../../pages/Send/AmountView';
import SendView from '../../pages/Send/SendView';
import TransactionConfirmationView from '../../pages/Send/TransactionConfirmView';
import { loginToApp } from '../../viewHelper';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import WalletView from '../../pages/wallet/WalletView';
import enContent from '../../../locales/languages/en.json';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import {
  loadFixture,
  startFixtureServer,
  stopFixtureServer,
} from '../../framework/fixtures/FixtureHelper';
import { CustomNetworks } from '../../resources/networks.e2e';
import TestHelpers from '../../helpers';
import FixtureServer from '../../framework/fixtures/FixtureServer';
import { getFixturesServerPort } from '../../framework/fixtures/FixtureUtils';
import Assertions from '../../framework/Assertions';

const fixtureServer = new FixtureServer();

// This test was migrated to the new framework but should be reworked to use withFixtures properly
describe(RegressionConfirmations('Send ETH'), () => {
  const TOKEN_NAME = enContent.unit.eth;
  const AMOUNT = '0.12345';

  beforeEach(async () => {
    await TestHelpers.reverseServerPort();
    const fixture = new FixtureBuilder()
      .withNetworkController(CustomNetworks.Tenderly)
      // This fixture does not exist
      // .withAddressBookController({
      //   addressBook: {
      //     '0x1': {
      //       '0x2f318C334780961FB129D2a6c30D0763d9a5C970': {
      //         address: '0x2f318C334780961FB129D2a6c30D0763d9a5C970',
      //         chainId: '0x1',
      //         isEns: false,
      //         memo: '',
      //         name: 'Test Name 1',
      //       },
      //     },
      //   },
      // })
      .build();
    await startFixtureServer(fixtureServer);
    await loadFixture(fixtureServer, { fixture });
    await device.launchApp({
      permissions: { notifications: 'YES' },
      launchArgs: { fixtureServerPort: `${getFixturesServerPort()}` },
    });
    await loginToApp();
  });

  afterAll(async () => {
    await stopFixtureServer(fixtureServer);
  });

  it('should send ETH to a contact from inside the wallet', async () => {
    await WalletView.tapWalletSendButton();
    await SendView.scrollToSavedAccount();

    await SendView.tapAccountName('Test Name 1');

    await SendView.tapNextButton();

    await AmountView.typeInTransactionAmount(AMOUNT);
    await AmountView.tapNextButton();
    await Assertions.expectTextDisplayed('Test Name 1');
    await TransactionConfirmationView.tapConfirmButton();
    await TabBarComponent.tapActivity();
    await Assertions.expectTextDisplayed(`${AMOUNT} ${TOKEN_NAME}`);
  });
});
