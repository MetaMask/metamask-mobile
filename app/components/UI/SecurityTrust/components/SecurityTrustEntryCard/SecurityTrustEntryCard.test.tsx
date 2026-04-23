import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import SecurityTrustEntryCard from './SecurityTrustEntryCard';
import { strings } from '../../../../../../locales/i18n';
import type { TokenSecurityData } from '../../types';
import type { TokenDetailsRouteParams } from '../../../TokenDetails/constants/constants';
import Routes from '../../../../../constants/navigation/Routes';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

const mockToken: TokenDetailsRouteParams = {
  address: '0x1234567890abcdef',
  chainId: '0x1',
  symbol: 'TEST',
  decimals: 18,
  name: 'Test Token',
  isNative: false,
  image: 'https://example.com/token.png',
  balance: '1000000000000000000',
  logo: 'https://example.com/logo.png',
  isETH: false,
};

const mockSecurityData: TokenSecurityData = {
  resultType: 'Verified',
  maliciousScore: '0',
  features: [
    {
      featureId: 'liquidity_pools',
      type: 'info',
      description: 'Has liquidity pools',
    },
    {
      featureId: 'verified_contract',
      type: 'info',
      description: 'Contract is verified',
    },
  ],
  fees: {
    transfer: 0,
    transferFeeMaxAmount: null,
    buy: 0.01,
    sell: 0.02,
  },
  financialStats: {
    supply: 1000000000000000000000000,
    topHolders: [],
    holdersCount: 5000,
    tradeVolume24h: null,
    lockedLiquidityPct: null,
    markets: [],
  },
  metadata: {
    externalLinks: {
      homepage: 'https://example.com',
      twitterPage: 'testtoken',
      telegramChannelId: null,
    },
  },
  created: '2023-01-01T00:00:00Z',
};

describe('SecurityTrustEntryCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state with skeletons', () => {
    const { queryByText, getByTestId } = render(
      <SecurityTrustEntryCard
        securityData={null}
        isLoading
        token={mockToken}
      />,
    );

    expect(queryByText(strings('security_trust.title'))).toBeNull();
    expect(getByTestId('security-trust-entry-card')).toBeTruthy();
  });

  it('renders security data with title and result label', () => {
    const { getByText } = render(
      <SecurityTrustEntryCard
        securityData={mockSecurityData}
        isLoading={false}
        token={mockToken}
      />,
    );

    expect(getByText(strings('security_trust.title'))).toBeTruthy();
    expect(getByText(strings('security_trust.verified'))).toBeTruthy();
  });

  it('displays arrow icon when details are available', () => {
    const { getByText } = render(
      <SecurityTrustEntryCard
        securityData={mockSecurityData}
        isLoading={false}
        token={mockToken}
      />,
    );

    expect(getByText(strings('security_trust.title'))).toBeTruthy();
    expect(getByText(strings('security_trust.verified'))).toBeTruthy();
  });

  it('navigates to security trust screen when pressed with details', () => {
    const { getByTestId } = render(
      <SecurityTrustEntryCard
        securityData={mockSecurityData}
        isLoading={false}
        token={mockToken}
      />,
    );

    fireEvent.press(getByTestId('security-trust-entry-card'));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.SECURITY_TRUST, {
      ...mockToken,
      securityData: mockSecurityData,
    });
  });

  it('does not navigate when pressed without details', () => {
    const securityDataNoFeatures: TokenSecurityData = {
      resultType: 'Verified',
      maliciousScore: '0',
      features: [],
      fees: {
        transfer: 0,
        transferFeeMaxAmount: null,
        buy: 0,
        sell: null,
      },
      financialStats: {
        supply: 0,
        topHolders: [],
        holdersCount: 0,
        tradeVolume24h: null,
        lockedLiquidityPct: null,
        markets: [],
      },
      metadata: {
        externalLinks: {
          homepage: null,
          twitterPage: null,
          telegramChannelId: null,
        },
      },
      created: '2023-01-01T00:00:00Z',
    };

    const { getByTestId } = render(
      <SecurityTrustEntryCard
        securityData={securityDataNoFeatures}
        isLoading={false}
        token={mockToken}
      />,
    );

    fireEvent.press(getByTestId('security-trust-entry-card'));

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('does not display arrow icon when no details available', () => {
    const securityDataNoFeatures: TokenSecurityData = {
      resultType: 'Verified',
      maliciousScore: '0',
      features: [],
      fees: {
        transfer: 0,
        transferFeeMaxAmount: null,
        buy: 0,
        sell: null,
      },
      financialStats: {
        supply: 0,
        topHolders: [],
        holdersCount: 0,
        tradeVolume24h: null,
        lockedLiquidityPct: null,
        markets: [],
      },
      metadata: {
        externalLinks: {
          homepage: null,
          twitterPage: null,
          telegramChannelId: null,
        },
      },
      created: '2023-01-01T00:00:00Z',
    };

    const { queryByTestId } = render(
      <SecurityTrustEntryCard
        securityData={securityDataNoFeatures}
        isLoading={false}
        token={mockToken}
      />,
    );

    expect(queryByTestId('icon-arrow-right')).toBeNull();
  });

  it('displays subtitle when no features but subtitle exists', () => {
    const securityDataNoFeatures: TokenSecurityData = {
      resultType: 'NotEnoughData',
      maliciousScore: '0',
      features: [],
      fees: {
        transfer: 0,
        transferFeeMaxAmount: null,
        buy: 0,
        sell: null,
      },
      financialStats: {
        supply: 0,
        topHolders: [],
        holdersCount: 0,
        tradeVolume24h: null,
        lockedLiquidityPct: null,
        markets: [],
      },
      metadata: {
        externalLinks: {
          homepage: null,
          twitterPage: null,
          telegramChannelId: null,
        },
      },
      created: '2023-01-01T00:00:00Z',
    };

    const { getByText } = render(
      <SecurityTrustEntryCard
        securityData={securityDataNoFeatures}
        isLoading={false}
        token={mockToken}
      />,
    );

    expect(
      getByText('Security analysis could not be loaded for this token.'),
    ).toBeTruthy();
  });

  describe('Feature tag rendering', () => {
    it('renders feature tags for Warning tokens with features', () => {
      const warningData: TokenSecurityData = {
        resultType: 'Warning',
        maliciousScore: '50',
        features: [
          {
            featureId: 'AIRDROP_PATTERN',
            type: 'negative',
            description: 'Suspicious airdrop',
          },
        ],
        fees: {
          transfer: 0.1,
          transferFeeMaxAmount: null,
          buy: 0.05,
          sell: 0.05,
        },
        financialStats: {
          supply: 1000000,
          topHolders: [],
          holdersCount: 100,
          tradeVolume24h: null,
          lockedLiquidityPct: null,
          markets: [],
        },
        metadata: {
          externalLinks: {
            homepage: null,
            twitterPage: null,
            telegramChannelId: null,
          },
        },
        created: '2023-01-01T00:00:00Z',
      };

      const { getByText } = render(
        <SecurityTrustEntryCard
          securityData={warningData}
          isLoading={false}
          token={mockToken}
        />,
      );

      // Feature tag should be rendered for Warning severity
      expect(getByText('Suspicious airdrop')).toBeTruthy();
    });

    it('renders feature tags for Malicious tokens with features', () => {
      const maliciousData: TokenSecurityData = {
        resultType: 'Malicious',
        maliciousScore: '95',
        features: [
          {
            featureId: 'KNOWN_MALICIOUS',
            type: 'negative',
            description: 'Known malicious',
          },
          {
            featureId: 'RUGPULL',
            type: 'negative',
            description: 'Rugpull risk',
          },
        ],
        fees: {
          transfer: 0.99,
          transferFeeMaxAmount: null,
          buy: 0,
          sell: 0.99,
        },
        financialStats: {
          supply: 1000000,
          topHolders: [],
          holdersCount: 10,
          tradeVolume24h: null,
          lockedLiquidityPct: null,
          markets: [],
        },
        metadata: {
          externalLinks: {
            homepage: null,
            twitterPage: null,
            telegramChannelId: null,
          },
        },
        created: '2023-01-01T00:00:00Z',
      };

      const { getByText } = render(
        <SecurityTrustEntryCard
          securityData={maliciousData}
          isLoading={false}
          token={mockToken}
        />,
      );

      // Feature tags should be rendered for Malicious severity
      expect(getByText('Known malicious')).toBeTruthy();
      expect(getByText('Rugpull risk')).toBeTruthy();
    });

    it('renders feature tags for Verified tokens with features', () => {
      const verifiedDataWithFeatures: TokenSecurityData = {
        ...mockSecurityData,
        features: [
          {
            featureId: 'VERIFIED_CONTRACT',
            type: 'info',
            description: 'Contract is verified',
          },
        ],
      };

      const { getByText } = render(
        <SecurityTrustEntryCard
          securityData={verifiedDataWithFeatures}
          isLoading={false}
          token={mockToken}
        />,
      );

      // Feature tag should be rendered for Verified severity
      expect(getByText('Published contract')).toBeTruthy();
    });

    it('renders positive feature tags for Benign tokens', () => {
      const benignData: TokenSecurityData = {
        resultType: 'Benign',
        maliciousScore: '0',
        features: [
          {
            featureId: 'HIGH_REPUTATION_TOKEN',
            type: 'info',
            description: 'High reputation',
          },
        ],
        fees: {
          transfer: 0,
          transferFeeMaxAmount: null,
          buy: 0,
          sell: 0,
        },
        financialStats: {
          supply: 1000000,
          topHolders: [],
          holdersCount: 5000,
          tradeVolume24h: null,
          lockedLiquidityPct: null,
          markets: [],
        },
        metadata: {
          externalLinks: {
            homepage: null,
            twitterPage: null,
            telegramChannelId: null,
          },
        },
        created: '2023-01-01T00:00:00Z',
      };

      const { getByText } = render(
        <SecurityTrustEntryCard
          securityData={benignData}
          isLoading={false}
          token={mockToken}
        />,
      );

      // Positive feature tag should be rendered for Benign
      expect(getByText('Established reputation')).toBeTruthy();
    });

    it('does not render feature tags when there are no recognized features', () => {
      const verifiedNoFeatures: TokenSecurityData = {
        ...mockSecurityData,
        features: [],
      };

      const { queryByText } = render(
        <SecurityTrustEntryCard
          securityData={verifiedNoFeatures}
          isLoading={false}
          token={mockToken}
        />,
      );

      // No feature tags should be rendered when features array is empty
      expect(queryByText('Published contract')).toBeNull();
      expect(queryByText('Honeypot risk')).toBeNull();
    });
  });
});
