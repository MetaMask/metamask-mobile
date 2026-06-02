import { SmokeLedger } from '../../tags';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import {
  withSpeculosFixtures,
  importLedgerAccount,
  type SpeculosTestSuiteParams,
} from '../../framework/fixtures/SpeculosFixtureHelper';

const describeIf = process.env.LEDGER_E2E === '1' ? describe : describe.skip;

jest.setTimeout(600000);

describeIf(SmokeLedger('Import Ledger account via Speculos'), () => {
  it('discovers and imports a Ledger account from virtual device', async () => {
    await withSpeculosFixtures(
      {
        fixture: new FixtureBuilder().withDefaultFixture().build(),
        startSpeculos: true,
      },
      async ({ speculos }: SpeculosTestSuiteParams) => {
        await importLedgerAccount();
      },
    );
  });
});
