import Engine from '../../core/Engine';

export class AccountTreeInitService {
  initializeAccountTree = async (): Promise<void> => {
    const { AccountTreeController, AccountsController } = Engine.context;

    await AccountsController.updateAccounts();
    AccountTreeController.init();
  };
}

export default new AccountTreeInitService();
