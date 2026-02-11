import { RegressionWalletPlatform } from '../../tags';
import { CreateNewWallet } from '../../flows/wallet.flow';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import { TestSuiteParams } from '../../framework/types';

describe(RegressionWalletPlatform('E2E State Export'), () => {
  beforeAll(async () => {
    jest.setTimeout(150000);
  });

  it('exports app state after onboarding with freshly generated accounts', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().withOnboardingFixture().build(),
        restartDevice: true,
        useCommandQueueServer: true,
      },
      async ({ commandQueueServer }: TestSuiteParams) => {
        if (!commandQueueServer) {
          throw new Error('Command queue server not found');
        }

        await CreateNewWallet();

        commandQueueServer.requestStateExport();
        const state = await commandQueueServer.getExportedState();

        if (!state.redux || typeof state.redux !== 'object') {
          throw new Error('Exported state missing redux key');
        }
        if (!state.engine || typeof state.engine !== 'object') {
          throw new Error('Exported state missing engine key');
        }

        const engine = state.engine as Record<string, unknown>;
        const accountsController = engine.AccountsController as Record<
          string,
          unknown
        >;
        if (!accountsController) {
          throw new Error('Exported state missing AccountsController');
        }

        const internalAccounts = accountsController.internalAccounts as Record<
          string,
          unknown
        >;
        if (!internalAccounts?.accounts) {
          throw new Error('Exported state missing internalAccounts.accounts');
        }

        const accounts = internalAccounts.accounts as Record<
          string,
          Record<string, unknown>
        >;
        const accountEntries = Object.values(accounts);

        if (accountEntries.length === 0) {
          throw new Error('Expected at least one account after onboarding');
        }
      },
    );
  });
});
