/**
 * Defines a test suite for lending functionality, parameterized to test lending different tokens
 * (DAI, USDC, USDT) on different networks (Tenderly Mainnet and Arbitrum). Each test checks that
 * after lending a specified quantity of a source token, the corresponding destination token is received.
 */

import { ethers } from 'ethers';
import { Mockttp } from 'mockttp';
import { SmokeTrade } from '../../tags';
import { loginToApp } from '../../viewHelper';
import EarnView from '../../pages/Earn/EarnView';
import Assertions from '../../framework/Assertions';
import ToastModal from '../../pages/wallet/ToastModal';
import WalletView from '../../pages/wallet/WalletView';
import TokenOverview from '../../pages/wallet/TokenOverview';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import { CustomNetworks } from '../../resources/networks.e2e.js';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import {
  getMarkets,
  fundAccount,
  setTokenBalance,
  getTokenDetails,
  proxyInfuraRequests,
  selectImportedAccount,
  getNativeTokenDetails,
} from './helpers/prepareLendingEnvironment';
import { setupMockRequest } from '../../api-mocking/helpers/mockHelpers';

// Running with SmokeTrade tag to optimize parallel test runs in bitrise pipeline
describe(SmokeTrade('Lending'), () => {
  // Generated random wallet for testing
  const wallet = ethers.Wallet.createRandom();

  // Lending parameters
  const rate = 3.0;
  const depositAmt = 20;
  const withdrawAmt = 10;
  const tokenBalance = 100;

  // Actions
  const action = {
    dp: 'deposit',
    wt: 'withdraw',
    dpm: 'deposit more',
  };

  beforeAll(async () => {
    jest.setTimeout(2500000);
  });

  /* These tests are parameterized to run with different tokens and networks.
    The test cases are designed to check the lending functionality for DAI, USDC,
    and USDT on the Tenderly networks (Mainnet/Linea/Arbitrum/Base/BNB).
    Each test will:
      1. Log in to the application.
      2. Set up the environment by funding the account with the specified token.
      3. Navigate to the Earn view.
      4. Perform the lending action (deposit / withdraw / deposit more).
      5. Verify that the expected token balance is updated correctly.
**/

  // ${action.dp}   | ${depositAmt}  | ${'DAI'}       | ${'ADAI'}       | ${CustomNetworks.Tenderly.Mainnet}
  // ${action.wt}   | ${withdrawAmt} | ${'ADAI'}      | ${'DAI'}        | ${CustomNetworks.Tenderly.Mainnet}
  // ${action.dpm}  | ${depositAmt}  | ${'DAI'}       | ${'ADAI'}       | ${CustomNetworks.Tenderly.Mainnet}

  // ${action.dp}   | ${depositAmt}  | ${'USDC'}      | ${'AUSDC'}      | ${CustomNetworks.Tenderly.Mainnet}
  // ${action.wt}   | ${withdrawAmt} | ${'AUSDC'}     | ${'USDC'}       | ${CustomNetworks.Tenderly.Mainnet}
  // ${action.dpm}  | ${depositAmt}  | ${'USDC'}      | ${'AUSDC'}      | ${CustomNetworks.Tenderly.Mainnet}

  // ${action.dp}   | ${depositAmt}  | ${'USDT'}      | ${'AUSDT'}      | ${CustomNetworks.Tenderly.Mainnet}
  // ${action.wt}   | ${withdrawAmt} | ${'AUSDT'}     | ${'USDT'}       | ${CustomNetworks.Tenderly.Mainnet}
  // ${action.dpm}  | ${depositAmt}  | ${'USDT'}      | ${'AUSDT'}      | ${CustomNetworks.Tenderly.Mainnet}

  // ${action.dp}   | ${depositAmt}  | ${'USDC'}      | ${'AUSDC'}      | ${CustomNetworks.Tenderly.Linea}
  // ${action.wt}   | ${withdrawAmt} | ${'AUSDC'}     | ${'USDC'}       | ${CustomNetworks.Tenderly.Linea}
  // ${action.dpm}  | ${depositAmt}  | ${'USDC'}      | ${'AUSDC'}      | ${CustomNetworks.Tenderly.Linea}

  // ${action.dp}   | ${depositAmt}  | ${'USDT'}      | ${'ALINUSDT'}   | ${CustomNetworks.Tenderly.Linea}
  // ${action.wt}   | ${withdrawAmt} | ${'ALINUSDT'}  | ${'USDT'}       | ${CustomNetworks.Tenderly.Linea}
  // ${action.dpm}  | ${depositAmt}  | ${'USDT'}      | ${'ALINUSDT'}   | ${CustomNetworks.Tenderly.Linea}

  // ${action.dp}   | ${depositAmt}  | ${'DAI'}       | ${'ADAI'}       | ${CustomNetworks.Tenderly.Arbitrum}
  // ${action.wt}   | ${withdrawAmt} | ${'ADAI'}      | ${'DAI'}        | ${CustomNetworks.Tenderly.Arbitrum}
  // ${action.dpm}  | ${depositAmt}  | ${'DAI'}       | ${'ADAI'}       | ${CustomNetworks.Tenderly.Arbitrum}

  // ${action.dp}   | ${depositAmt}  | ${'USDC'}      | ${'AUSDC'}      | ${CustomNetworks.Tenderly.Arbitrum}
  // ${action.wt}   | ${withdrawAmt} | ${'AUSDC'}     | ${'USDC'}       | ${CustomNetworks.Tenderly.Arbitrum}
  // ${action.dpm}  | ${depositAmt}  | ${'USDC'}      | ${'AUSDC'}      | ${CustomNetworks.Tenderly.Arbitrum}

  // ${action.dp}   | ${depositAmt}  | ${'USDT0'}     | ${'AUSDT'}      | ${CustomNetworks.Tenderly.Arbitrum}
  // ${action.wt}.  | ${withdrawAmt} | ${'AUSDT'}     | ${'USDT0'}      | ${CustomNetworks.Tenderly.Arbitrum}
  // ${action.dpm}  | ${depositAmt}  | ${'USDT0'}     | ${'AUSDT'}      | ${CustomNetworks.Tenderly.Arbitrum}

  // ${action.dp}   | ${depositAmt}  | ${'USDC'}      | ${'AUSDC'}      | ${CustomNetworks.Tenderly.Base}
  // ${action.wt}   | ${withdrawAmt} | ${'AUSDC'}     | ${'USDC'}       | ${CustomNetworks.Tenderly.Base}
  // ${action.dpm}  | ${depositAmt}  | ${'USDC'}      | ${'AUSDC'}      | ${CustomNetworks.Tenderly.Base}

  // ${action.dp}   | ${depositAmt}  | ${'USDC'}      | ${'ABNBUSDC'}   | ${CustomNetworks.Tenderly.BNB}
  // ${action.wt}   | ${withdrawAmt} | ${'ABNBUSDC'}  | ${'USDC'}       | ${CustomNetworks.Tenderly.BNB}
  // ${action.dpm}  | ${depositAmt}  | ${'USDC'}      | ${'ABNBUSDC'}   | ${CustomNetworks.Tenderly.BNB}

  // ${action.dp}   | ${depositAmt}  | ${'USDC'}      | ${'ABNBUSDC'}   | ${CustomNetworks.Tenderly.BNB}
  // ${action.wt}   | ${withdrawAmt} | ${'ABNBUSDC'}  | ${'USDC'}       | ${CustomNetworks.Tenderly.BNB}
  // ${action.dpm}  | ${depositAmt}  | ${'USDC'}      | ${'ABNBUSDC'}   | ${CustomNetworks.Tenderly.BNB}

  // ${action.dp}   | ${depositAmt}  | ${'USDT'}      | ${'ABNBUSDT'}   | ${CustomNetworks.Tenderly.BNB}
  // ${action.wt}   | ${withdrawAmt} | ${'ABNBUSDT'}  | ${'USDT'}       | ${CustomNetworks.Tenderly.BNB}
  // ${action.dpm}  | ${depositAmt}  | ${'USDT'}      | ${'ABNBUSDT'}   | ${CustomNetworks.Tenderly.BNB}

  /* Test is designed to run in the following order:
    1. Deposit
    2. Withdraw
    3. Deposit More
 */

  it.each`
    type          | quantity       | srcTokenSymbol | dstTokenSymbol | network
    ${action.dp}  | ${depositAmt}  | ${'DAI'}       | ${'ADAI'}      | ${CustomNetworks.Tenderly.Mainnet}
    ${action.wt}  | ${withdrawAmt} | ${'ADAI'}      | ${'DAI'}       | ${CustomNetworks.Tenderly.Mainnet}
    ${action.dpm} | ${depositAmt}  | ${'DAI'}       | ${'ADAI'}      | ${CustomNetworks.Tenderly.Mainnet}
  `(
    'should $type $quantity $srcTokenSymbol and recieve $dstTokenSymbol on $network.providerConfig.nickname',
    async ({
      type,
      quantity,
      srcTokenSymbol,
      dstTokenSymbol,
      network,
    }): Promise<void> => {
      const { providerConfig } = network;
      const { rpcUrl, chainId } = providerConfig;
      // token details
      const nativeTokenDetails = await getNativeTokenDetails(chainId);
      const srcTokenDetails = await getTokenDetails(chainId, srcTokenSymbol);
      const dstTokenDetails = await getTokenDetails(chainId, dstTokenSymbol);
      if (type === action.dp) {
        // fund the account and source token
        await fundAccount(
          rpcUrl,
          wallet.address,
          chainId,
          nativeTokenDetails,
          tokenBalance,
        );
        await setTokenBalance(
          rpcUrl,
          wallet.address,
          chainId,
          srcTokenDetails,
          tokenBalance,
        );
      }
      // Build the mock server responses
      const testSpecificMock = async (mockServer: Mockttp) => {
        const markets =
          type === action.dp || type === action.dpm
            ? await getMarkets(
                chainId,
                srcTokenDetails.address,
                dstTokenDetails.address,
                rate,
              )
            : await getMarkets(
                chainId,
                dstTokenDetails.address,
                srcTokenDetails.address,
                rate,
              );
        await setupMockRequest(mockServer, {
          requestMethod: 'GET',
          url: markets.urlEndpoint,
          response: markets.response,
          responseCode: markets.responseCode,
        });
        const proxies = await proxyInfuraRequests(chainId, rpcUrl);
        await setupMockRequest(mockServer, {
          requestMethod: 'POST',
          url: proxies.urlEndpoint,
          response: proxies.response,
          responseCode: proxies.responseCode,
        });
      };
      // setup the fixture with the network and tokens
      await withFixtures(
        {
          restartDevice: true,
          testSpecificMock,
          fixture: new FixtureBuilder()
            .withNetworkController(network)
            .withRandomImportedAccountKeyringController(
              wallet.address,
              wallet.privateKey,
            )
            .withPreferencesController({ useTransactionSimulations: false })
            .withPreferencesController({ smartTransactionsOptInStatus: false })
            .withTokens(
              [
                srcTokenDetails as unknown as Record<string, unknown>,
                dstTokenDetails as unknown as Record<string, unknown>,
              ],
              chainId,
              wallet.address.toLowerCase(),
            )
            .build(),
        },
        async () => {
          // 0. Login and select the imported account
          await loginToApp();
          await selectImportedAccount();

          // 1. Disable synchronization
          console.log('Disabling synchronization');
          await device.disableSynchronization();

          // 2. Check the tokens populated in the wallet
          await Assertions.expectElementToBeVisible(WalletView.container);
          if (type === action.dp) {
            console.log(
              `Check balance of native token: ${tokenBalance} ${nativeTokenDetails.symbol}`,
            );
            await Assertions.expectTextDisplayed(
              `${tokenBalance} ${nativeTokenDetails.symbol}`,
            );
            console.log(
              `Check balance of the source token: ${tokenBalance} ${srcTokenSymbol}`,
            );
            await Assertions.expectTextDisplayed(
              `${tokenBalance} ${srcTokenSymbol}`,
            );
          } else if (type === action.wt) {
            console.log(
              `Check balance of the destination token: ${
                tokenBalance - depositAmt
              } ${dstTokenSymbol}`,
            );
            await Assertions.expectTextDisplayed(
              `${tokenBalance - depositAmt} ${dstTokenSymbol}`,
            );
          } else if (type === action.dpm) {
            console.log(
              `Check balance of the source token: ${
                tokenBalance + withdrawAmt - quantity
              } ${srcTokenSymbol}`,
            );
            await Assertions.expectTextDisplayed(
              `${tokenBalance + withdrawAmt - quantity} ${srcTokenSymbol}`,
            );
          }

          // 3. Navigate to the Earn view
          if (type === action.dp) {
            console.log('Tapping on Token CTA text');
            await WalletView.tapTokenCtaAprText(srcTokenSymbol);
            console.log('Checking if Earn view is visible');
            await Assertions.expectElementToBeVisible(EarnView.depositText);
          } else if (type === action.wt) {
            console.log(`Tapping on ${srcTokenSymbol}`);
            await WalletView.tapTokenById(srcTokenSymbol);
            console.log('Scrolling down');
            await Assertions.expectElementToBeVisible(TokenOverview.container);
            await TokenOverview.scrollOnScreen();
            console.log('Tapping on Withdraw button');
            await TokenOverview.tapWithdrawButton();
            await Assertions.expectElementToBeVisible(EarnView.withdrawText);
          } else if (type === action.dpm) {
            console.log(`Tapping on ${srcTokenSymbol}`);
            await WalletView.tapTokenById(srcTokenSymbol);
            console.log('Scrolling down');
            await Assertions.expectElementToBeVisible(TokenOverview.container);
            await TokenOverview.scrollOnScreen();
            console.log('Tapping on Deposit More button');
            await TokenOverview.tapDepositButton();
            await Assertions.expectElementToBeVisible(EarnView.depositText);
          }

          // 4. Enter the amount to lend
          console.log(`Entering amount: ${quantity}`);
          await EarnView.enterAmount(quantity.toString());
          console.log('Tapping on Review button');
          await EarnView.tapReview();
          if (type === action.dp || type === action.dpm) {
            console.log(`Checking details for ${quantity} ${dstTokenSymbol}`);
            await Assertions.expectElementToBeVisible(
              EarnView.tokenInReview(dstTokenDetails.name),
            );
            await Assertions.expectElementToBeVisible(
              EarnView.tokenInReview(`${quantity} ${dstTokenSymbol}`),
            );
          } else if (type === action.wt) {
            console.log(`Checking details for ${quantity} ${srcTokenSymbol}`);
            await Assertions.expectElementToBeVisible(
              EarnView.tokenInReview(`${quantity} ${srcTokenSymbol}`),
            );
          }

          // 5. Approve the transaction
          console.log('Tapping on Approve button');
          // await TestHelpers.delay(1000);
          await EarnView.tapApprove();
          if (type === action.dp || type === action.dpm) {
            console.log(`Checking Spend Cap for ${quantity} ${srcTokenSymbol}`);
            await Assertions.expectElementToBeVisible(EarnView.spendCapText);
            await Assertions.expectElementToBeVisible(
              EarnView.tokenInReview(`${quantity} ${srcTokenSymbol}`),
            );
            console.log('Tapping on Confirm button');
            await EarnView.tapConfirm();
            console.log('Tapping on Approve button');
            await EarnView.tapApprove();
            console.log('Waiting for step progress to be completed');
            await Assertions.expectElementToBeVisible(
              EarnView.completeStepProgress,
            );
            console.log('Tapping on Confirm button');
            // Button has same id as confirm button
            await EarnView.tapApprove();
          }

          // 6. Confirm the transaction
          console.log('Checking on transaction request');
          await Assertions.expectElementToBeVisible(EarnView.txtRequest);
          console.log('Tapping on Confirm button');
          // await TestHelpers.delay(1000);
          await EarnView.tapConfirm();
          console.log('Checking on transaction confirmation');
          await Assertions.expectElementToBeVisible(EarnView.txtSubmittedToast);
          await Assertions.expectElementToNotBeVisible(
            EarnView.txtSubmittedToast,
          );

          // 7. Check transaction history
          console.log('Checking on transaction history');
          await Assertions.expectElementToBeVisible(EarnView.txtHistory);
          if (type === action.dp || type === action.dpm) {
            console.log('Checking on approve transaction');
            await Assertions.expectElementToBeVisible(EarnView.txtApprove);
            console.log('Checking on lending deposit transaction');
            await Assertions.expectElementToBeVisible(EarnView.txtLending);
          } else if (type === action.wt) {
            console.log('Checking on lending withdrawal transaction');
            await Assertions.expectElementToBeVisible(EarnView.txtWithdraw);
          }
          console.log('Checking on transaction toast');
          await Assertions.expectElementToBeVisible(
            ToastModal.notificationTitle,
          );
          await Assertions.expectElementToNotBeVisible(
            ToastModal.notificationTitle,
          );

          console.log('Moving to wallet tab');
          await Assertions.expectElementToBeVisible(
            TabBarComponent.tabBarWalletButton,
          );
          await TabBarComponent.tapWallet();

          // 8. Check token balances in the wallet
          if (type === action.dp) {
            console.log(
              `Check balance of the source token: ${
                tokenBalance - depositAmt
              } ${srcTokenSymbol}`,
            );
            await Assertions.expectTextDisplayed(
              `${tokenBalance - depositAmt} ${srcTokenSymbol}`,
            );
          } else if (type === action.wt) {
            console.log(
              `Check balance of the destination token: ${
                tokenBalance - depositAmt + quantity
              } ${dstTokenSymbol}`,
            );
            await Assertions.expectTextDisplayed(
              `${tokenBalance - depositAmt + quantity} ${dstTokenSymbol}`,
            );
          } else if (type === action.dpm) {
            console.log(
              `Check balance of the source token: ${
                tokenBalance - depositAmt + withdrawAmt - quantity
              } ${srcTokenSymbol}`,
            );
            await Assertions.expectTextDisplayed(
              `${
                tokenBalance - depositAmt + withdrawAmt - quantity
              } ${srcTokenSymbol}`,
            );
          }
        },
      );
    },
  );
});
