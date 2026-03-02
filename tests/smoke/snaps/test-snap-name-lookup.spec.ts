import { FlaskBuildTests } from '../../tags';
import { loginToApp } from '../../flows/wallet.flow';
import { navigateToBrowserView } from '../../flows/browser.flow';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import TestSnaps from '../../page-objects/Browser/TestSnaps';
import TabBarComponent from '../../page-objects/wallet/TabBarComponent';
import WalletView from '../../page-objects/wallet/WalletView';
import RedesignedSendView from '../../page-objects/Send/RedesignedSendView';
import { Assertions } from '../../framework';

jest.setTimeout(150_000);

describe(FlaskBuildTests('Name Lookup Snap Tests'), () => {
  it('connects to the Name Lookup Snap', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
        skipReactNativeReload: true,
      },
      async () => {
        await loginToApp();
        await navigateToBrowserView();
        await TestSnaps.navigateToTestSnap();

        await TestSnaps.installSnap('connectNameLookupButton');
      },
    );
  });

  it('displays the recipient address in the send flow', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        skipReactNativeReload: true,
      },
      async () => {
        await TabBarComponent.tapHome();
        await WalletView.tapWalletSendButton();

        await RedesignedSendView.selectEthereumToken();
        await RedesignedSendView.inputRecipientAddress('metamask.domain');

        await Assertions.expectTextDisplayed('0xc0ffe...54979');
      },
    );
  });
});
