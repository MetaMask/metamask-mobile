import React from 'react';
import {
  stakingApiService,
  useGetVaultDataQuery,
  useGetPooledStakesQuery,
} from './stakingApi';
import { ChainId } from '@metamask/stake-sdk';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { cleanup } from '@testing-library/react-native';
import StakingBalance from '../components/StakingBalance/StakingBalance';

jest.mock('./stakingApi', () => {
  const originalModule = jest.requireActual('./stakingApi');
  return {
    ...originalModule,
    stakingApiService: {
      getVaultData: jest.fn(),
      getPooledStakes: jest.fn(),
      getPooledStakingEligibility: jest.fn(),
    },
  };
});

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: mockNavigate,
    }),
  };
});

afterEach(() => {
  jest.clearAllMocks();
  cleanup();
});

afterEach(cleanup);

describe('StakingAPI Queries', () => {
  describe('useGetVaultDataQuery', () => {
    it('fetches vault data successfully', async () => {
      // Mock the service method to return test data
      (stakingApiService.getVaultData as jest.Mock).mockResolvedValue({
        vault: 'test-vault-data',
      });

      renderWithProvider(<StakingBalance />);

      // expect(result.current.vaultData).toEqual({ vault: 'test-vault-data' });
      expect(stakingApiService.getVaultData).toHaveBeenCalledWith(
        ChainId.ETHEREUM,
      );
    });

    it('handles errors correctly when fetching vault data', async () => {
      (stakingApiService.getVaultData as jest.Mock).mockRejectedValue(
        new Error('Error fetching vault data'),
      );

      const TestComponent = () => {
        const { data, error } = useGetVaultDataQuery({
          chainId: ChainId.ETHEREUM,
        });

        if (error) return <div>Error</div>;
        if (data !== undefined) return <div>Data received</div>;
        return <div>Loading</div>;
      };

      const { findByText } = renderWithProvider(<TestComponent />);

      expect(await findByText('Error')).toBeTruthy();
      expect(stakingApiService.getVaultData).toHaveBeenCalledWith(
        ChainId.ETHEREUM,
      );
    });
  });

  describe('useGetPooledStakesQuery', () => {
    it('fetches pooled stakes data successfully', async () => {
      (stakingApiService.getPooledStakes as jest.Mock).mockResolvedValue({
        stakes: [{ account: 'test-account', amount: '1000' }],
      });

      const TestComponent = () => {
        const { data, error } = useGetPooledStakesQuery({
          accounts: ['test-account'],
          chainId: ChainId.ETHEREUM,
        });

        if (error) return <div>Error</div>;
        if (data !== undefined) return <div>Data received</div>;
        return <div>Loading</div>;
      };

      const { findByText } = renderWithProvider(<TestComponent />);

      expect(await findByText('Data received')).toBeTruthy();
      expect(stakingApiService.getPooledStakes).toHaveBeenCalledWith(
        ['test-account'],
        ChainId.ETHEREUM,
        undefined, // For resetCache parameter which is optional
      );
    });

    it('handles error when fetching pooled stakes data', async () => {
      (stakingApiService.getPooledStakes as jest.Mock).mockRejectedValue(
        new Error('Error fetching pooled stakes'),
      );

      const TestComponent = () => {
        const { data, error } = useGetPooledStakesQuery({
          accounts: ['test-account'],
          chainId: ChainId.ETHEREUM,
        });

        if (error) return <div>Error</div>;
        if (data !== undefined) return <div>Data received</div>;
        return <div>Loading</div>;
      };

      const { findByText } = renderWithProvider(<TestComponent />);

      expect(await findByText('Error')).toBeTruthy();
      expect(stakingApiService.getPooledStakes).toHaveBeenCalledWith(
        ['test-account'],
        ChainId.ETHEREUM,
        undefined,
      );
    });
  });
});
