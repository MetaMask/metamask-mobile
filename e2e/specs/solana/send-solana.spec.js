'use strict';
import { SmokeConfirmations } from '../../tags';
import WalletView from '../../pages/wallet/WalletView';
import { loginToApp } from '../../viewHelper';
import FixtureBuilder from '../../fixtures/fixture-builder';
import {
  withFixtures,
  defaultGanacheOptions,
} from '../../fixtures/fixture-helper';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import WalletActionsBottomSheet from '../../pages/wallet/WalletActionsBottomSheet';
import TestHelpers from '../../helpers';
import Assertions from '../../utils/Assertions';
import { mockEvents } from '../../api-mocking/mock-config/mock-events';
import AddAccountBottomSheet from '../../pages/wallet/AddAccountBottomSheet';
import AccountListBottomSheet from '../../pages/wallet/AccountListBottomSheet';
import Gestures from '../../utils/Gestures';
import SendView from '../../pages/Send/SendView';
import WalletViewSelectorsText from '../../selectors/wallet/WalletView.selectors.js';
import { startMockServer, stopMockServer } from '../../api-mocking/mock-server';

const VALID_ADDRESS = '4Nd1mU6z1H7dffRCHfLtUJYXe9aM6sT3V9W2MDADjA9h';
const INVALID_ADDRESS = '0x0000000000000000000000000000000000000000';
const ACCOUNT_ONE_TEXT = 'Solana Account 1';
const INVALID_SOLANA_ADDRESS_TEXT = 'Invalid Solana address';
const SOLANA_GET_BALANCE_REGEX = /^https:\/\/solana-mainnet\.infura\.io\/v3\/.*/u;

// 
const mockMetaMaskAccountsAPIBalanceGeneric = () => ({
  urlEndpoint: 'https://accounts.api.cx.metamask.io/v2/accounts/*/balances',
  response: {
    balances: [
      {
        address: 'CEQ87PmqFPA8cajAXYVrFT2FQobRrAT4Wd53FvfgYrrd',
        chainId: 'solana:mainnet',
        balance: '5000000000', // 5 SOL in lamports
        tokenAddress: 'native',
        token: {
          name: 'Solana',
          symbol: 'SOL',
          decimals: 9
        }
      }
    ]
  },
  responseCode: 200
});


const mockSolanaAccountsAPIBalanceSpecificExact = () => ({
  urlEndpoint: 'https://accounts.api.cx.metamask.io/v2/accounts/CEQ87PmqFPA8cajAXYVrFT2FQobRrAT4Wd53FvfgYrrd/balances?networks=1', // Exact URL
  response: {
    count: 1,
    balances: [
      {
        object: 'token',
        address: 'native',
        symbol: 'SOL',
        name: 'Solana',
        type: 'native',
        decimals: 9,
        balance: '5000000000', // 5 SOL
        chainId: 'solana:mainnet'
      }
    ],
    unprocessedNetworks: []
  },
  responseCode: 200,
  // isRegexUrl: false // Default is false
});

const solanaGetBalance = () => ({
  urlEndpoint: SOLANA_GET_BALANCE_REGEX,
  response: {
    jsonrpc: '2.0',
    result: {
      context: {
        apiVersion: '2.1.21',
        slot: 335131784,
      },
      value: 99742964,
    },
    id: 11,
  },
  responseCode: 200,
  isRegexUrl: true, // Explicitly set isRegexUrl
});
// --- End Mocks ---

describe(SmokeConfirmations('Send SOL'), () => {
  let mockServerInstance; // Variable to hold the mock server instance

  beforeAll(async () => {
    jest.setTimeout(170000);
    await TestHelpers.reverseServerPort();
  });

  afterEach(async () => {
    // Ensure mock server is stopped after each test
    if (mockServerInstance) {
      await stopMockServer(mockServerInstance);
      mockServerInstance = null; // Reset the instance
    }
  });

  it('should send SOL using mocked transaction responses', async () => {
    mockServerInstance = await startMockServer({
      POST: [solanaGetBalance()],
    });

    await withFixtures(
      {
        fixture: new FixtureBuilder()
          .withDefaultFixture()
          .withSolanaNetwork()
          .build(),
        restartDevice: true,
        
      },
      async () => {
        // Login and navigate to account
        await loginToApp();
        await Assertions.checkIfVisible(WalletView.container);
        await WalletView.tapIdenticon();
        await Assertions.checkIfVisible(AccountListBottomSheet.accountList);
        await AccountListBottomSheet.tapAddAccountButton();
        await AddAccountBottomSheet.tapCreateSolanaAccount();
        await TestHelpers.delay(3000); // Wait for account creation
        await Assertions.checkIfTextRegexExists(new RegExp(ACCOUNT_ONE_TEXT), 1); // Use constant
        await AccountListBottomSheet.tapToSelectActiveAccountAtIndex(1);
        await TestHelpers.delay(2000); // Wait for UI update

        // Verify account is selected
        await Assertions.checkIfTextRegexExists(new RegExp(ACCOUNT_ONE_TEXT), 0); // Use constant

        // Initiate send flow
        await TabBarComponent.tapActions();
        await WalletActionsBottomSheet.tapSendButton();

        // Enter transaction details
        await SendView.inputSolanaAddress(VALID_ADDRESS);
        await SendView.inputSolanaAmount('0.5');

        // Proceed with transaction
        await SendView.tapNextButton();
        await TestHelpers.delay(5000); // Wait for confirmation screen

      },
    );
    // Note: The finally block is removed as cleanup is handled by afterEach
  });
});
