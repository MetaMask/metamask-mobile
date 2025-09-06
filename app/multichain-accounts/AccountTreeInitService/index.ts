import Engine from '../../core/Engine';

export class AccountTreeInitService {
  initializeAccountTree = async (): Promise<void> => {
    const { AccountTreeController, AccountsController } = Engine.context;

    await AccountsController.updateAccounts();
    AccountTreeController.init();
  };

  clearPersistedMetadataAndSyncingState = async (): Promise<void> => {
    const { AccountTreeController } = Engine.context;

    AccountTreeController.clearPersistedMetadataAndSyncingState();
  };
}

export default new AccountTreeInitService();
