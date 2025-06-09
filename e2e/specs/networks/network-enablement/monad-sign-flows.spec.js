'use strict';
import Browser from '../../../pages/Browser/BrowserView';
import TestDApp from '../../../pages/Browser/TestDApp';
import { buildPermissions } from '../../../fixtures/utils';
import TestHelpers from '../../../helpers';
import TabBarComponent from '../../../pages/wallet/TabBarComponent';
import { SmokeNetworkEnablement } from '../../../tags';
import { loginToApp } from '../../../viewHelper';
import FixtureBuilder from '../../../fixtures/fixture-builder';
import { withFixtures } from '../../../fixtures/fixture-helper';
import { CustomNetworks } from '../../../resources/networks.e2e';
import Assertions from '../../../utils/Assertions';
import FooterActions from '../../../pages/Browser/Confirmations/FooterActions.js';
import RequestTypes from '../../../pages/Browser/Confirmations/RequestTypes.js';

const MONAD_TESTNET = CustomNetworks.MonadTestnet.providerConfig;
const SIGNATURE_LIST = [
  {
    specName: 'Personal Sign',
    testDappBtn: TestDApp.tapPersonalSignButton.bind(TestDApp),
    requestType: RequestTypes.PersonalSignRequest,
  },
  {
    specName: 'SIWE Sign',
    testDappBtn: TestDApp.tapEthereumSignButton.bind(TestDApp),
    requestType: RequestTypes.PersonalSignRequest,
  },
  {
    specName: 'Typed V1 Sign',
    testDappBtn: TestDApp.tapTypedSignButton.bind(TestDApp),
    requestType: RequestTypes.TypedSignRequest,
  },
  {
    specName: 'Typed V3 Sign',
    testDappBtn: TestDApp.tapTypedV3SignButton.bind(TestDApp),
    requestType: RequestTypes.TypedSignRequest,
  },
  {
    specName: 'Typed V4 Sign',
    testDappBtn: TestDApp.tapTypedV4SignButton.bind(TestDApp),
    requestType: RequestTypes.TypedSignRequest,
  },
  {
      specName: 'Sign Permit',
      testDappBtn: TestDApp.tapPermitSignButton.bind(TestDApp),
      requestType: RequestTypes.TypedSignRequest,
    },
];

describe(SmokeNetworkEnablement(`${MONAD_TESTNET.nickname} - Signing Flows`), () => {
  beforeAll(async () => {
    jest.setTimeout(170000);
    await TestHelpers.reverseServerPort();
  });

  // using for loop here to ensure synchronous execution
  for (let index = 0; index < SIGNATURE_LIST.length; index++) {
    const { specName, testDappBtn, requestType } = SIGNATURE_LIST[index];
    it(`should sign ${specName} using ${MONAD_TESTNET.nickname}`, async () => {
      await withFixtures(
        {
          dapp: true,
          fixture: new FixtureBuilder()
            .withMonadTestnetNetwork()
            .withPermissionControllerConnectedToTestDapp(
              buildPermissions([`${MONAD_TESTNET.chainId}`]),
            )
            .build(),
          restartDevice: true,
        },
        async () => {
          await loginToApp();

          await TabBarComponent.tapBrowser();
          await Browser.navigateToTestDApp();

          //Signing Flow
          await testDappBtn();
          await Assertions.checkIfVisible(requestType);
          await FooterActions.tapConfirmButton();
          await Assertions.checkIfNotVisible(requestType);
        },
      );
    });
  }
});
