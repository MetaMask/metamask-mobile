'use strict';
import { SmokeNetworkExpansion } from '../../../tags';
import FixtureBuilder from '../../../fixtures/fixture-builder';
import {
  DEFAULT_MULTICHAIN_TEST_DAPP_FIXTURE_OPTIONS,
  DEFAULT_SOLANA_TEST_DAPP_PATH,
  withFixtures,
} from '../../../fixtures/fixture-helper';
import Assertions from '../../../utils/Assertions';
import SolanaTestDApp from '../../../pages/Browser/SolanaTestDApp';
import { connectSolanaTestDapp, setup } from './testHelpers';
import ConnectBottomSheet from '../../../pages/Browser/ConnectBottomSheet';
import TestHelpers from '../../../helpers';

describe(SmokeNetworkExpansion('Solana Wallet Standard E2E - Connect'), () => {
  beforeAll(async () => {
    jest.setTimeout(150000);
  });

  describe('Connect to Solana test dapp', () => {
    it('Should connect', async () => {
      await withFixtures(
        {
          ...DEFAULT_MULTICHAIN_TEST_DAPP_FIXTURE_OPTIONS,
          fixture: new FixtureBuilder()
            .withSolanaFixture()
            .withSolanaFeatureSheetDisplayed()
            .build(),
          dappPath: DEFAULT_SOLANA_TEST_DAPP_PATH,
          restartDevice: true,
        },
        async () => {
          await setup();

          await connectSolanaTestDapp();

          const account = await SolanaTestDApp.getHeader().getAccount();
          await Assertions.checkIfTextMatches(account, 'CEQ8...Yrrd');
        },
      );
    });

    it('Should be able to cancel connection and connect again', async () => {
      await withFixtures(
        {
          ...DEFAULT_MULTICHAIN_TEST_DAPP_FIXTURE_OPTIONS,
          fixture: new FixtureBuilder()
            .withSolanaFixture()
            .withSolanaFeatureSheetDisplayed()
            .build(),
          dappPath: DEFAULT_SOLANA_TEST_DAPP_PATH,
          restartDevice: true,
        },
        async () => {
          await setup();

          const header = SolanaTestDApp.getHeader();
          await header.connect();
          await header.selectMetaMask();

          // Click connect button
          await ConnectBottomSheet.tapCancelButton();

          await TestHelpers.delay(1000);
          const connectionStatus = await header.getConnectionStatus();
          await Assertions.checkIfTextMatches(
            connectionStatus,
            'Not connected',
          );

          await connectSolanaTestDapp();

          const account = await header.getAccount();
          await Assertions.checkIfTextMatches(account, 'CEQ8...Yrrd');
        },
      );
    });
  });

  describe('Disconnect from Solana test dapp', () => {
    it('Should disconnect', async () => {
      await withFixtures(
        {
          ...DEFAULT_MULTICHAIN_TEST_DAPP_FIXTURE_OPTIONS,
          fixture: new FixtureBuilder()
            .withSolanaFixture()
            .withSolanaFeatureSheetDisplayed()
            .build(),
          dappPath: DEFAULT_SOLANA_TEST_DAPP_PATH,
          restartDevice: true,
        },
        async () => {
          await setup();

          await connectSolanaTestDapp();

          const header = SolanaTestDApp.getHeader();

          const account = await header.getAccount();
          await Assertions.checkIfTextMatches(account, 'CEQ8...Yrrd');
          const connectionStatus = await header.getConnectionStatus();
          await Assertions.checkIfTextMatches(connectionStatus, 'Connected');

          await header.disconnect();

          const connectionStatusAfterDisconnect =
            await header.getConnectionStatus();
          await Assertions.checkIfTextMatches(
            connectionStatusAfterDisconnect,
            'Not connected',
          );
        },
      );
    });
  });
});
