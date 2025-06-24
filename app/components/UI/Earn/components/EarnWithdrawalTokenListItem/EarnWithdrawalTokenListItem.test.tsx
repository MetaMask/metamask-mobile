import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import EarnWithdrawalTokenListItem from '.';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { strings } from '../../../../../../locales/i18n';
import { useSelector } from 'react-redux';
import { selectNetworkName } from '../../../../../selectors/networkInfos';
import { getMockUseEarnTokens } from '../../__mocks__/earnMockData';
import { EARN_EXPERIENCES } from '../../constants/experiences';
import { EarnTokenDetails, LendingProtocol } from '../../types/lending.types';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

describe('EarnWithdrawalTokenListItem', () => {
  const mockNetworkName = 'Ethereum Mainnet';
  const mockOnPress = jest.fn();

  beforeEach(() => {
    (useSelector as jest.Mock).mockImplementation((selector) => {
      if (selector === selectNetworkName) return mockNetworkName;
      return undefined;
    });
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const createMockToken = (
    baseToken: Partial<EarnTokenDetails>,
    overrides: Partial<EarnTokenDetails> = {},
  ): EarnTokenDetails => {
    const defaultExperience = {
      type: EARN_EXPERIENCES.POOLED_STAKING,
      apr: '2.3',
      estimatedAnnualRewardsFormatted: '$19.00',
      estimatedAnnualRewardsFiatNumber: 18.46164,
      estimatedAnnualRewardsTokenMinimalUnit: '0',
      estimatedAnnualRewardsTokenFormatted: '0',
      vault: {
        apy: '2.344449857296608053097345132743363',
        capacity:
          '115792089237316195423570985008687907853269984665640564039457584007913129639935',
        feePercent: 1500,
        totalAssets: '33962845608699712133594',
        vaultAddress: '0xdef',
      },
    };

    return {
      balance: '0',
      logo: '../images/eth-logo-new.png',
      balanceFormatted: '0 ETH',
      balanceMinimalUnit: '0',
      balanceFiat: '$0.00',
      balanceFiatNumber: 0,
      tokenUsdExchangeRate: 1,
      experiences: [defaultExperience],
      ...baseToken,
      experience: defaultExperience,
      ...overrides,
    } as EarnTokenDetails;
  };

  it('renders correctly with pooled staking token', () => {
    const baseToken = getMockUseEarnTokens(
      EARN_EXPERIENCES.POOLED_STAKING,
    ).outputToken;
    const mockToken = createMockToken(
      baseToken as unknown as Partial<EarnTokenDetails>,
    );
    const { getByText } = renderWithProvider(
      <EarnWithdrawalTokenListItem
        earnToken={mockToken}
        onPress={mockOnPress}
      />,
    );

    expect(getByText(mockToken.name)).toBeDefined();
    expect(
      getByText(
        `${strings('earn.earning')} ${parseFloat(
          mockToken.experience?.apr,
        ).toFixed(1)}%`,
      ),
    ).toBeDefined();
    expect(getByText(mockToken.balanceFormatted)).toBeDefined();
    expect(getByText(mockToken.balanceFiat as string)).toBeDefined();
  });

  it('renders correctly with stablecoin lending token', () => {
    const baseToken = getMockUseEarnTokens(
      EARN_EXPERIENCES.STABLECOIN_LENDING,
    ).outputToken;
    const mockToken = createMockToken(
      baseToken as unknown as Partial<EarnTokenDetails>,
      {
        experience: {
          type: EARN_EXPERIENCES.STABLECOIN_LENDING,
          apr: '4.0',
          estimatedAnnualRewardsFormatted: '$5.00',
          estimatedAnnualRewardsFiatNumber: 4.147826431784605,
          estimatedAnnualRewardsTokenMinimalUnit: '0',
          estimatedAnnualRewardsTokenFormatted: '0',
          market: {
            id: '0xdef',
            chainId: 1,
            protocol: 'aave' as LendingProtocol,
            name: 'USDC Market',
            address: '0xdef',
            netSupplyRate: 4.0,
            totalSupplyRate: 4.0,
            rewards: [],
            tvlUnderlying: '1000000',
            underlying: {
              address: '0xabc',
              chainId: 1,
            },
            outputToken: {
              address: '0xdef',
              chainId: 1,
            },
            position: {
              id: '0xdef-0xabc',
              chainId: 1,
              marketId: '0xdef',
              marketAddress: '0xdef',
              protocol: 'aave' as LendingProtocol,
              assets: '1000000',
            },
          },
        },
      },
    );
    const { getByText } = renderWithProvider(
      <EarnWithdrawalTokenListItem
        earnToken={mockToken}
        onPress={mockOnPress}
      />,
    );

    expect(getByText(mockToken.name)).toBeDefined();
    expect(
      getByText(
        `${strings('earn.earning')} ${parseFloat(
          mockToken.experience?.apr,
        ).toFixed(1)}%`,
      ),
    ).toBeDefined();
    expect(getByText(mockToken.balanceFormatted)).toBeDefined();
    expect(getByText(mockToken.balanceFiat as string)).toBeDefined();
  });

  it('handles token press correctly', () => {
    const baseToken = getMockUseEarnTokens(
      EARN_EXPERIENCES.POOLED_STAKING,
    ).outputToken;
    const mockToken = createMockToken(
      baseToken as unknown as Partial<EarnTokenDetails>,
    );
    const { getByText } = renderWithProvider(
      <EarnWithdrawalTokenListItem
        earnToken={mockToken}
        onPress={mockOnPress}
      />,
    );

    fireEvent.press(getByText(mockToken.name));
    expect(mockOnPress).toHaveBeenCalledWith(mockToken);
  });

  it('renders correctly when balanceFiat is tokenRateUndefined', () => {
    const baseToken = getMockUseEarnTokens(
      EARN_EXPERIENCES.POOLED_STAKING,
    ).outputToken;
    const mockToken = createMockToken(
      baseToken as unknown as Partial<EarnTokenDetails>,
      {
        balanceFiat: 'tokenRateUndefined',
      },
    );
    const { getByText, queryByText } = renderWithProvider(
      <EarnWithdrawalTokenListItem
        earnToken={mockToken}
        onPress={mockOnPress}
      />,
    );

    expect(getByText(mockToken.name)).toBeDefined();
    expect(getByText(mockToken.balanceFormatted)).toBeDefined();
    expect(queryByText('tokenRateUndefined')).toBeNull();
  });

  it('renders correctly with zero APR', () => {
    const baseToken = getMockUseEarnTokens(
      EARN_EXPERIENCES.POOLED_STAKING,
    ).outputToken;
    const mockToken = createMockToken(
      baseToken as unknown as Partial<EarnTokenDetails>,
      {
        experience: {
          type: EARN_EXPERIENCES.POOLED_STAKING,
          apr: '0',
          estimatedAnnualRewardsFormatted: '$0.00',
          estimatedAnnualRewardsFiatNumber: 0,
          estimatedAnnualRewardsTokenMinimalUnit: '0',
          estimatedAnnualRewardsTokenFormatted: '0',
          vault: {
            apy: '0',
            capacity: '0',
            feePercent: 0,
            totalAssets: '0',
            vaultAddress: '0xdef',
          },
        },
      },
    );
    const { getByText } = renderWithProvider(
      <EarnWithdrawalTokenListItem
        earnToken={mockToken}
        onPress={mockOnPress}
      />,
    );

    expect(getByText(`${strings('earn.earning')} 0.0%`)).toBeDefined();
  });

  it('does not render when earnToken is null', () => {
    const { toJSON } = renderWithProvider(
      <EarnWithdrawalTokenListItem
        earnToken={null as unknown as EarnTokenDetails}
        onPress={mockOnPress}
      />,
    );

    expect(toJSON()).toBeNull();
  });
});
