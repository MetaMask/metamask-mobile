import { Mockttp } from 'mockttp';
import { PerpsMarketBalanceActionsSelectorsIDs } from '../../../app/components/UI/Perps/Perps.testIds.js';
import {
  PERPS_ARBITRUM_MOCKS,
  mockPerpsGeolocation,
} from '../../api-mocking/mock-responses/perps-arbitrum-mocks.js';
import { setupRemoteFeatureFlagsMock } from '../../api-mocking/helpers/remoteFeatureFlagsHelper.js';
import Assertions from '../../framework/Assertions.js';
import { RampsRegions, RampsRegionsEnum } from '../../framework/Constants.js';
import Gestures from '../../framework/Gestures.js';
import Matchers from '../../framework/Matchers.js';
import Utilities from '../../framework/Utilities.js';
import { asPlaywrightElement } from '../../framework/EncapsulatedElement.js';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder.js';
import { withFixtures } from '../../framework/fixtures/FixtureHelper.js';
import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { LocalNodeType, TestSuiteParams } from '../../framework/types.js';
import {
  beginPerpsSmokeTestPlaywright,
  PERPS_SMOKE_PERMISSIONS,
} from '../../helpers/perps/perps-smoke-helpers.js';
import PerpsE2EModifiers from '../../helpers/perps/perps-modifiers.js';
import PerpsDepositView from '../../page-objects/Perps/PerpsDepositView.js';
import PerpsHomeView from '../../page-objects/Perps/PerpsHomeView.js';
import ToastModal from '../../page-objects/wallet/ToastModal.js';
import WalletView from '../../page-objects/wallet/WalletView.js';
import { Hardfork } from '../../seeder/anvil-manager.js';
import { SmokePerps } from '../../tags.js';

appiumTest.describe.skip(
  SmokePerps('Perps - Add funds (has funds, not first time)'),
  () => {
    appiumTest(
      'deposits $80 from Add funds and verifies updated balance',
      async ({ driver: _driver, currentDeviceDetails }) => {
        await withFixtures(
          {
            fixture: new FixtureBuilder()
              .withPerpsProfile('no-positions')
              .withPerpsFirstTimeUser(false)
              .withAccountTreeController()
              .withKeyringControllerOfMultipleAccounts()
              .withNetworkController({
                type: 'rpc',
                chainId: '0xa4b1',
                rpcUrl: 'https://arb1.arbitrum.io/rpc',
                nickname: 'Arbitrum One',
                ticker: 'ETH',
              })
              .withTokensForAllPopularNetworks([
                {
                  address: '0xff970a61a04b1ca14834a43f5de4533ebddb5cc8',
                  symbol: 'USDC',
                  decimals: 6,
                  name: 'USD Coin',
                  type: 'erc20',
                },
              ])
              .withTokens(
                [
                  {
                    address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
                    symbol: 'USDC',
                    decimals: 6,
                    name: 'USD Coin',
                    type: 'erc20',
                  },
                ],
                '0xa4b1',
                '0xbacec2e26c5c794de6e82a1a7e21b9c329fa8cf6',
              )
              .build(),
            restartDevice: true,
            currentDeviceDetails,
            permissions: PERPS_SMOKE_PERMISSIONS,
            testSpecificMock: async (mockServer: Mockttp) => {
              await setupRemoteFeatureFlagsMock(mockServer, {});
              await PERPS_ARBITRUM_MOCKS(mockServer);
              await mockPerpsGeolocation(
                mockServer,
                RampsRegions[RampsRegionsEnum.SPAIN],
              );
            },
            useCommandQueueServer: true,
            localNodeOptions: [
              {
                type: LocalNodeType.anvil,
                options: { hardfork: 'prague' as Hardfork },
              },
            ],
          },
          async ({ commandQueueServer }: TestSuiteParams) => {
            if (!commandQueueServer) {
              throw new Error('Command queue server not found');
            }

            await beginPerpsSmokeTestPlaywright();
            await Assertions.expectElementToBeVisible(WalletView.container, {
              description: 'Wallet view visible',
            });

            await WalletView.scrollAndTapPerpsSection();
            await PerpsHomeView.tapExploreCryptoIfVisible();

            const addFundsButton = Matchers.getElementByID(
              PerpsMarketBalanceActionsSelectorsIDs.ADD_FUNDS_BUTTON,
            );
            const balanceValueElement = Matchers.getElementByID(
              PerpsMarketBalanceActionsSelectorsIDs.BALANCE_VALUE,
            );

            await Utilities.executeWithRetry(
              async () => {
                const isAddFundsVisible = await Utilities.isElementVisible(
                  addFundsButton,
                  2000,
                );
                if (!isAddFundsVisible) {
                  throw new Error('Perps Add funds CTA is not visible yet');
                }
              },
              { interval: 1000, timeout: 20000 },
            );

            const initialBalanceText =
              (await (
                await asPlaywrightElement(balanceValueElement)
              ).textContent()) || '0';
            const initialBalance =
              parseFloat(initialBalanceText.replace(/[^0-9.-]/g, '')) || 0;

            await Utilities.executeWithRetry(
              async () => {
                await Gestures.waitAndTap(addFundsButton, {
                  elemDescription: 'Perps Add Funds Button',
                });
                await Assertions.expectElementToBeVisible(
                  PerpsDepositView.amountInput,
                  {
                    description:
                      'Deposit amount input visible after tapping Add funds',
                    timeout: 5000,
                  },
                );
              },
              { interval: 1000, timeout: 30000 },
            );

            await Assertions.expectElementToNotBeVisible(ToastModal.container, {
              description: 'No toast visible before entering amount',
              timeout: 10000,
            });

            await PerpsDepositView.expectLoaded();
            await PerpsDepositView.focusAmount();
            await PerpsDepositView.typeUSD('80');
            await PerpsDepositView.tapContinue();
            await Assertions.expectTextDisplayed('Transaction fee');
            await PerpsDepositView.tapAddFunds();

            await PerpsE2EModifiers.applyDepositUSDServer(
              commandQueueServer,
              '80',
            );
            await Utilities.executeWithRetry(
              async () => {
                const currentText =
                  (await (
                    await asPlaywrightElement(balanceValueElement)
                  ).textContent()) || '0';
                const current =
                  parseFloat(currentText.replace(/[^0-9.-]/g, '')) || 0;
                await Assertions.checkIfValueIsDefined(
                  current === initialBalance + 80,
                );
              },
              { interval: 1000, timeout: 60000 },
            );
          },
        );
      },
    );
  },
);
