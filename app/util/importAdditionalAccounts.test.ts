import importAdditionalAccounts from './importAdditionalAccounts';
import { BN } from 'ethereumjs-util';

const mockKeyring = {
  addAccounts: jest.fn(),
  removeAccount: jest.fn(),
};

const mockEthQuery = {
  getBalance: jest.fn(),
};

const mockIsMultichainAccountsState2Enabled = jest.fn().mockReturnValue(false);

jest.mock('../core/Engine', () => ({
  context: {
    KeyringController: {
      withKeyring: jest.fn((_keyring, callback) =>
        callback({ keyring: mockKeyring, metadata: { id: '1234', name: '' } }),
      ),
    },
  },
}));

jest.mock('../multichain-accounts/remote-feature-flag', () => ({
  isMultichainAccountsState2Enabled: () =>
    mockIsMultichainAccountsState2Enabled(),
}));

jest.mock('./networks/global-network', () => ({
  getGlobalEthQuery: jest.fn(() => mockEthQuery),
}));

/**
 * Set the balance that will be queried for the account
 *
 * @param balance - The balance to be queried
 */
function setQueriedBalance(balance: BN) {
  mockEthQuery.getBalance.mockImplementation((_, callback) =>
    callback(null, balance),
  );
}

/**
 * Set the balance that will be queried for the account once
 *
 * @param balance - The balance to be queried
 */
function setQueriedBalanceOnce(balance: BN) {
  mockEthQuery.getBalance.mockImplementationOnce((_, callback) => {
    callback(null, balance);
  });
}

describe('importAdditionalAccounts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when there is no account with balance', () => {
    it('should not add any account', async () => {
      setQueriedBalance(new BN(0));
      mockKeyring.addAccounts.mockResolvedValue(['0x1234']);

      await importAdditionalAccounts();

      expect(mockKeyring.addAccounts).toHaveBeenCalledTimes(1);
      expect(mockKeyring.removeAccount).toHaveBeenCalledTimes(1);
      expect(mockKeyring.removeAccount).toHaveBeenCalledWith('0x1234');
    });
  });

  describe('when there is an account with balance', () => {
    it('should add 1 account', async () => {
      setQueriedBalanceOnce(new BN(1));
      setQueriedBalanceOnce(new BN(0));
      mockKeyring.addAccounts
        .mockResolvedValueOnce(['0x1234'])
        .mockResolvedValueOnce(['0x5678']);

      await importAdditionalAccounts();

      expect(mockKeyring.addAccounts).toHaveBeenCalledTimes(2);
      expect(mockKeyring.removeAccount).toHaveBeenCalledWith('0x5678');
    });
  });

  describe('when there are multiple accounts with balance', () => {
    it('should add 2 accounts', async () => {
      setQueriedBalanceOnce(new BN(1));
      setQueriedBalanceOnce(new BN(2));
      setQueriedBalanceOnce(new BN(0));
      mockKeyring.addAccounts
        .mockResolvedValueOnce(['0x1234'])
        .mockResolvedValueOnce(['0x5678'])
        .mockResolvedValueOnce(['0x9abc']);

      await importAdditionalAccounts();

      expect(mockKeyring.addAccounts).toHaveBeenCalledTimes(3);
      expect(mockKeyring.removeAccount).toHaveBeenCalledWith('0x9abc');
    });
  });

  describe('when ethQuery.getBalance throws an error', () => {
    it('should not remove all the accounts', async () => {
      setQueriedBalanceOnce(new BN(1));
      mockEthQuery.getBalance.mockImplementationOnce((_, callback) =>
        callback(new Error('error')),
      );
      mockKeyring.addAccounts
        .mockResolvedValueOnce(['0x1234'])
        .mockResolvedValueOnce(['0x5678']);

      await importAdditionalAccounts();

      expect(mockKeyring.addAccounts).toHaveBeenCalledTimes(2);
      expect(mockKeyring.removeAccount).toHaveBeenCalledTimes(1);
      expect(mockKeyring.removeAccount).toHaveBeenCalledWith('0x5678');
    });
  });

  describe('(state 2) - when state 2 enabled', () => {
    it('does not run EVM account discovery', async () => {
      mockIsMultichainAccountsState2Enabled.mockReturnValue(true);

      await importAdditionalAccounts();

      expect(mockKeyring.addAccounts).not.toHaveBeenCalled();
    });
  });
});
