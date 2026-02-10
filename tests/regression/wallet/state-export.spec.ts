import { RegressionWalletPlatform } from '../../../e2e/tags';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import { CreateNewWallet } from '../../../e2e/viewHelper';
import { TestSuiteParams } from '../../framework/types';
import { logger } from '../../framework';

// The address pre-seeded in the default (non-onboarding) fixture
const DEFAULT_FIXTURE_ADDRESS = '0x76cf1cdd1fcc252442b50d6e97207228aa4aefc3';

describe(RegressionWalletPlatform('E2E State Export'), () => {
  beforeAll(async () => {
    jest.setTimeout(150000);
  });

  it('should export app state after onboarding with freshly generated accounts', async () => {
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
        const accounts = internalAccounts?.accounts as Record<
          string,
          Record<string, unknown>
        >;
        const accountEntries = Object.values(accounts);

        if (accountEntries.length === 0) {
          throw new Error('Expected at least one account after onboarding');
        }

        // Verify the account was freshly generated (not the pre-seeded default fixture address)
        const addresses = accountEntries.map((a) =>
          (a.address as string)?.toLowerCase(),
        );
        if (addresses.includes(DEFAULT_FIXTURE_ADDRESS)) {
          throw new Error(
            'Exported state contains the pre-seeded default fixture address — ' +
              'expected a freshly generated account from onboarding',
          );
        }

        logger.debug('STATE', {
          exportedReduxState: state.redux,
          exportedEngineState: state.engine,
        });
      },
    );
  });
});
