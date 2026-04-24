import { AccountTreeInitService } from './index';

jest.mock('../../lib/Money/feature-flags', () => ({
  isMoneyAccountEnabled: jest.fn(),
}));

const mockIsMoneyAccountEnabled = jest.requireMock(
  '../../lib/Money/feature-flags',
).isMoneyAccountEnabled as jest.Mock;

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
      RemoteFeatureFlagController: {
        state: { remoteFeatureFlags: {} },
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
    mockIsMoneyAccountEnabled.mockReturnValue(true);
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

    it('calls MoneyAccountController.init when the flag is enabled', async () => {
      mockIsMoneyAccountEnabled.mockReturnValue(true);

      await service.initializeAccountTree();

      expect(mockMoneyAccountInit).toHaveBeenCalled();
    });

    it('does not call MoneyAccountController.init when the flag is disabled', async () => {
      mockIsMoneyAccountEnabled.mockReturnValue(false);

      await service.initializeAccountTree();

      expect(mockMoneyAccountInit).not.toHaveBeenCalled();
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
