import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import FooterActions from '../../pages/Browser/Confirmations/FooterActions';
import SendView from '../../pages/Send/RedesignedSendView';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import WalletView from '../../pages/wallet/WalletView';
import { Assertions } from '../../framework';
import { DappVariants } from '../../framework/Constants';
import { SmokeConfirmationsRedesigned } from '../../tags';
import { buildPermissions } from '../../framework/fixtures/FixtureUtils';
import { loginToApp } from '../../viewHelper';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';

const RECIPIENT = '0x0c54fccd2e384b4bb6f2e405bf5cbc15a017aafb';

describe(SmokeConfirmationsRedesigned('Send ERC20 asset'), () => {
  it('should send USDC amount 5 to an address', async () => {
    await withFixtures(
      {
        dapps: [
          {
            dappVariant: DappVariants.TEST_DAPP,
          },
        ],
        fixture: new FixtureBuilder()
          .withGanacheNetwork()
          .withPermissionControllerConnectedToTestDapp(
            buildPermissions(['0x539']),
          )
          .withTokensForAllPopularNetworks([
            {
              address: '0x0000000000000000000000000000000000000000',
              symbol: 'ETH',
              decimals: 18,
              name: 'Ethereum',
            },
            {
              address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
              symbol: 'USDC',
              decimals: 6,
              name: 'USD Coin',
            },
            {
              address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
              symbol: 'DAI',
              decimals: 18,
              name: 'Dai Stablecoin',
            },
          ])
          .build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();
        await device.disableSynchronization();

        // send 5 USDC
        await WalletView.tapWalletSendButton();
        await SendView.selectERC20Token();
        await SendView.pressAmountFiveButton();
        await SendView.pressContinueButton();
        await SendView.inputRecipientAddress(RECIPIENT);
        await SendView.pressReviewButton();
        await FooterActions.tapConfirmButton();
        await TabBarComponent.tapActivity();
        await Assertions.expectTextDisplayed('Sent USDC');
      },
    );
  });

  it('should send USDC amount 50% to an address', async () => {
    await withFixtures(
      {
        dapps: [
          {
            dappVariant: DappVariants.TEST_DAPP,
          },
        ],
        fixture: new FixtureBuilder()
          .withGanacheNetwork()
          .withPermissionControllerConnectedToTestDapp(
            buildPermissions(['0x539']),
          )
          .withTokensForAllPopularNetworks([
            {
              address: '0x0000000000000000000000000000000000000000',
              symbol: 'ETH',
              decimals: 18,
              name: 'Ethereum',
            },
            {
              address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
              symbol: 'USDC',
              decimals: 6,
              name: 'USD Coin',
            },
            {
              address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
              symbol: 'DAI',
              decimals: 18,
              name: 'Dai Stablecoin',
            },
          ])
          .build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();
        await device.disableSynchronization();

        // send 50% USDC
        await WalletView.tapWalletSendButton();
        await SendView.selectERC20Token();
        await SendView.pressFiftyPercentButton();
        await SendView.pressContinueButton();
        await SendView.inputRecipientAddress(RECIPIENT);
        await SendView.pressReviewButton();
        await FooterActions.tapConfirmButton();
        await TabBarComponent.tapActivity();
        await Assertions.expectTextDisplayed('Sent USDC');
      },
    );
  });

  it('should send USDC send maxto an address', async () => {
    await withFixtures(
      {
        dapps: [
          {
            dappVariant: DappVariants.TEST_DAPP,
          },
        ],
        fixture: new FixtureBuilder()
          .withGanacheNetwork()
          .withPermissionControllerConnectedToTestDapp(
            buildPermissions(['0x539']),
          )
          .withTokensForAllPopularNetworks([
            {
              address: '0x0000000000000000000000000000000000000000',
              symbol: 'ETH',
              decimals: 18,
              name: 'Ethereum',
            },
            {
              address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
              symbol: 'USDC',
              decimals: 6,
              name: 'USD Coin',
            },
            {
              address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
              symbol: 'DAI',
              decimals: 18,
              name: 'Dai Stablecoin',
            },
          ])
          .build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();
        await device.disableSynchronization();

        // send Max USDC
        await WalletView.tapWalletSendButton();
        await SendView.selectERC20Token();
        await SendView.pressAmountMaxButton();
        await SendView.pressContinueButton();
        await SendView.inputRecipientAddress(RECIPIENT);
        await SendView.pressReviewButton();
        await FooterActions.tapConfirmButton();
        await TabBarComponent.tapActivity();
        await Assertions.expectTextDisplayed('Sent USDC');
      },
    );
  });
});
