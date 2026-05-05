import {
  __resetUpgradesInFlightForTesting,
  upgradeMoneyAccount,
} from './index';
import Engine from '../../core/Engine';
import Logger from '../../util/Logger';
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

jest.mock('../../selectors/moneyAccountController', () => ({
  selectPrimaryMoneyAccount: jest.fn(),
}));

jest.mock(
  '../../core/Engine/controllers/money-account-upgrade-controller-init',
  () => ({
    whenMoneyAccountUpgradeReady: jest.fn(() => Promise.resolve()),
  }),
);

const mockUpgradeAccount = Engine.context.MoneyAccountUpgradeController
  .upgradeAccount as jest.Mock;
const mockSelectPrimaryMoneyAccount =
  selectPrimaryMoneyAccount as unknown as jest.Mock;
const mockLogError = Logger.error as jest.Mock;
const mockLogLog = Logger.log as jest.Mock;

const ADDRESS = '0x1111111111111111111111111111111111111111' as const;
const OTHER_ADDRESS = '0x2222222222222222222222222222222222222222' as const;

const flushPromises = () => new Promise((resolve) => setImmediate(resolve));

describe('upgradeMoneyAccount', () => {
  let dispatch: jest.Mock;
  let getState: jest.Mock<RootState>;

  beforeEach(() => {
    jest.clearAllMocks();
    __resetUpgradesInFlightForTesting();
    dispatch = jest.fn();
    getState = jest.fn().mockReturnValue({} as RootState);
    mockUpgradeAccount.mockResolvedValue(undefined);
  });

  it('calls MoneyAccountUpgradeController.upgradeAccount with the primary money account address', async () => {
    mockSelectPrimaryMoneyAccount.mockReturnValue({ address: ADDRESS });

    upgradeMoneyAccount()(dispatch, getState, undefined);
    await flushPromises();

    expect(mockUpgradeAccount).toHaveBeenCalledWith(ADDRESS);
  });

  it('skips the call and logs when there is no primary money account', () => {
    mockSelectPrimaryMoneyAccount.mockReturnValue(undefined);

    upgradeMoneyAccount()(dispatch, getState, undefined);

    expect(mockUpgradeAccount).not.toHaveBeenCalled();
    expect(mockLogLog).toHaveBeenCalled();
  });

  it('skips the call when the primary money account address is not a strict hex string', () => {
    mockSelectPrimaryMoneyAccount.mockReturnValue({ address: 'not-hex' });

    upgradeMoneyAccount()(dispatch, getState, undefined);

    expect(mockUpgradeAccount).not.toHaveBeenCalled();
    expect(mockLogLog).toHaveBeenCalledWith(
      expect.stringContaining('upgradeMoneyAccount'),
      expect.stringContaining('no valid primary money account'),
      expect.objectContaining({ address: 'not-hex' }),
    );
  });

  it('catches rejected upgradeAccount promises and logs', async () => {
    mockSelectPrimaryMoneyAccount.mockReturnValue({ address: ADDRESS });
    const error = new Error('boom');
    mockUpgradeAccount.mockRejectedValueOnce(error);

    upgradeMoneyAccount()(dispatch, getState, undefined);
    await flushPromises();

    expect(mockLogError).toHaveBeenCalledWith(error, expect.any(String));
  });

  it('wraps non-Error rejections', async () => {
    mockSelectPrimaryMoneyAccount.mockReturnValue({ address: ADDRESS });
    mockUpgradeAccount.mockRejectedValueOnce('string rejection');

    upgradeMoneyAccount()(dispatch, getState, undefined);
    await flushPromises();

    expect(mockLogError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.any(String),
    );
  });

  it('deduplicates concurrent upgrades for the same address', async () => {
    mockSelectPrimaryMoneyAccount.mockReturnValue({ address: ADDRESS });
    mockUpgradeAccount.mockReturnValueOnce(new Promise(() => undefined));

    upgradeMoneyAccount()(dispatch, getState, undefined);
    upgradeMoneyAccount()(dispatch, getState, undefined);
    await flushPromises();

    expect(mockUpgradeAccount).toHaveBeenCalledTimes(1);
    expect(mockLogLog).toHaveBeenCalledWith(
      expect.stringContaining('upgradeMoneyAccount'),
      'upgrade already in flight; skipping',
      { address: ADDRESS },
    );
  });

  it('allows a subsequent upgrade after a previous one resolves', async () => {
    mockSelectPrimaryMoneyAccount.mockReturnValue({ address: ADDRESS });

    upgradeMoneyAccount()(dispatch, getState, undefined);
    await flushPromises();
    upgradeMoneyAccount()(dispatch, getState, undefined);
    await flushPromises();

    expect(mockUpgradeAccount).toHaveBeenCalledTimes(2);
  });

  it('does not deduplicate upgrades for different addresses', async () => {
    mockUpgradeAccount.mockReturnValue(new Promise(() => undefined));

    mockSelectPrimaryMoneyAccount.mockReturnValueOnce({ address: ADDRESS });
    upgradeMoneyAccount()(dispatch, getState, undefined);
    mockSelectPrimaryMoneyAccount.mockReturnValueOnce({
      address: OTHER_ADDRESS,
    });
    upgradeMoneyAccount()(dispatch, getState, undefined);
    await flushPromises();

    expect(mockUpgradeAccount).toHaveBeenCalledTimes(2);
    expect(mockUpgradeAccount).toHaveBeenNthCalledWith(1, ADDRESS);
    expect(mockUpgradeAccount).toHaveBeenNthCalledWith(2, OTHER_ADDRESS);
  });
});
