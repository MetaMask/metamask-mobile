import { SmokeNetworkExpansion } from '../../tags';
import Assertions from '../../framework/Assertions';
import TestHelpers from '../../helpers';
import { withSolanaAccountEnabled } from '../../common-solana';
import FixtureBuilder, {
  DEFAULT_FIXTURE_ACCOUNT,
  DEFAULT_FIXTURE_ACCOUNT_2,
  DEFAULT_FIXTURE_ACCOUNT_CHECKSUM,
} from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import TestDApp from '../../pages/Browser/TestDApp';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import Browser from '../../pages/Browser/BrowserView';
import { BrowserViewSelectorsIDs } from '../../selectors/Browser/BrowserView.selectors';
import ConnectBottomSheet from '../../pages/Browser/ConnectBottomSheet';
import ConnectedAccountsModal from '../../pages/Browser/ConnectedAccountsModal';
import NetworkConnectMultiSelector from '../../pages/Browser/NetworkConnectMultiSelector';
import { NetworkNonPemittedBottomSheetSelectorsText } from '../../selectors/Network/NetworkNonPemittedBottomSheet.selectors';
import { loginToApp } from '../../viewHelper';
import {
  Caip25CaveatType,
  Caip25EndowmentPermissionName,
} from '@metamask/chain-agnostic-permission';
import Matchers from '../../framework/Matchers';
import { DappVariants } from '../../framework/Constants';
import { createLogger } from '../../framework/logger';
import { SmokeWalletPlatform } from '../../tags';
import { error } from 'console';

const logger = createLogger({
  name: 'multiple-provider-connections.spec.ts',
});

describe(SmokeWalletPlatform('EVM Dapp Connections'), () => {
  beforeAll(async () => {
    jest.setTimeout(150000);
  });

  it('should notify the connected account and chain on load of permitted dapp', async () => {
   await withFixtures(
      {
        dapps: [
          {
            dappVariant: DappVariants.TEST_DAPP,
          },
        ],
        fixture: new FixtureBuilder()
          .withImportedHdKeyringAndTwoDefaultAccountsOneImportedHdAccountKeyringController()
          .withPermissionControllerConnectedToTestDapp()
          .build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();
        await TabBarComponent.tapBrowser();
        await Browser.navigateToTestDApp();

        const connectedAccounts = await TestDApp.getConnectedAccounts()
        if (connectedAccounts !== DEFAULT_FIXTURE_ACCOUNT_CHECKSUM) {
          throw new Error('connected accounts did not match');
        }

        const connectedChainId = await TestDApp.getConnectedChainId()
        if (connectedChainId !== '0x1') {
          throw new Error('connected chain ID did not match')
        }
      });
  })

  it('should notify account changes on when adding and removing a permitted account for a permitted dapp', () => {

  })

  it('should notify the newly selected account on when changing the selected account for a permitted dapp', () => {

  })

  it('should notify the connected account and chain after permitting a previously unpermitted dapp', () => {

  })
});
