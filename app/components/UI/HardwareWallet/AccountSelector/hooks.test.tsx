import { renderHook, waitFor } from '@testing-library/react-native';
import { IAccount, useAccountsBalance } from './hooks';

const mockProviderRequest = jest.fn();

jest.mock('../../../../core/Engine', () => ({
  context: {
    NetworkController: {
      state: { selectedNetworkClientId: 'mainnet' },
      getNetworkClientById: jest.fn(() => ({ provider: {} })),
      getSelectedNetworkClient: jest.fn(() => ({
        provider: { request: mockProviderRequest },
      })),
    },
  },
}));

jest.mock('../../../../util/Logger', () => ({
  error: jest.fn(),
}));

describe('useAccountsBalance', () => {
  const mockAccounts: IAccount[] = [
    { address: '0x123' },
    { address: '0x456' },
    { address: '0x789' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockProviderRequest.mockImplementation(async ({ params }) => {
      const address = (params as string[])[0];
      const balances: Record<string, string> = {
        '0x123': '100',
        '0x456': '200',
      };
      if (address === '0x789') {
        throw new Error('RPC failed');
      }
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
      });
    });

    expect(mockProviderRequest).toHaveBeenCalledWith({
      method: 'eth_getBalance',
      params: ['0x123'],
    });
    expect(mockProviderRequest).toHaveBeenCalledWith({
      method: 'eth_getBalance',
      params: ['0x456'],
    });
    expect(mockProviderRequest).toHaveBeenCalledWith({
      method: 'eth_getBalance',
      params: ['0x789'],
    });
  });

  it('keeps successful balances when one account balance request fails', async () => {
    const { result } = renderHook(() => useAccountsBalance(mockAccounts));

    await waitFor(() => {
      expect(result.current).toEqual({
        '0x123': { balance: '100' },
        '0x456': { balance: '200' },
      });
    });

    expect(mockProviderRequest).toHaveBeenCalledTimes(3);
  });
});
