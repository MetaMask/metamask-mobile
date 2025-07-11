import { VaultData } from '@metamask/stake-sdk';
import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import useVaultMetadata from '../../Stake/hooks/useVaultMetadata';
import { EARN_EXPERIENCES } from '../constants/experiences';
import { EarnTokenDetails } from '../types/lending.types';
import { useEarnMetadata } from './useEarnMetadata';

jest.mock('../../Stake/hooks/useVaultMetadata');

describe('useEarnMetadata', () => {
  const mockUseVaultMetadata = useVaultMetadata as jest.MockedFunction<
    typeof useVaultMetadata
  >;

  const mockVaultData: VaultData = {
    apy: '3.2',
    capacity: '1000000',
    feePercent: 10,
    totalAssets: '500000',
    vaultAddress: '0xabcd',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Default mock implementation
    mockUseVaultMetadata.mockReturnValue({
      vaultMetadata: mockVaultData,
      isLoadingVaultMetadata: false,
      error: null,
      annualRewardRate: '0.0%',
      annualRewardRateDecimal: 0,
      refreshVaultMetadata: jest.fn(),
    });
  });

  it('should return default values when earnToken is not provided', () => {
    const { result } = renderHookWithProvider(() =>
      useEarnMetadata(null as unknown as EarnTokenDetails),
    );

    expect(result.current).toEqual({
      annualRewardRate: '',
      annualRewardRateDecimal: 0,
      annualRewardRateValue: 0,
      isLoadingEarnMetadata: false,
    });
  });

  it('should calculate correct values for STABLECOIN_LENDING experience', () => {
    const mockEarnToken: EarnTokenDetails = {
      address: '0x123',
      chainId: '1',
      decimals: 18,
      symbol: 'USDC',
      ticker: 'USDC',
      experience: {
        type: EARN_EXPERIENCES.STABLECOIN_LENDING,
        apr: '5.5',
      },
    } as EarnTokenDetails;

    const { result } = renderHookWithProvider(() =>
      useEarnMetadata(mockEarnToken),
    );

    expect(result.current).toEqual({
      annualRewardRate: '5.5%',
      annualRewardRateDecimal: 0.055,
      annualRewardRateValue: 5.5,
      isLoadingEarnMetadata: false,
    });
  });

  it('should use vault metadata for POOLED_STAKING experience', () => {
    const mockEarnToken: EarnTokenDetails = {
      address: '0x123',
      chainId: '1',
      decimals: 18,
      symbol: 'ETH',
      ticker: 'ETH',
      experience: {
        type: EARN_EXPERIENCES.POOLED_STAKING,
      },
    } as EarnTokenDetails;

    mockUseVaultMetadata.mockReturnValue({
      vaultMetadata: mockVaultData,
      isLoadingVaultMetadata: true,
      error: null,
      annualRewardRate: '3.2%',
      annualRewardRateDecimal: 0.032,
      refreshVaultMetadata: jest.fn(),
    });

    const { result } = renderHookWithProvider(() =>
      useEarnMetadata(mockEarnToken),
    );

    expect(mockUseVaultMetadata).toHaveBeenCalledWith('1'); // getDecimalChainId('1') returns '1'
    expect(result.current).toEqual({
      annualRewardRate: '3.2%',
      annualRewardRateDecimal: 0.032,
      annualRewardRateValue: 3.2,
      isLoadingEarnMetadata: true,
    });
  });

  it('should handle decimal places correctly for STABLECOIN_LENDING', () => {
    const mockEarnToken: EarnTokenDetails = {
      address: '0x123',
      chainId: '1',
      decimals: 18,
      symbol: 'USDC',
      ticker: 'USDC',
      experience: {
        type: EARN_EXPERIENCES.STABLECOIN_LENDING,
        apr: '5.5555',
      },
    } as EarnTokenDetails;

    const { result } = renderHookWithProvider(() =>
      useEarnMetadata(mockEarnToken),
    );

    expect(result.current).toEqual({
      annualRewardRate: '5.6%', // Rounded to 1 decimal place
      annualRewardRateDecimal: 0.055555, // Using BigNumber's precision
      annualRewardRateValue: 5.5555,
      isLoadingEarnMetadata: false,
    });
  });

  it('should handle zero APR for STABLECOIN_LENDING', () => {
    const mockEarnToken: EarnTokenDetails = {
      address: '0x123',
      chainId: '1',
      decimals: 18,
      symbol: 'USDC',
      ticker: 'USDC',
      experience: {
        type: EARN_EXPERIENCES.STABLECOIN_LENDING,
        apr: '0',
      },
    } as EarnTokenDetails;

    const { result } = renderHookWithProvider(() =>
      useEarnMetadata(mockEarnToken),
    );

    expect(result.current).toEqual({
      annualRewardRate: '0.0%',
      annualRewardRateDecimal: 0,
      annualRewardRateValue: 0,
      isLoadingEarnMetadata: false,
    });
  });

  it('should handle zero APR for POOLED_STAKING', () => {
    const mockEarnToken: EarnTokenDetails = {
      address: '0x123',
      chainId: '1',
      decimals: 18,
      symbol: 'ETH',
      ticker: 'ETH',
      experience: {
        type: EARN_EXPERIENCES.POOLED_STAKING,
      },
    } as EarnTokenDetails;

    mockUseVaultMetadata.mockReturnValue({
      vaultMetadata: mockVaultData,
      isLoadingVaultMetadata: false,
      error: null,
      annualRewardRate: '0.0%',
      annualRewardRateDecimal: 0,
      refreshVaultMetadata: jest.fn(),
    });

    const { result } = renderHookWithProvider(() =>
      useEarnMetadata(mockEarnToken),
    );

    expect(result.current).toEqual({
      annualRewardRate: '0.0%',
      annualRewardRateDecimal: 0,
      annualRewardRateValue: 0,
      isLoadingEarnMetadata: false,
    });
  });
});
