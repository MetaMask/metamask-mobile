import { RegressionWalletPlatform } from '../../../e2e/tags';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder.ts';
import { withFixtures } from '../../framework/fixtures/FixtureHelper.ts';
import { loginToApp } from '../../../e2e/viewHelper.ts';
import WalletView from '../../../e2e/pages/wallet/WalletView.ts';
import TabBarComponent from '../../../e2e/pages/wallet/TabBarComponent.ts';
import Assertions from '../../framework/Assertions.ts';
import { LocalNode } from '../../framework/types.ts';
import { AnvilPort } from '../../framework/fixtures/FixtureUtils.ts';
import { AnvilManager } from '../../seeder/anvil-manager.ts';

const EXPECTED_HIDDEN_BALANCE: string = '••••••••••••';

describe(RegressionWalletPlatform('Balance Privacy Toggle'), (): void => {
  beforeAll(async (): Promise<void> => {
    jest.setTimeout(150000);
  });

  it('should toggle balance visibility when balance container is tapped', async (): Promise<void> => {
    await withFixtures(
      {
        fixture: ({ localNodes }: { localNodes?: LocalNode[] }) => {
          const node = localNodes?.[0] as unknown as AnvilManager;
          const rpcPort =
            node instanceof AnvilManager
              ? (node.getPort() ?? AnvilPort())
              : undefined;

          return new FixtureBuilder()
            .withNetworkController({
              providerConfig: {
                chainId: '0x539',
                rpcUrl: `http://localhost:${rpcPort ?? AnvilPort()}`,
                type: 'custom',
                nickname: 'Local RPC',
                ticker: 'ETH',
              },
            })
            .withETHAsPrimaryCurrency() // Set primary currency to ETH
            .build();
        },
        restartDevice: true,
      },
      async (): Promise<void> => {
        await loginToApp();
        await Assertions.expectElementToBeVisible(WalletView.container);
        await Assertions.expectElementToBeVisible(WalletView.totalBalance);
        const actualBalance: string = await WalletView.getBalanceText();
        if (!actualBalance.includes('ETH')) {
          throw new Error(
            `Expected balance to contain 'ETH', but got: ${actualBalance}`,
          );
        }
        if (actualBalance.includes('••••')) {
          throw new Error(
            `Expected balance to not be hidden, but got: ${actualBalance}`,
          );
        }
        await WalletView.hideBalance();
        await Assertions.expectElementToHaveText(
          WalletView.totalBalance as DetoxElement,
          EXPECTED_HIDDEN_BALANCE,
        );
        await TabBarComponent.tapSettings();
        await TabBarComponent.tapWallet();
        await Assertions.expectElementToBeVisible(WalletView.container);
        await Assertions.expectElementToBeVisible(WalletView.totalBalance);
        await Assertions.expectElementToHaveText(
          WalletView.totalBalance as DetoxElement,
          EXPECTED_HIDDEN_BALANCE,
        );
        await WalletView.showBalance();
        await Assertions.expectElementToHaveText(
          WalletView.totalBalance as DetoxElement,
          actualBalance,
        );
      },
    );
  });
});
