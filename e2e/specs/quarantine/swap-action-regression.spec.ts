import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import { LocalNodeType } from '../../framework/types';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import WalletView from '../../pages/wallet/WalletView';
import { Regression } from '../../tags';
import {
  submitSwapUnifiedUI,
  checkSwapActivity,
} from '../swaps/helpers/swap-unified-ui';
import { loginToApp } from '../../viewHelper';
import { prepareSwapsTestEnvironment } from '../swaps/helpers/prepareSwapsTestEnvironment';
import { testSpecificMock } from '../swaps/helpers/swap-mocks';

describe(Regression('Multiple Swaps from Actions'), (): void => {
  beforeEach(async (): Promise<void> => {
    jest.setTimeout(120000);
  });

  it('should complete a USDC to DAI swap from the token chart', async (): Promise<void> => {
    await withFixtures(
      {
        fixture: new FixtureBuilder()
          .withGanacheNetwork('0x1')
          .withDisabledSmartTransactions()
          .build(),
        localNodeOptions: [
          {
            type: LocalNodeType.anvil,
            options: {
              chainId: 1,
              forkUrl: `https://mainnet.infura.io/v3/${process.env.MM_INFURA_PROJECT_ID}`,
            },
          },
        ],
        testSpecificMock,
        restartDevice: true,
      },
      async () => {
        await loginToApp();
        await prepareSwapsTestEnvironment();
        await WalletView.tapWalletSwapButton();

        // Submit the Swap ETH->DAI
        await submitSwapUnifiedUI('1', 'ETH', 'DAI', '0x1');
        await checkSwapActivity('ETH', 'DAI');

        await TabBarComponent.tapWallet();
        await WalletView.tapWalletSwapButton();

        await submitSwapUnifiedUI('1000', 'DAI', 'ETH', '0x1');
        await checkSwapActivity('DAI', 'ETH');
      },
    );
  });
});
