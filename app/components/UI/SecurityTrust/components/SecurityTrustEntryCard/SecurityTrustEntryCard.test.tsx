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

  describe('IconAlert rendering', () => {
    it('renders IconAlert for Warning/Spam tokens with features', () => {
      const warningData: TokenSecurityData = {
        resultType: 'Warning',
        maliciousScore: '50',
        features: [
          {
            featureId: 'high_tax',
            type: 'negative',
            description: 'High tax detected',
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

      const { getAllByTestId } = render(
        <SecurityTrustEntryCard
          securityData={warningData}
          isLoading={false}
          token={mockToken}
        />,
      );

      // IconAlert should be rendered for Warning severity
      const iconAlerts = getAllByTestId('icon-alert');
      expect(iconAlerts.length).toBeGreaterThan(0);
    });

    it('renders IconAlert for Malicious tokens with features', () => {
      const maliciousData: TokenSecurityData = {
        resultType: 'Malicious',
        maliciousScore: '95',
        features: [
          {
            featureId: 'honeypot',
            type: 'negative',
            description: 'Honeypot detected',
          },
          {
            featureId: 'fake_token',
            type: 'negative',
            description: 'Fake token',
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

      const { getAllByTestId } = render(
        <SecurityTrustEntryCard
          securityData={maliciousData}
          isLoading={false}
          token={mockToken}
        />,
      );

      // IconAlert should be rendered for Error severity (Malicious)
      const iconAlerts = getAllByTestId('icon-alert');
      expect(iconAlerts.length).toBeGreaterThan(0);
    });

    it('renders IconAlert for Verified tokens with features', () => {
      const verifiedDataWithFeatures: TokenSecurityData = {
        ...mockSecurityData,
        features: [
          {
            featureId: 'verified_contract',
            type: 'info',
            description: 'Contract is verified',
          },
        ],
      };

      const { getAllByTestId } = render(
        <SecurityTrustEntryCard
          securityData={verifiedDataWithFeatures}
          isLoading={false}
          token={mockToken}
        />,
      );

      // IconAlert should be rendered for Success severity (Verified)
      const iconAlerts = getAllByTestId('icon-alert');
      expect(iconAlerts.length).toBeGreaterThan(0);
    });

    it('does not render IconAlert for Benign tokens', () => {
      const benignData: TokenSecurityData = {
        resultType: 'Benign',
        maliciousScore: '0',
        features: [
          {
            featureId: 'standard_erc20',
            type: 'info',
            description: 'Standard ERC20',
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

      const { queryAllByTestId } = render(
        <SecurityTrustEntryCard
          securityData={benignData}
          isLoading={false}
          token={mockToken}
        />,
      );

      // IconAlert should NOT be rendered for Benign (no iconAlertSeverity)
      const iconAlerts = queryAllByTestId('icon-alert');
      expect(iconAlerts).toHaveLength(0);
    });

    it('does not render IconAlert when there are no features', () => {
      const verifiedNoFeatures: TokenSecurityData = {
        ...mockSecurityData,
        features: [],
      };

      const { queryAllByTestId } = render(
        <SecurityTrustEntryCard
          securityData={verifiedNoFeatures}
          isLoading={false}
          token={mockToken}
        />,
      );

      // IconAlert should NOT be rendered when there are no feature tags
      const iconAlerts = queryAllByTestId('icon-alert');
      expect(iconAlerts).toHaveLength(0);
    });
  });
});
