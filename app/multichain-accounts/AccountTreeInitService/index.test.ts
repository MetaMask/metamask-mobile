import { AccountTreeInitService } from './index';

const mockUpdateAccounts = jest.fn();
const mockAccountTreeInit = jest.fn();
const mockAccountTreeClearState = jest.fn();
const mockAccountTreeGetSelectedAccountGroup = jest.fn();
const mockMoneyAccountInit = jest.fn();
const mockMoneyAccountClearState = jest.fn();
const mockForwardSelectedAccountGroupToSnapKeyring = jest.fn();

jest.mock('../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      AccountsController: {
        updateAccounts: jest
          .fn()
          .mockImplementation(() => mockUpdateAccounts()),
      },
      AccountTreeController: {
        init: jest.fn().mockImplementation(() => mockAccountTreeInit()),
        clearState: jest
          .fn()
          .mockImplementation(() => mockAccountTreeClearState()),
        getSelectedAccountGroup: jest
          .fn()
          .mockImplementation(() => mockAccountTreeGetSelectedAccountGroup()),
      },
      MoneyAccountController: {
        init: jest.fn().mockImplementation(() => mockMoneyAccountInit()),
        clearState: jest
          .fn()
          .mockImplementation(() => mockMoneyAccountClearState()),
      },
    },
  },
}));

jest.mock(
  '../../core/SnapKeyring/utils/forwardSelectedAccountGroupToSnapKeyring',
  () => ({
    forwardSelectedAccountGroupToSnapKeyring: jest
      .fn()
      .mockImplementation(() => mockForwardSelectedAccountGroupToSnapKeyring()),
  }),
);

describe('AccountTreeInitService', () => {
  let service: AccountTreeInitService;

  beforeEach(() => {
    service = new AccountTreeInitService();
    jest.clearAllMocks();
  });

  describe('initializeAccountTree', () => {
    it('calls AccountsController.updateAccounts', async () => {
      await service.initializeAccountTree();
      expect(mockUpdateAccounts).toHaveBeenCalled();
    });

    it('calls AccountTreeController.init', async () => {
      await service.initializeAccountTree();
      expect(mockAccountTreeInit).toHaveBeenCalled();
    });

    it('calls MoneyAccountController.init', async () => {
      await service.initializeAccountTree();
      expect(mockMoneyAccountInit).toHaveBeenCalled();
    });

    it('forwards the selected account group to the Snap keyring', async () => {
      await service.initializeAccountTree();
      expect(mockForwardSelectedAccountGroupToSnapKeyring).toHaveBeenCalled();
    });

    it('forwards the result of getSelectedAccountGroup to the Snap keyring', async () => {
      const mockGroup = { id: 'test-group' };
      mockAccountTreeGetSelectedAccountGroup.mockReturnValue(mockGroup);

      await service.initializeAccountTree();

      const { forwardSelectedAccountGroupToSnapKeyring } = jest.requireMock(
        '../../core/SnapKeyring/utils/forwardSelectedAccountGroupToSnapKeyring',
      );
      expect(forwardSelectedAccountGroupToSnapKeyring).toHaveBeenCalledWith(
        mockGroup,
      );
    });
  });

  describe('clearState', () => {
    it('calls AccountTreeController.clearState', async () => {
      await service.clearState();
      expect(mockAccountTreeClearState).toHaveBeenCalled();
    });

    it('calls MoneyAccountController.clearState', async () => {
      await service.clearState();
      expect(mockMoneyAccountClearState).toHaveBeenCalled();
    });
  });
});
