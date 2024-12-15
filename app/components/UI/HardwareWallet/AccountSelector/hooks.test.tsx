import { renderHook } from '@testing-library/react-hooks';
import Engine from '../../../../core/Engine';
import { IAccount, useAccountsBalance } from './hooks';

jest.mock('../../../../core/Engine', () => ({
  context: {
    AccountTrackerController: {
      syncBalanceWithAddresses: jest.fn(),
    },
  },
}));
describe('useAccountsBalance', () => {
  const mockAccounts: IAccount[] = [
    { address: '0x123' },
    { address: '0x456' },
    { address: '0x789' },
  ];

  let mockSyncBalanceWithAddresses: jest.Mock;

  beforeEach(() => {
    mockSyncBalanceWithAddresses = jest.fn().mockResolvedValue({
      '0x123': { balance: '100' },
      '0x456': { balance: '200' },
    });

    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (Engine.context.AccountTrackerController as any).syncBalanceWithAddresses =
      mockSyncBalanceWithAddresses;
  });

  it('should return an empty object initially', () => {
    const { result } = renderHook(() => useAccountsBalance(mockAccounts));
    expect(result.current).toEqual({});
  });

  it('should update the tracked accounts when untracked accounts are added', async () => {
    const { result, waitForNextUpdate } = renderHook(() =>
      useAccountsBalance(mockAccounts),
    );

    expect(result.current).toEqual({});

    await waitForNextUpdate();

    expect(result.current).toEqual({
      '0x123': { balance: '100' },
      '0x456': { balance: '200' },
    });

    expect(mockSyncBalanceWithAddresses).toHaveBeenCalledWith([
      '0x123',
      '0x456',
      '0x789',
    ]);
  });
});
