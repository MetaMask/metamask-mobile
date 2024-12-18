import { waitFor } from '@testing-library/react-native';

import { type StakingApiService } from '@metamask/stake-sdk';

import useVaultData from './useVaultData';
import type { Stake } from '../sdk/stakeSdkProvider';
import { MOCK_GET_VAULT_RESPONSE } from '../__mocks__/mockData';
import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';

const mockStakingApiService: Partial<StakingApiService> = {
  getVaultData: jest.fn(),
};

const mockSdkContext: Stake = {
  setSdkType: jest.fn(),
  stakingApiService: mockStakingApiService as StakingApiService,
};

jest.mock('./useStakeContext', () => ({
  useStakeContext: () => mockSdkContext,
}));

const mockVaultData = MOCK_GET_VAULT_RESPONSE;

describe('useVaultData', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when fetching vault data', () => {
    it('fetches vault data and updates state', async () => {
      // Mock API response
      (mockStakingApiService.getVaultData as jest.Mock).mockResolvedValue(
        mockVaultData,
      );

      const { result } = renderHookWithProvider(() => useVaultData());

      // Initially loading should be true
      expect(result.current.isLoadingVaultData).toBe(true);

      // Wait for state updates
      await waitFor(() => {
        expect(result.current.vaultData).toEqual(mockVaultData);
        expect(result.current.annualRewardRate).toBe('2.9%');
        expect(result.current.annualRewardRateDecimal).toBe(
          0.02853065141088763,
        );
        expect(result.current.isLoadingVaultData).toBe(false);
        expect(result.current.error).toBeNull();
      });
    });

    it('handles error if the API request fails', async () => {
      // Simulate API error
      (mockStakingApiService.getVaultData as jest.Mock).mockRejectedValue(
        new Error('API Error'),
      );

      const { result } = renderHookWithProvider(() => useVaultData());

      await waitFor(() => {
        expect(result.current.isLoadingVaultData).toBe(false);
        expect(result.current.error).toBe('Failed to fetch vault data');
        expect(result.current.vaultData).toEqual({});
      });
    });
  });

  describe('when validating annual reward rate', () => {
    it('calculates the annual reward rate correctly based on the fetched APY', async () => {
      // Mock API response with a custom APY
      const customVaultData = { ...mockVaultData, apy: '7.0' };
      (mockStakingApiService.getVaultData as jest.Mock).mockResolvedValue(
        customVaultData,
      );

      const { result } = renderHookWithProvider(() => useVaultData());

      await waitFor(() => {
        expect(result.current.vaultData).toEqual(customVaultData);
        expect(result.current.annualRewardRate).toBe('7.0%');
        expect(result.current.annualRewardRateDecimal).toBe(0.07);
        expect(result.current.isLoadingVaultData).toBe(false);
        expect(result.current.error).toBeNull();
      });
    });

    it('returns "0%" when the APY is not available', async () => {
      // Mock API response with an empty APY
      const emptyApyVaultData = { ...mockVaultData, apy: '' };
      (mockStakingApiService.getVaultData as jest.Mock).mockResolvedValue(
        emptyApyVaultData,
      );

      const { result } = renderHookWithProvider(() => useVaultData());

      await waitFor(() => {
        expect(result.current.vaultData).toEqual(emptyApyVaultData);
        expect(result.current.annualRewardRate).toBe('0%');
        expect(result.current.annualRewardRateDecimal).toBe(0);
      });
    });
  });
});
