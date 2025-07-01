'use strict';
import { SmokeMultiStandardDappConnection } from '../../../tags';
import Assertions from '../../../utils/Assertions';
import TestHelpers from '../../../helpers';
import { withSolanaAccountEnabled } from '../../../common-solana';
import MultichainTestDApp from '../../../pages/Browser/MultichainTestDApp';
import MultichainUtilities from '../../../utils/MultichainUtilities';
import { DEFAULT_FIXTURE_ACCOUNT, DEFAULT_SOLANA_FIXTURE_ACCOUNT } from '../../../fixtures/fixture-builder';
import { SolScope } from '@metamask/keyring-api';
import { DEFAULT_MULTICHAIN_TEST_DAPP_PATH } from '../../../fixtures/fixture-helper';

describe(SmokeMultiStandardDappConnection('Multiple Standard Dapp Connections'), () => {
  beforeAll(async () => {
    jest.setTimeout(150000);
  });

  // it('should default account selection to already permitted account(s) plus the selected account (if not already permitted) when `wallet_requestPermissions` is called with no accounts specified', async () => { });
  // it('should default account selection to both accounts when `wallet_requestPermissions` is called with specific account while another is already connected', async () => { });
  // it('should retain EVM permissions when connecting through the Solana Wallet Standard', async () => { });
  // it('should retain Solana permissions when connecting through the EVM provider', async () => { });
  // it('should default account selection to already permitted Solana account and requested Ethereum account when `wallet_requestPermissions` is called with specific Ethereum account', async () => { });
  it('should be able to request specific chains when connecting through the EVM provider with existing permissions', async () => {
    await withSolanaAccountEnabled({
      dappPath: DEFAULT_MULTICHAIN_TEST_DAPP_PATH,
      solanaAccountPermitted: true,
    }, async () => {
      await MultichainTestDApp.setupAndNavigateToTestDapp('?autoMode=true', true);

      await MultichainTestDApp.createSessionWithNetworks(
        MultichainUtilities.NETWORK_COMBINATIONS.SINGLE_ETHEREUM
      );

      // Wait for session creation and get the data separately
      await TestHelpers.delay(1000);
      const sessionResult = await MultichainTestDApp.getSessionData();

      const expectedSolanaSessionScope = sessionResult?.sessionScopes?.[SolScope.Mainnet];
      await Assertions.checkIfTextMatches(expectedSolanaSessionScope?.accounts[0] ?? '', `${SolScope.Mainnet}:${DEFAULT_SOLANA_FIXTURE_ACCOUNT}`);

      const expectedEthereumSessionScope = sessionResult?.sessionScopes?.['eip155:1'];
      await Assertions.checkIfTextMatches(expectedEthereumSessionScope?.accounts[0].toLowerCase() ?? '', `eip155:1:${DEFAULT_FIXTURE_ACCOUNT.toLowerCase()}`);
    });
  });
});
