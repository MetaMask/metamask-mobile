import { upgradeMoneyAccount } from './index';
import Engine from '../../core/Engine';
import Logger from '../../util/Logger';
import ToastService from '../../core/ToastService';
import { selectPrimaryMoneyAccount } from '../../selectors/moneyAccountController';
import type { RootState } from '../../reducers';

jest.mock('../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      MoneyAccountUpgradeController: {
        upgradeAccount: jest.fn(),
      },
    },
  },
}));

jest.mock('../../util/Logger', () => ({
  __esModule: true,
  default: {
    log: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('../../core/ToastService', () => ({
  __esModule: true,
  default: { showToast: jest.fn() },
}));

jest.mock('../../selectors/moneyAccountController', () => ({
  selectPrimaryMoneyAccount: jest.fn(),
}));

const mockUpgradeAccount = Engine.context.MoneyAccountUpgradeController
  .upgradeAccount as jest.Mock;
const mockSelectPrimaryMoneyAccount =
  selectPrimaryMoneyAccount as unknown as jest.Mock;
const mockLogError = Logger.error as jest.Mock;
const mockLogLog = Logger.log as jest.Mock;
const mockShowToast = ToastService.showToast as jest.Mock;

const ADDRESS = '0x1111111111111111111111111111111111111111' as const;

const flushPromises = () => new Promise((resolve) => setImmediate(resolve));

describe('upgradeMoneyAccount', () => {
  let dispatch: jest.Mock;
  let getState: jest.Mock<RootState>;

  beforeEach(() => {
    jest.clearAllMocks();
    dispatch = jest.fn();
    getState = jest.fn().mockReturnValue({} as RootState);
    mockUpgradeAccount.mockResolvedValue(undefined);
  });

  it('calls MoneyAccountUpgradeController.upgradeAccount with the primary money account address', () => {
    mockSelectPrimaryMoneyAccount.mockReturnValue({ address: ADDRESS });

    upgradeMoneyAccount()(dispatch, getState, undefined);

    expect(mockUpgradeAccount).toHaveBeenCalledWith(ADDRESS);
  });

  it('logs and shows a toast when the upgrade is fired', () => {
    mockSelectPrimaryMoneyAccount.mockReturnValue({ address: ADDRESS });

    upgradeMoneyAccount()(dispatch, getState, undefined);

    expect(mockLogLog).toHaveBeenCalledWith(
      expect.stringContaining('upgradeMoneyAccount'),
      'firing upgradeAccount',
      { address: ADDRESS },
    );
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        labelOptions: [{ label: 'Upgrading money account…', isBold: true }],
      }),
    );
  });

  it('logs and shows a success toast when upgradeAccount resolves', async () => {
    mockSelectPrimaryMoneyAccount.mockReturnValue({ address: ADDRESS });

    upgradeMoneyAccount()(dispatch, getState, undefined);
    await flushPromises();

    expect(mockLogLog).toHaveBeenCalledWith(
      expect.stringContaining('upgradeMoneyAccount'),
      'upgradeAccount resolved',
      { address: ADDRESS },
    );
    expect(mockShowToast).toHaveBeenLastCalledWith(
      expect.objectContaining({
        labelOptions: [
          { label: 'Money account upgrade complete', isBold: true },
        ],
      }),
    );
  });

  it('skips the call and logs when there is no primary money account', () => {
    mockSelectPrimaryMoneyAccount.mockReturnValue(undefined);

    upgradeMoneyAccount()(dispatch, getState, undefined);

    expect(mockUpgradeAccount).not.toHaveBeenCalled();
    expect(mockLogLog).toHaveBeenCalled();
    expect(mockShowToast).not.toHaveBeenCalled();
  });

  it('catches rejected upgradeAccount promises, logs, and shows an error toast', async () => {
    mockSelectPrimaryMoneyAccount.mockReturnValue({ address: ADDRESS });
    const error = new Error('boom');
    mockUpgradeAccount.mockRejectedValueOnce(error);

    upgradeMoneyAccount()(dispatch, getState, undefined);
    await flushPromises();

    expect(mockLogError).toHaveBeenCalledWith(error, expect.any(String));
    expect(mockShowToast).toHaveBeenLastCalledWith(
      expect.objectContaining({
        labelOptions: [{ label: 'Money account upgrade failed', isBold: true }],
        descriptionOptions: { description: 'boom' },
      }),
    );
  });

  it('swallows toast errors so they do not break the upgrade flow', () => {
    mockSelectPrimaryMoneyAccount.mockReturnValue({ address: ADDRESS });
    mockShowToast.mockImplementationOnce(() => {
      throw new Error('toast ref not mounted');
    });

    expect(() =>
      upgradeMoneyAccount()(dispatch, getState, undefined),
    ).not.toThrow();
    expect(mockUpgradeAccount).toHaveBeenCalledWith(ADDRESS);
  });
});
