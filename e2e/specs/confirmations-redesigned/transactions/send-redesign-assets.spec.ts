import { SmokeConfirmationsRedesigned } from '../../../tags';
import { loginToApp } from '../../../viewHelper';
import { withFixtures } from '../../../framework/fixtures/FixtureHelper';
import Assertions from '../../../framework/Assertions';
import WalletView from '../../../pages/wallet/WalletView';
import FixtureBuilder from '../../../framework/fixtures/FixtureBuilder';
import SendRedesignView from '../../../pages/Send/SendRedesignView';
import { Mockttp } from 'mockttp';
import { setupRemoteFeatureFlagsMock } from '../../../api-mocking/helpers/remoteFeatureFlagsHelper';

const MOCK_TOKENS = [
  {
    address: '0x7AF963cF6D228E564e2A0aA0DdBF06210B38615D',
    symbol: 'USDC',
    decimals: 6,
    name: 'USD Coin',
  },
];

const RECIPIENT_ADDRESS = '0x0c54fccd2e384b4bb6f2e405bf5cbc15a017aafb';

describe(SmokeConfirmationsRedesigned('Send Redesign Complete Flow'), () => {
  const testSpecificMock = async (mockServer: Mockttp) => {
    // Enable send redesign feature flag
    await setupRemoteFeatureFlagsMock(
      mockServer,
      Object.assign(
        {},
        {
          sendRedesign: {
            enabled: true,
          },
        },
      ),
    );
  };

  beforeAll(async () => {
    jest.setTimeout(150000);
  });

  it('completes full send flow with USDC', async () => {
    await withFixtures(
      {
        fixture: (() => {
          const builder = new FixtureBuilder()
            .withPopularNetworks()
            .withNetworkEnabledMap({
              eip155: {
                '0x539': true,
              },
            })
            .withSendRedesignTokensForNetworks(MOCK_TOKENS, ['0x539']);

          const fixture = builder.build();
          fixture.state.engine.backgroundState.AddressBookController.addressBook[
            '0x539'
          ] = {
            [RECIPIENT_ADDRESS]: {
              address: RECIPIENT_ADDRESS,
              chainId: '0x539',
              isEns: false,
              memo: '',
              name: 'Test Recipient',
            },
          };
          return fixture;
        })(),
        restartDevice: true,
        testSpecificMock,
      },
      async () => {
        await loginToApp();

        await WalletView.tapWalletSendButton();

        await Assertions.expectElementToBeVisible(
          SendRedesignView.assetSearchField,
          { description: 'asset search field should be visible' },
        );

        await Assertions.expectElementToBeVisible(
          SendRedesignView.tokensSection,
          { description: 'tokens section should be visible' },
        );

        await SendRedesignView.selectTokenBySymbol('USDC');

        await Assertions.expectElementToBeVisible(
          SendRedesignView.amountInput,
          { description: 'amount input should be visible' },
        );

        await SendRedesignView.enterAmount('1000');
        await device.disableSynchronization();
        await SendRedesignView.tapContinueButton();
        await Assertions.expectElementToBeVisible(
          SendRedesignView.recipientAddressInput,
          {
            description: 'recipient address input should be visible',
            timeout: 10000,
          },
        );
        await SendRedesignView.selectContactFromList('Test Recipient');

        // NO NAVIGATION AFTER TAPPING ON CONTACT NAME????
      },
    );
  });
});
