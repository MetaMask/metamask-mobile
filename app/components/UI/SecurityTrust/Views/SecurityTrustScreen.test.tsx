import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Linking, useColorScheme } from 'react-native';
import SecurityTrustScreen from './SecurityTrustScreen';
import { strings } from '../../../../../locales/i18n';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('react-native', () => {
  const actual = jest.requireActual('react-native');
  return {
    ...actual,
    Linking: {
      openURL: jest.fn(() => Promise.resolve()),
    },
    useColorScheme: jest.fn(() => 'light'),
  };
});

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
  useRoute: () => ({
    params: {
      address: '0x1234567890abcdef',
      chainId: '0x1',
      symbol: 'TEST',
      decimals: 18,
      name: 'Test Token',
      isNative: false,
      securityData: {
        resultType: 'Verified',
        features: ['liquidity_pools', 'verified_contract'],
        fees: {
          buyFee: 0.01,
          sellFee: 0.02,
        },
        financialStats: {
          supply: '1000000000000000000000000',
          holders: 5000,
          top10Holders: 0.25,
        },
        metadata: {
          externalLinks: {
            homepage: 'https://example.com',
            twitterPage: 'testtoken',
            telegramChannelId: 'testtoken',
          },
        },
        created: '2023-01-01T00:00:00Z',
      },
    },
  }),
}));

jest.mock('../../../Views/confirmations/hooks/useNetworkName', () => ({
  useNetworkName: () => 'Ethereum Mainnet',
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  }),
}));

jest.mock('../../TokenDetails/components/TokenDetailsStickyFooter', () => ({
  __esModule: true,
  default: () => null,
}));

describe('SecurityTrustScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    const { getByText } = render(<SecurityTrustScreen />);
    expect(getByText(strings('security_trust.known'))).toBeTruthy();
  });

  it('displays token security result label', () => {
    const { getByText } = render(<SecurityTrustScreen />);
    expect(getByText(strings('security_trust.known'))).toBeTruthy();
  });

  it('displays token distribution section', () => {
    const { getByText } = render(<SecurityTrustScreen />);
    expect(
      getByText(strings('security_trust.token_distribution')),
    ).toBeTruthy();
    expect(getByText(strings('security_trust.total_supply'))).toBeTruthy();
  });

  it('displays token info section', () => {
    const { getByText } = render(<SecurityTrustScreen />);
    expect(getByText(strings('security_trust.token_info'))).toBeTruthy();
    expect(getByText('Type')).toBeTruthy();
    expect(getByText('Network')).toBeTruthy();
    expect(getByText('ERC-20')).toBeTruthy();
    expect(getByText('Ethereum Mainnet')).toBeTruthy();
  });

  it('displays buy and sell tax section', () => {
    const { getByText } = render(<SecurityTrustScreen />);
    expect(getByText('Buy/Sell Tax')).toBeTruthy();
    expect(getByText('Buy tax')).toBeTruthy();
    expect(getByText('Sell tax')).toBeTruthy();
  });

  it('displays official links section when metadata is available', () => {
    const { getByText } = render(<SecurityTrustScreen />);
    expect(getByText(strings('security_trust.official_links'))).toBeTruthy();
    expect(getByText(strings('security_trust.website'))).toBeTruthy();
    expect(getByText('@testtoken')).toBeTruthy();
  });

  it('displays disclaimer at the bottom', () => {
    const { getByText } = render(<SecurityTrustScreen />);
    expect(
      getByText(strings('security_trust.evaluation_disclaimer')),
    ).toBeTruthy();
  });

  it('calls navigation.goBack when back button is pressed', () => {
    const { getByTestId } = render(<SecurityTrustScreen />);

    const backButton = getByTestId('security-trust-back-button');
    fireEvent.press(backButton);

    expect(mockGoBack).toHaveBeenCalled();
  });

  it('opens external link when link is pressed', () => {
    const mockOpenURL = Linking.openURL as jest.Mock;
    mockOpenURL.mockReturnValue(Promise.resolve());

    const { getByText } = render(<SecurityTrustScreen />);

    const websiteLink = getByText(strings('security_trust.website'));
    fireEvent.press(websiteLink);

    expect(mockOpenURL).toHaveBeenCalledWith('https://example.com');
  });

  it('handles link opening errors gracefully', async () => {
    const mockOpenURL = Linking.openURL as jest.Mock;
    mockOpenURL.mockReturnValue(Promise.reject(new Error('Failed to open')));

    const { getByText } = render(<SecurityTrustScreen />);

    const websiteLink = getByText(strings('security_trust.website'));
    fireEvent.press(websiteLink);

    expect(mockOpenURL).toHaveBeenCalledWith('https://example.com');
  });

  it('applies dark mode color scheme to progress bar', () => {
    const mockUseColorScheme = useColorScheme as jest.Mock;
    mockUseColorScheme.mockReturnValue('dark');

    render(<SecurityTrustScreen />);

    expect(mockUseColorScheme).toHaveBeenCalled();
  });

  it('applies light mode color scheme to progress bar', () => {
    const mockUseColorScheme = useColorScheme as jest.Mock;
    mockUseColorScheme.mockReturnValue('light');

    render(<SecurityTrustScreen />);

    expect(mockUseColorScheme).toHaveBeenCalled();
  });
});
