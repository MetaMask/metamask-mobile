import { renderHook, waitFor } from '@testing-library/react-native';
import { query } from '@metamask/controller-utils';
import { IAccount, useAccountsBalance } from './hooks';

jest.mock('@metamask/controller-utils', () => ({
  ...jest.requireActual('@metamask/controller-utils'),
  query: jest.fn(),
}));

jest.mock('../../../../core/Engine', () => ({
  context: {
    NetworkController: {
      state: { selectedNetworkClientId: 'mainnet' },
      getNetworkClientById: jest.fn(() => ({ provider: {} })),
    },
  },
}));

const mockedQuery = jest.mocked(query);

describe('useAccountsBalance', () => {
  const mockAccounts: IAccount[] = [
    { address: '0x123' },
    { address: '0x456' },
    { address: '0x789' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockedQuery.mockImplementation(async (_ethQuery, _method, params) => {
      const address = (params as string[])[0];
      const balances: Record<string, string> = {
        '0x123': '100',
        '0x456': '200',
      };
      return balances[address] ?? '0x0';
    });
  });

  it('should return an empty object initially', () => {
    const { result } = renderHook(() => useAccountsBalance(mockAccounts));
    expect(result.current).toEqual({});
  });

  it('should update the tracked accounts when untracked accounts are added', async () => {
    const { result } = renderHook(() => useAccountsBalance(mockAccounts));

    expect(result.current).toEqual({});

    await waitFor(() => {
      expect(result.current).toEqual({
        '0x123': { balance: '100' },
        '0x456': { balance: '200' },
        '0x789': { balance: '0x0' },
      });
    });

    expect(mockedQuery).toHaveBeenCalledWith(expect.anything(), 'getBalance', [
      '0x123',
    ]);
    expect(mockedQuery).toHaveBeenCalledWith(expect.anything(), 'getBalance', [
      '0x456',
    ]);
    expect(mockedQuery).toHaveBeenCalledWith(expect.anything(), 'getBalance', [
      '0x789',
    ]);
  });
});
