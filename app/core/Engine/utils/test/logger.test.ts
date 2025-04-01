import Logger from '../../../../util/Logger';
import { logEngineCreation } from '../logger';

jest.mock('../../../../util/Logger');

describe('logEngineCreation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('logs empty state initialization', () => {
    logEngineCreation({}, null);

    expect(Logger.log).toHaveBeenCalledWith(
      'Engine initialized with empty state',
      {
        keyringStateFromBackup: false,
      },
    );
  });

  it('logs empty state initialization with keyring backup', () => {
    logEngineCreation(
      {},
      {
        vault: 'test-vault',
        keyrings: [],
        isUnlocked: false,
        keyringsMetadata: [],
      },
    );

    expect(Logger.log).toHaveBeenCalledWith(
      'Engine initialized with empty state',
      {
        keyringStateFromBackup: true,
      },
    );
  });

  it('logs non-empty state initialization with accounts', () => {
    const initialState = {
      AccountsController: {
        internalAccounts: {
          accounts: {},
          selectedAccount: '',
        },
      },
    };

    logEngineCreation(initialState, null);

    expect(Logger.log).toHaveBeenCalledWith(
      'Engine initialized with non-empty state',
      {
        hasAccountsState: true,
        hasKeyringState: false,
        keyringStateFromBackup: false,
      },
    );
  });

  it('logs non-empty state initialization with keyring state', () => {
    const initialState = {
      KeyringController: {
        vault: 'test-vault',
        keyrings: [],
        isUnlocked: false,
        keyringsMetadata: [],
      },
    };

    logEngineCreation(initialState, null);

    expect(Logger.log).toHaveBeenCalledWith(
      'Engine initialized with non-empty state',
      {
        hasAccountsState: false,
        hasKeyringState: true,
        keyringStateFromBackup: false,
      },
    );
  });

  it('logs non-empty state initialization with both accounts and keyring', () => {
    const initialState = {
      AccountsController: {
        internalAccounts: {
          accounts: {},
          selectedAccount: '',
        },
      },
      KeyringController: {
        vault: 'test-vault',
        keyrings: [],
        isUnlocked: false,
        keyringsMetadata: [],
      },
    };

    const keyringBackup = {
      vault: 'backup-vault',
      keyrings: [],
      isUnlocked: false,
      keyringsMetadata: [],
    };

    logEngineCreation(initialState, keyringBackup);

    expect(Logger.log).toHaveBeenCalledWith(
      'Engine initialized with non-empty state',
      {
        hasAccountsState: true,
        hasKeyringState: true,
        keyringStateFromBackup: true,
      },
    );
  });
});
