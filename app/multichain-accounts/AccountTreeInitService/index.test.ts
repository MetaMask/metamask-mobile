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
const mockMoneyAccountInit = jest.fn();
const mockMoneyAccountClearState = jest.fn();
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
  });

  describe('clearState', () => {
    it('calls AccountTreeController.clearState', async () => {
      await service.clearState();
      expect(mockAccountTreeClearState).toHaveBeenCalled();
    });
  });
});
