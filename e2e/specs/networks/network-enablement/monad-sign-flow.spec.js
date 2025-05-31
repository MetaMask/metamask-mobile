'use strict';
import Browser from '../../../pages/Browser/BrowserView';
import TestDApp from '../../../pages/Browser/TestDApp';
import { buildPermissions } from '../../../fixtures/utils';
import SigningBottomSheet from '../../../pages/Browser/SigningBottomSheet';
import TestHelpers from '../../../helpers';
import TabBarComponent from '../../../pages/wallet/TabBarComponent';
import { Regression } from '../../../tags';
import { loginToApp } from '../../../viewHelper';
import FixtureBuilder from '../../../fixtures/fixture-builder';
import { withFixtures } from '../../../fixtures/fixture-helper';
import { CustomNetworks } from '../../../resources/networks.e2e';
import Assertions from '../../../utils/Assertions';
import enContent from '../../../../locales/languages/en.json';

const MONAD_TESTNET = CustomNetworks.MonadTestnet.providerConfig.nickname;

describe(Regression('Monad Testnet Network Signing'), () => {
  const TOKEN_NAME = enContent.unit.monad;

  beforeAll(async () => {
    jest.setTimeout(170000);
    await TestHelpers.reverseServerPort();
  });

  it(`should sign personal message using ${MONAD_TESTNET}`, async () => {
    await withFixtures(
      {
        dapp: true,
        fixture: new FixtureBuilder()
          .withMonadTestnetNetwork()
          .withPermissionControllerConnectedToTestDapp(
            buildPermissions(['0x279f']))
          .build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();

        await TabBarComponent.tapBrowser();
        await Browser.navigateToTestDApp();

        await TestDApp.tapPersonalSignButton();
        await Assertions.checkIfVisible(SigningBottomSheet.personalRequest);
        await SigningBottomSheet.tapSignButton();
        await Assertions.checkIfNotVisible(SigningBottomSheet.typedRequest);
        await Assertions.checkIfNotVisible(SigningBottomSheet.personalRequest);
      },
    );
  });
});
