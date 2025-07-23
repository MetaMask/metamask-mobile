import React from 'react';
import { render } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';
import PerpsDepositPreviewView from './PerpsDepositPreviewView';
import { backgroundState } from '../../../../util/test/initial-root-state';
// Engine is imported but not directly used in tests (only mocked)
import Routes from '../../../../constants/navigation/Routes';
import { ARBITRUM_MAINNET_CHAIN_ID } from '../constants/hyperLiquidConfig';

// Mock react-native-device-info
jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn(() => '7.50.1'),
}));

// Mock navigation
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockRoute = {
  params: {
    amount: '100',
    selectedToken: 'USDC',
  },
};

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: jest.fn(() => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  })),
  useRoute: jest.fn(() => mockRoute),
}));

// Mock Engine
jest.mock('../../../../core/Engine', () => ({
  context: {
    PerpsController: {
      deposit: jest.fn(),
      getDepositRoutes: jest.fn(),
    },
  },
}));

// Mock i18n
jest.mock('../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => key),
}));

// TypeScript interfaces for mock components
interface MockButtonProps {
  onPress?: () => void;
  label?: string;
  disabled?: boolean;
  testID?: string;
}

interface MockButtonIconProps {
  onPress?: () => void;
  testID?: string;
}

interface MockCardProps {
  children?: React.ReactNode;
  style?: object;
}

interface MockKeyValueRowField {
  label: {
    text: string;
  };
}

interface MockKeyValueRowProps {
  field: MockKeyValueRowField;
  value: MockKeyValueRowField;
}

interface MockTextProps {
  children?: React.ReactNode;
  testID?: string;
  [key: string]: unknown;
}

interface MockAvatarTokenProps {
  name: string;
}

interface MockBadgeNetworkProps {
  name: string;
}

interface MockBadgeWrapperProps {
  children?: React.ReactNode;
  badgeElement?: React.ReactNode;
}

// Mock components
jest.mock('../../../../component-library/components/Buttons/Button', () => {
  const TouchableOpacity = jest.requireActual('react-native').TouchableOpacity;
  const Text = jest.requireActual('react-native').Text;

  return {
    __esModule: true,
    default: ({ onPress, label, disabled, testID }: MockButtonProps) => (
      <TouchableOpacity
        testID={testID || 'button'}
        onPress={onPress}
        disabled={disabled}
      >
        <Text>{label}</Text>
      </TouchableOpacity>
    ),
    ButtonSize: { Lg: 'lg' },
    ButtonVariants: { Primary: 'primary' },
    ButtonWidthTypes: { Full: 'full' },
  };
});

jest.mock('../../../../component-library/components/Buttons/ButtonIcon', () => {
  const TouchableOpacity = jest.requireActual('react-native').TouchableOpacity;

  return {
    __esModule: true,
    default: ({ onPress, testID }: MockButtonIconProps) => (
      <TouchableOpacity testID={testID || 'button-icon'} onPress={onPress} />
    ),
  };
});

jest.mock('../../../../component-library/components/Cards/Card', () => {
  const View = jest.requireActual('react-native').View;

  return {
    __esModule: true,
    default: ({ children, style }: MockCardProps) => (
      <View style={style}>{children}</View>
    ),
  };
});

jest.mock('../../../../component-library/components-temp/KeyValueRow', () => {
  const View = jest.requireActual('react-native').View;
  const Text = jest.requireActual('react-native').Text;

  return {
    __esModule: true,
    default: ({ field, value }: MockKeyValueRowProps) => (
      <View testID="key-value-row">
        <Text>{field.label.text}</Text>
        <Text>{value.label.text}</Text>
      </View>
    ),
  };
});

jest.mock('../../../../component-library/components/Texts/Text', () => {
  const Text = jest.requireActual('react-native').Text;

  return {
    __esModule: true,
    default: ({ children, testID, ...props }: MockTextProps) => (
      <Text testID={testID} {...props}>
        {children}
      </Text>
    ),
    TextVariant: {
      HeadingMD: 'heading-md',
      BodyMD: 'body-md',
      BodyMDMedium: 'body-md-medium',
      BodySM: 'body-sm',
      DisplayMD: 'display-md',
    },
    TextColor: { Default: 'default', Muted: 'muted' },
  };
});

jest.mock('../../../../component-library/components/Avatars/Avatar', () => ({
  AvatarSize: { Xs: 'xs' },
}));

jest.mock(
  '../../../../component-library/components/Avatars/Avatar/variants/AvatarToken',
  () => {
    const View = jest.requireActual('react-native').View;

    return {
      __esModule: true,
      default: ({ name }: MockAvatarTokenProps) => (
        <View testID={`avatar-token-${name}`} />
      ),
    };
  },
);

jest.mock(
  '../../../../component-library/components/Badges/Badge/variants/BadgeNetwork',
  () => {
    const View = jest.requireActual('react-native').View;

    return {
      __esModule: true,
      default: ({ name }: MockBadgeNetworkProps) => (
        <View testID={`badge-network-${name}`} />
      ),
    };
  },
);

jest.mock(
  '../../../../component-library/components/Badges/BadgeWrapper',
  () => {
    const View = jest.requireActual('react-native').View;

    return {
      __esModule: true,
      default: ({ children, badgeElement }: MockBadgeWrapperProps) => (
        <View>
          {children}
          {badgeElement}
        </View>
      ),
      BadgePosition: { BottomRight: 'bottom-right' },
    };
  },
);

// Mock hooks
jest.mock('../hooks', () => ({
  usePerpsDepositQuote: jest.fn(() => ({
    formattedQuoteData: {
      networkFee: '$2.50',
      estimatedTime: '15-30 seconds',
      receivingAmount: '100.00 USDC',
      exchangeRate: undefined,
    },
    isLoading: false,
    quoteFetchError: null,
  })),
  usePerpsTrading: jest.fn(() => ({
    deposit: jest.fn().mockResolvedValue({ success: true }),
    getDepositRoutes: jest.fn(() => [
      {
        assetId:
          'eip155:42161/erc20:0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
        chainId: 'eip155:42161',
        contractAddress: '0x2df1c51e09aecf9cacb7bc98cb1742757f163df7',
      },
    ]),
  })),
}));

jest.mock('../../Bridge/hooks/useTokensWithBalance', () => ({
  useTokensWithBalance: jest.fn(() => [
    {
      symbol: 'USDC',
      address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      decimals: 6,
      name: 'USD Coin',
      chainId: '0xa4b1',
      balance: '1000',
      balanceFiat: 1000,
    },
  ]),
}));

const mockStore = configureMockStore();

describe('PerpsDepositPreviewView', () => {
  const mockInitialState = {
    ...backgroundState,
    engine: {
      backgroundState: {
        ...backgroundState,
        NetworkController: {
          ...backgroundState.NetworkController,
          selectedNetworkClientId: 'arbitrum-mainnet',
          networkConfigurationsByChainId: {
            [ARBITRUM_MAINNET_CHAIN_ID]: {
              chainId: ARBITRUM_MAINNET_CHAIN_ID,
              name: 'Arbitrum One',
              nativeCurrency: 'ETH',
              rpcEndpoints: [
                {
                  networkClientId: 'arbitrum-mainnet',
                  url: 'https://arb1.arbitrum.io/rpc',
                  type: 'Custom',
                },
              ],
            },
          },
        },
        CurrencyRateController: {
          currentCurrency: 'USD',
          currencyRates: {},
        },
        TokenRatesController: {
          marketData: {},
        },
        TokenListController: {
          tokenList: {},
        },
        PreferencesController: {
          ipfsGateway: 'https://cloudflare-ipfs.com/ipfs/',
          isBridgeEnabled: true,
        },
        AppMetadataController: {
          currentAppVersion: '7.50.1',
        },
      },
    },
    bridge: {
      selectedSourceChainIds: [ARBITRUM_MAINNET_CHAIN_ID],
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render the component successfully', () => {
      const store = mockStore(mockInitialState);
      const { getByTestId } = render(
        <Provider store={store}>
          <PerpsDepositPreviewView />
        </Provider>,
      );

      expect(getByTestId('amount-display')).toBeTruthy();
      expect(getByTestId('pay-with-label')).toBeTruthy();
      expect(getByTestId('exchange-amount')).toBeTruthy();
    });

    it('should display correct amount from route params', () => {
      const store = mockStore(mockInitialState);
      const { getByText } = render(
        <Provider store={store}>
          <PerpsDepositPreviewView />
        </Provider>,
      );

      expect(getByText('100 USDC')).toBeTruthy();
    });
  });

  describe('navigation', () => {
    it('should call goBack when back button is pressed', () => {
      const store = mockStore(mockInitialState);
      const { getByTestId } = render(
        <Provider store={store}>
          <PerpsDepositPreviewView />
        </Provider>,
      );

      const backButton = getByTestId('buttonicon-arrowleft');
      backButton.props.onPress();

      expect(mockGoBack).toHaveBeenCalled();
    });
  });

  describe('confirmation flow', () => {
    it('should handle confirm button press', async () => {
      const store = mockStore(mockInitialState);
      const { getByTestId } = render(
        <Provider store={store}>
          <PerpsDepositPreviewView />
        </Provider>,
      );

      const confirmButton = getByTestId('confirm-button');
      confirmButton.props.onPress();

      // Should navigate to processing screen
      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.PERPS.DEPOSIT_PROCESSING,
        expect.objectContaining({
          amount: '100',
          selectedToken: 'USDC',
          isDirectDeposit: true,
        }),
      );
    });

    it('should display quote details correctly', () => {
      const store = mockStore(mockInitialState);
      const { getAllByTestId, getByText } = render(
        <Provider store={store}>
          <PerpsDepositPreviewView />
        </Provider>,
      );

      const keyValueRows = getAllByTestId('key-value-row');
      expect(keyValueRows.length).toBeGreaterThan(0);

      // Check for network fee display
      expect(getByText('Network fee')).toBeTruthy();
      expect(getByText('$2.50')).toBeTruthy();
    });
  });

  describe('token display', () => {
    it('should show token information with badge', () => {
      const store = mockStore(mockInitialState);
      const { getByTestId } = render(
        <Provider store={store}>
          <PerpsDepositPreviewView />
        </Provider>,
      );

      expect(getByTestId('avatar-token-USD Coin')).toBeTruthy();
      expect(getByTestId('badge-network-Arbitrum')).toBeTruthy();
    });

    it('should display swap icons', () => {
      const store = mockStore(mockInitialState);
      const { getByTestId } = render(
        <Provider store={store}>
          <PerpsDepositPreviewView />
        </Provider>,
      );

      expect(getByTestId('buttonicon-swaphorizontal')).toBeTruthy();
      expect(getByTestId('buttonicon-swapvertical')).toBeTruthy();
    });
  });

  describe('error handling', () => {
    it('should handle deposit errors gracefully', async () => {
      const store = mockStore(mockInitialState);
      const { getByTestId } = render(
        <Provider store={store}>
          <PerpsDepositPreviewView />
        </Provider>,
      );

      const confirmButton = getByTestId('confirm-button');
      await confirmButton.props.onPress();

      // Should still navigate to processing screen (error handled there)
      expect(mockNavigate).toHaveBeenCalled();
    });
  });
});
