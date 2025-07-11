import { SmokeConfirmationsRedesigned } from '../../../../tags';
import TestHelpers from '../../../../helpers';
import { loginToApp } from '../../../../viewHelper';
import FixtureBuilder from '../../../../fixtures/fixture-builder';
import TabBarComponent from '../../../../pages/wallet/TabBarComponent';
import { mockEvents } from '../../../../api-mocking/mock-config/mock-events';
import { withFixtures } from '../../../../fixtures/fixture-helper';
import { buildPermissions } from '../../../../fixtures/utils';
import { SIMULATION_ENABLED_NETWORKS_MOCK } from '../../../../api-mocking/mock-responses/simulations';
import WalletView from '../../../../pages/wallet/WalletView';
import AccountListBottomSheet from '../../../../pages/wallet/AccountListBottomSheet';

describe(SmokeConfirmationsRedesigned('7702 - smart account'), () => {
  const testSpecificMock = {
    POST: [],
    GET: [
      SIMULATION_ENABLED_NETWORKS_MOCK,
      mockEvents.GET.remoteFeatureFlagsRedesignedConfirmations,
    ],
  };

  beforeAll(async () => {
    jest.setTimeout(2500000);
    await TestHelpers.reverseServerPort();
  });

  it('upgrades an account', async () => {
    await withFixtures(
      {
        dapp: true,
        fixture: new FixtureBuilder()
          .withPermissionControllerConnectedToTestDapp(
            buildPermissions(['0xaa36a7']),
          )
          .build(),
        restartDevice: true,
        // @ts-expect-error Type for this property does not exist yet.
        localNodeOptions: [
          {
            type: 'anvil',
            options: {
              hardfork: 'prague',
              loadState:
                './e2e/specs/confirmations-redesigned/transactions/7702/withDelegatorContracts.json',
            },
          },
        ],
        testSpecificMock,
      },
      async () => {
        await loginToApp();

        await TabBarComponent.tapWallet();
        await WalletView.tapIdenticon();
        await AccountListBottomSheet.tapEditAccountActionsAtIndex(0);
      },
    );
  });
});
