/**
 * CI Sanity Check — minimal navigation test.
 *
 * Purpose: verify that the app starts, logs in, and renders the Wallet view.
 * This test is intentionally trivial; it is only used to validate the CI
 * pipeline itself (build, download, device-boot) and is NOT a feature test.
 *
 * Tag: CiSanityCheck
 * To revert: delete this file and remove the CiSanityCheck tag/job entries.
 */
import { CiSanityCheck } from '../../tags';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import WalletView from '../../page-objects/wallet/WalletView';
import { loginToApp } from '../../flows/wallet.flow';
import Assertions from '../../framework/Assertions';

describe(CiSanityCheck('App navigation sanity check'), () => {
  it('should open the app and show the Wallet view', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();
        await Assertions.expectElementToBeVisible(WalletView.container);
      },
    );
  });
});
