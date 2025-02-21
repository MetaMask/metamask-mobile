import Logger from '../../../../util/Logger';
import { logAccountsControllerCreation } from './utils';
import { defaultAccountsControllerState } from './constants';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../../util/test/accountsControllerTestUtils';

jest.mock('../../../../util/Logger');

describe('logAccountsControllerCreation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('logs creation with default state when no initial state provided', () => {
    logAccountsControllerCreation();

    expect(Logger.log).toHaveBeenCalledWith(
      'Creating AccountsController with default state',
      {
        defaultState: defaultAccountsControllerState,
      },
    );
  });

  it('logs creation with empty initial state', () => {
    const initialState = {
      internalAccounts: {
        accounts: {},
        selectedAccount: '',
      },
    };

    logAccountsControllerCreation(initialState);

    expect(Logger.log).toHaveBeenCalledWith(
      'Creating AccountsController with provided initial state',
      {
        hasSelectedAccount: false,
        accountsCount: 0,
      },
    );
  });

  it('logs creation with populated initial state', () => {
    logAccountsControllerCreation(MOCK_ACCOUNTS_CONTROLLER_STATE);

    expect(Logger.log).toHaveBeenCalledWith(
      'Creating AccountsController with provided initial state',
      {
        hasSelectedAccount: true,
        accountsCount: 2,
      },
    );
  });
});
