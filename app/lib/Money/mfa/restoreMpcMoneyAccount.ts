import Engine from '../../../core/Engine';
import Logger from '../../../util/Logger';

/** Restores the MPC Money account from its key-share backup after 2-step verification. */
export const restoreMpcMoneyAccount = async (
  expectedAddress: string,
): Promise<void> => {
  const { MoneyAccountController, MoneyAccountLifecycleController } =
    Engine.context;
  const account = await MoneyAccountController.createMoneyAccount({
    type: 'mpc',
  });
  if (account.address.toLowerCase() !== expectedAddress.toLowerCase()) {
    throw new Error(
      `Restored MPC Money account ${account.address} does not match ${expectedAddress}`,
    );
  }
  // Default it now so Money switches without waiting on CHOMP; MALC agrees once it refreshes.
  MoneyAccountController.setDefaultMoneyAccount(account.id);
  MoneyAccountLifecycleController.refresh().catch((error: Error) =>
    Logger.error(error, 'Money account lifecycle refresh failed after restore'),
  );
};
