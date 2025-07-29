import React from 'react';
import { render } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';
import PerpsDepositSuccessView from './PerpsDepositSuccessView';
import { backgroundState } from '../../../../util/test/initial-root-state';
import Routes from '../../../../constants/navigation/Routes';
// ARBITRUM_MAINNET_CHAIN_ID is imported but not used directly in tests

// Type interfaces for mocks
interface ButtonProps {
  onPress?: () => void;
  label?: string;
  disabled?: boolean;
  testID?: string;
  variant?: string;
  size?: string;
  width?: string;
  style?: Record<string, unknown>;
}

interface IconProps {
  name?: string;
  size?: string;
  color?: string;
}

interface TextComponentProps {
  children?: React.ReactNode;
  testID?: string;
  variant?: string;
  color?: string;
  style?: Record<string, unknown> | Record<string, unknown>[];
  [key: string]: unknown;
}

interface AvatarTokenProps {
  size?: string;
  name?: string;
  imageSource?: { uri: string };
}

interface BadgeNetworkProps {
  name?: string;
  imageSource?: { uri: string };
}

interface BadgeWrapperProps {
  children?: React.ReactNode;
  badgeElement?: React.ReactNode;
  badgePosition?: string;
}

// Mock react-native-device-info
jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn(() => '7.50.1'),
}));

// Mock navigation
const mockNavigate = jest.fn();
let mockRoute = {
  params: {
    amount: '100',
    selectedToken: 'USDC',
    txHash: '0x1234567890abcdef',
    processingTime: 45,
  } as {
    amount: string;
    selectedToken: string;
    txHash?: string;
    processingTime?: number;
  },
};

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: jest.fn(() => ({
    navigate: mockNavigate,
  })),
  useRoute: jest.fn(() => mockRoute),
}));

// Mock i18n
jest.mock('../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => key),
}));

// Mock components
jest.mock('../../../../component-library/components/Buttons/Button', () => {
  const TouchableOpacity = jest.requireActual('react-native').TouchableOpacity;
  const Text = jest.requireActual('react-native').Text;

  return {
    __esModule: true,
    default: ({ onPress, label, disabled, testID }: ButtonProps) => (
      <TouchableOpacity
        testID={testID || 'button'}
        onPress={onPress}
        disabled={disabled}
      >
        <Text>{label}</Text>
      </TouchableOpacity>
    ),
    ButtonSize: { Lg: 'lg' },
    ButtonVariants: { Primary: 'primary', Secondary: 'secondary' },
    ButtonWidthTypes: { Full: 'full' },
  };
});

jest.mock('../../../../component-library/components/Icons/Icon', () => {
  const View = jest.requireActual('react-native').View;

  return {
    __esModule: true,
    default: ({ name }: IconProps) => <View testID={`icon-${name}`} />,
    IconName: { Check: 'check' },
    IconSize: { Xl: 'xl' },
    IconColor: { Inverse: 'inverse' },
  };
});

jest.mock('../../../../component-library/components/Texts/Text', () => {
  const Text = jest.requireActual('react-native').Text;

  return {
    __esModule: true,
    default: ({ children, testID, style, ...props }: TextComponentProps) => (
      <Text testID={testID} style={style} {...props}>
        {children}
      </Text>
    ),
    TextVariant: {
      HeadingLG: 'heading-lg',
      BodyMD: 'body-md',
    },
    TextColor: {
      Default: 'default',
      Muted: 'muted',
      Success: 'success',
    },
  };
});

jest.mock('../../../../component-library/components/Avatars/Avatar', () => ({
  AvatarSize: { Md: 'md' },
}));

jest.mock(
  '../../../../component-library/components/Avatars/Avatar/variants/AvatarToken',
  () => {
    const View = jest.requireActual('react-native').View;

    return {
      __esModule: true,
      default: ({ name }: AvatarTokenProps) => (
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
      default: ({ name }: BadgeNetworkProps) => (
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
      default: ({ children, badgeElement }: BadgeWrapperProps) => (
        <View>
          {children}
          {badgeElement}
        </View>
      ),
      BadgePosition: { BottomRight: 'bottom-right' },
    };
  },
);

const mockStore = configureMockStore();

describe('PerpsDepositSuccessView', () => {
  const mockInitialState = {
    ...backgroundState,
    engine: {
      backgroundState: {
        ...backgroundState,
        TokenListController: {
          tokenList: {
            '0xaf88d065e77c8cC2239327C5EDb3A432268e5831': {
              address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
              symbol: 'USDC',
              decimals: 6,
              name: 'USD Coin',
              iconUrl: 'https://example.com/usdc-icon.png',
            },
          },
        },
        PreferencesController: {
          ipfsGateway: 'https://cloudflare-ipfs.com/ipfs/',
        },
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mockRoute to default state
    mockRoute = {
      params: {
        amount: '100',
        selectedToken: 'USDC',
        txHash: '0x1234567890abcdef',
        processingTime: 45,
      },
    };
  });

  describe('rendering', () => {
    it('should render the component successfully', () => {
      const store = mockStore(mockInitialState);
      const { getByText } = render(
        <Provider store={store}>
          <PerpsDepositSuccessView />
        </Provider>,
      );

      expect(getByText('perps.deposit.success.title')).toBeTruthy();
      expect(getByText('perps.deposit.success.description')).toBeTruthy();
    });

    it('should display deposit amount and token', () => {
      const store = mockStore(mockInitialState);
      const { getAllByText } = render(
        <Provider store={store}>
          <PerpsDepositSuccessView />
        </Provider>,
      );

      // Amount appears multiple times (header and info section)
      const amountTexts = getAllByText('100 USDC');
      expect(amountTexts.length).toBeGreaterThan(0);
    });

    it('should display success icon', () => {
      const store = mockStore(mockInitialState);
      const { getByTestId } = render(
        <Provider store={store}>
          <PerpsDepositSuccessView />
        </Provider>,
      );

      expect(getByTestId('icon-check')).toBeTruthy();
    });
  });

  describe('transaction info', () => {
    it('should display transaction details', () => {
      const store = mockStore(mockInitialState);
      const { getByText } = render(
        <Provider store={store}>
          <PerpsDepositSuccessView />
        </Provider>,
      );

      // Check labels
      expect(getByText('perps.deposit.success.amount')).toBeTruthy();
      expect(getByText('perps.deposit.success.processing_time')).toBeTruthy();
      expect(getByText('perps.deposit.success.status')).toBeTruthy();
      // Check values
      expect(getByText('45s')).toBeTruthy(); // Processing time
      expect(getByText('perps.deposit.success.completed')).toBeTruthy();
    });

    it('should format processing time correctly for minutes', () => {
      mockRoute = {
        params: {
          amount: '100',
          selectedToken: 'USDC',
          txHash: '0x1234567890abcdef',
          processingTime: 125, // 2m 5s
        },
      };

      const store = mockStore(mockInitialState);
      const { getByText } = render(
        <Provider store={store}>
          <PerpsDepositSuccessView />
        </Provider>,
      );

      expect(getByText('2m 5s')).toBeTruthy();
    });

    it('should handle missing processing time', () => {
      mockRoute = {
        params: {
          amount: '100',
          selectedToken: 'USDC',
          txHash: '0x1234567890abcdef',
          // processingTime is optional
        },
      };

      const store = mockStore(mockInitialState);
      const { getByText } = render(
        <Provider store={store}>
          <PerpsDepositSuccessView />
        </Provider>,
      );

      expect(getByText('Unknown')).toBeTruthy();
    });
  });

  describe('action buttons', () => {
    it('should display view balance button', () => {
      const store = mockStore(mockInitialState);
      const { getByTestId } = render(
        <Provider store={store}>
          <PerpsDepositSuccessView />
        </Provider>,
      );

      const viewBalanceButton = getByTestId('view-balance-button');
      expect(viewBalanceButton).toBeTruthy();
    });

    it('should navigate to trading view when view balance is pressed', () => {
      const store = mockStore(mockInitialState);
      const { getByTestId } = render(
        <Provider store={store}>
          <PerpsDepositSuccessView />
        </Provider>,
      );

      const viewBalanceButton = getByTestId('view-balance-button');
      viewBalanceButton.props.onPress();

      expect(mockNavigate).toHaveBeenCalledWith(Routes.WALLET_VIEW);
    });

    it('should display view transaction button when txHash is provided', () => {
      const store = mockStore(mockInitialState);
      const { getByTestId } = render(
        <Provider store={store}>
          <PerpsDepositSuccessView />
        </Provider>,
      );

      expect(getByTestId('view-transaction-button')).toBeTruthy();
    });

    it('should not display view transaction button when txHash is missing', () => {
      mockRoute = {
        params: {
          amount: '100',
          selectedToken: 'USDC',
          // No txHash
        },
      };

      const store = mockStore(mockInitialState);
      const { queryByTestId } = render(
        <Provider store={store}>
          <PerpsDepositSuccessView />
        </Provider>,
      );

      expect(queryByTestId('view-transaction-button')).toBeFalsy();
    });
  });

  describe('token display', () => {
    it('should display token with badge', () => {
      const store = mockStore(mockInitialState);
      const { getByTestId } = render(
        <Provider store={store}>
          <PerpsDepositSuccessView />
        </Provider>,
      );

      expect(getByTestId('avatar-token-USD Coin')).toBeTruthy();
      expect(getByTestId('badge-network-Arbitrum')).toBeTruthy();
    });

    it('should handle non-USDC tokens', () => {
      mockRoute = {
        params: {
          amount: '1',
          selectedToken: 'ETH',
          txHash: '0xabc',
          processingTime: 30,
        },
      };

      const store = mockStore(mockInitialState);
      const { getAllByText } = render(
        <Provider store={store}>
          <PerpsDepositSuccessView />
        </Provider>,
      );

      // There are multiple instances of "1 ETH" in the component
      const ethTextElements = getAllByText('1 ETH');
      expect(ethTextElements.length).toBeGreaterThan(0);
    });
  });

  describe('edge cases', () => {
    it('should handle missing route params', () => {
      mockRoute = {
        params: undefined as unknown as {
          amount: string;
          selectedToken: string;
          txHash?: string;
          processingTime?: number;
        },
      };

      const store = mockStore(mockInitialState);
      const { queryByText } = render(
        <Provider store={store}>
          <PerpsDepositSuccessView />
        </Provider>,
      );

      // Should still render without crashing
      expect(queryByText('perps.deposit.success.title')).toBeTruthy();
    });

    it('should handle empty token list', () => {
      const emptyTokenListState = {
        ...mockInitialState,
        engine: {
          backgroundState: {
            ...mockInitialState.engine.backgroundState,
            TokenListController: {
              tokenList: {},
            },
          },
        },
      };

      const store = mockStore(emptyTokenListState);
      const { getAllByText } = render(
        <Provider store={store}>
          <PerpsDepositSuccessView />
        </Provider>,
      );

      // Should still display amount without enhanced token
      // There are multiple instances of "100 USDC" in the component
      const usdcTextElements = getAllByText('100 USDC');
      expect(usdcTextElements.length).toBeGreaterThan(0);
    });
  });
});
