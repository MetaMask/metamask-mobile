import { renderHook } from '@testing-library/react-hooks';

import Engine from '../../../../core/Engine';
import { useERC20TokenBalance } from './useERC20TokenBalance';

const MOCK_CONTRACT_ADDRESS = '0x1234567890123456789012345678901234567890';
const MOCK_USER_ADDRESS = '0x0987654321098765432109876543210987654321';
const MOCK_NETWORK_CLIENT_ID = 'mainnet';

jest.mock('../../../../core/Engine', () => ({
  context: {
    AssetsContractController: {
      getERC20BalanceOf: jest.fn(),
    },
  },
}));

describe('useERC20TokenBalance', () => {
  const mockEngine = jest.mocked(Engine);
  const mockGetERC20BalanceOf = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockEngine.context.AssetsContractController.getERC20BalanceOf =
      mockGetERC20BalanceOf;
  });

  const arrange = (
    contractAddress: string = MOCK_CONTRACT_ADDRESS,
    userAddress: string = MOCK_USER_ADDRESS,
    networkClientId: string = MOCK_NETWORK_CLIENT_ID,
  ) =>
    renderHook(() =>
      useERC20TokenBalance(contractAddress, userAddress, networkClientId),
    );

  it('fetches and returns token balance successfully', async () => {
    const expectedBalance = '100000000';
    mockGetERC20BalanceOf.mockResolvedValue(expectedBalance);

    const { result, waitForNextUpdate } = arrange();

    expect(result.current.loading).toBe(true);
    expect(result.current.tokenBalance).toBe(null);
    expect(result.current.error).toBe(false);

    await waitForNextUpdate();

    expect(mockGetERC20BalanceOf).toHaveBeenCalledWith(
      MOCK_CONTRACT_ADDRESS,
      MOCK_USER_ADDRESS,
      MOCK_NETWORK_CLIENT_ID,
    );
    expect(result.current.tokenBalance).toBe(expectedBalance);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(false);
  });

  describe('error handling', () => {
    it('returns error state when API errors occur', async () => {
      const error = new Error('Network error');
      mockGetERC20BalanceOf.mockRejectedValue(error);

      const { result, waitForNextUpdate } = arrange();

      await waitForNextUpdate();

      expect(mockGetERC20BalanceOf).toHaveBeenCalled();
      expect(result.current.tokenBalance).toBe(null);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(true);
    });

    it('handles undefined balance response', async () => {
      mockGetERC20BalanceOf.mockResolvedValue(undefined);

      const { result, waitForNextUpdate } = arrange();

      await waitForNextUpdate();

      expect(result.current.tokenBalance).toBe(undefined);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(false);
    });
  });

  it('handles empty string addresses', async () => {
    const balance = '0';
    mockGetERC20BalanceOf.mockResolvedValue(balance);

    const { result, waitForNextUpdate } = arrange('', '');

    await waitForNextUpdate();

    expect(mockGetERC20BalanceOf).toHaveBeenCalledWith('', '', 'mainnet');
    expect(result.current.tokenBalance).toBe(balance);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(false);
  });
});
