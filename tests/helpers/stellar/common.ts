import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { DappVariants } from '../../framework/Constants';
import { loginToApp } from '../../flows/wallet.flow';
import WalletView from '../../page-objects/wallet/WalletView';
import AccountListBottomSheet from '../../page-objects/wallet/AccountListBottomSheet';

export const STELLAR_ACCOUNT_ADDRESS =
  'GDEM2RN4QLPSSPGSPSKSEQ3XXFGM4X4BRH4X4EOPABHAXBVV6OQ6YE6K';

export const withStellarAccountSnap = async (
  testFn: () => Promise<void>,
): Promise<void> => {
  await withFixtures(
    {
      fixture: new FixtureBuilder().withStellarEnabled().build(),
      restartDevice: true,
      dapps: [
        {
          dappVariant: DappVariants.STELLAR_TEST_DAPP,
        },
      ],
    },
    async () => {
      await loginToApp();

      await WalletView.tapIdenticon();
      await AccountListBottomSheet.tapAddAccountButtonV2({ shouldWait: true });
      await AccountListBottomSheet.dismissAccountListModalV2();

      await testFn();
    },
  );
};
