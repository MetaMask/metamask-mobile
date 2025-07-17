import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';
import PerpsDepositProcessingView from './PerpsDepositProcessingView';
import { backgroundState } from '../../../../util/test/initial-root-state';
import Routes from '../../../../constants/navigation/Routes';
import { ARBITRUM_MAINNET_CHAIN_ID } from '../constants/hyperLiquidConfig';
import type { DepositStatus, DepositFlowType } from '../controllers/types';

// Mock react-native-device-info
jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn(() => '7.50.1'),
}));

// Mock navigation
interface MockRouteParams {
  amount: string;
  selectedToken: string;
  isDirectDeposit: boolean;
}

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockRoute = {
  params: {
    amount: '100',
    selectedToken: 'USDC',
    isDirectDeposit: true,
  } as MockRouteParams | undefined,
};

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: jest.fn(() => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  })),
  useRoute: jest.fn(() => mockRoute),
}));

// Mock i18n
jest.mock('../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string, params?: Record<string, unknown>) => {
    if (params) {
      return `${key} ${JSON.stringify(params)}`;
    }
    return key;
  }),
}));

// Mock hooks
let mockUsePerpsDeposit = {
  status: 'depositing' as DepositStatus,
  error: null as string | null,
  currentTxHash: null as string | null,
};

jest.mock('../hooks', () => ({
  usePerpsDeposit: jest.fn(),
}));

// Import the mocked module to set implementation
import { usePerpsDeposit } from '../hooks';
const mockedUsePerpsDeposit = usePerpsDeposit as jest.MockedFunction<typeof usePerpsDeposit>;

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
      <TouchableOpacity testID={testID || 'button'} onPress={onPress} disabled={disabled}>
        <Text>{label}</Text>
      </TouchableOpacity>
    ),
    ButtonSize: { Lg: 'lg' },
    ButtonVariants: { Primary: 'primary', Secondary: 'secondary' },
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
    },
    TextColor: { Default: 'default', Muted: 'muted' },
  };
});

jest.mock('../../../../component-library/components/Icons/Icon', () => ({
  IconName: {
    Close: 'close',
    Confirmation: 'confirmation',
    Warning: 'warning',
  },
  IconColor: {
    Default: 'default',
    Inverse: 'inverse',
  },
}));

jest.mock('../../../../component-library/components/Avatars/Avatar', () => ({
  AvatarSize: { Md: 'md' },
}));

jest.mock('../../../../component-library/components/Avatars/Avatar/variants/AvatarToken', () => {
  const View = jest.requireActual('react-native').View;

  return {
    __esModule: true,
    default: ({ name }: MockAvatarTokenProps) => <View testID={`avatar-token-${name}`} />,
  };
});

jest.mock('../../../../component-library/components/Badges/Badge/variants/BadgeNetwork', () => {
  const View = jest.requireActual('react-native').View;

  return {
    __esModule: true,
    default: ({ name }: MockBadgeNetworkProps) => <View testID={`badge-network-${name}`} />,
  };
});

jest.mock('../../../../component-library/components/Badges/BadgeWrapper', () => {
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
});

const mockStore = configureMockStore();

describe('PerpsDepositProcessingView', () => {
  beforeEach(() => {
    // Reset mocks before each test
    mockUsePerpsDeposit = {
      status: 'depositing' as DepositStatus,
      flowType: 'direct' as DepositFlowType,
      steps: {
        currentStep: 1,
        totalSteps: 1,
        stepNames: ['Depositing USDC to HyperLiquid'],
        stepTxHashes: [],
      },
      error: null as string | null,
      currentTxHash: null as string | null,
      requiresModalDismissal: false,
    };
    mockRoute.params = {
      amount: '100',
      selectedToken: 'USDC',
      isDirectDeposit: true,
    };
    mockNavigate.mockClear();
    mockGoBack.mockClear();

    // Set the mock implementation
    mockedUsePerpsDeposit.mockImplementation(() => mockUsePerpsDeposit);
  });
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
        TokenListController: {
          tokenList: {},
        },
        PreferencesController: {
          ipfsGateway: 'https://cloudflare-ipfs.com/ipfs/',
        },
      },
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
          <PerpsDepositProcessingView />
        </Provider>
      );

      expect(getByTestId('header-title')).toBeTruthy();
      expect(getByTestId('close-button')).toBeTruthy();
      expect(getByTestId('status-title')).toBeTruthy();
      expect(getByTestId('status-description')).toBeTruthy();
    });
  });

  describe('deposit status display', () => {
    it('should show preparing status', () => {
      mockUsePerpsDeposit = {
        ...mockUsePerpsDeposit,
        status: 'preparing',
      };

      const store = mockStore(mockInitialState);
      const { getByTestId, getByText } = render(
        <Provider store={store}>
          <PerpsDepositProcessingView />
        </Provider>
      );

      expect(getByTestId('processing-animation')).toBeTruthy();
      expect(getByText('perps.deposit.steps.preparing')).toBeTruthy();
    });

    it('should show swapping status', () => {
      mockUsePerpsDeposit = {
        ...mockUsePerpsDeposit,
        status: 'swapping',
      };

      const store = mockStore(mockInitialState);
      const { getByTestId, getByText } = render(
        <Provider store={store}>
          <PerpsDepositProcessingView />
        </Provider>
      );

      expect(getByTestId('processing-animation')).toBeTruthy();
      expect(getByText('perps.deposit.steps.swapping {"token":"USDC"}')).toBeTruthy();
    });

    it('should show bridging status', () => {
      mockUsePerpsDeposit = {
        ...mockUsePerpsDeposit,
        status: 'bridging',
      };

      const store = mockStore(mockInitialState);
      const { getByTestId, getByText } = render(
        <Provider store={store}>
          <PerpsDepositProcessingView />
        </Provider>
      );

      expect(getByTestId('processing-animation')).toBeTruthy();
      expect(getByText('perps.deposit.steps.bridging')).toBeTruthy();
    });

    it('should show depositing status', () => {
      mockUsePerpsDeposit = {
        ...mockUsePerpsDeposit,
        status: 'depositing',
      };

      const store = mockStore(mockInitialState);
      const { getByTestId, getByText } = render(
        <Provider store={store}>
          <PerpsDepositProcessingView />
        </Provider>
      );

      expect(getByTestId('processing-animation')).toBeTruthy();
      expect(getByText('perps.deposit.steps.depositing')).toBeTruthy();
    });

    it('should show success status', () => {
      mockUsePerpsDeposit = {
        ...mockUsePerpsDeposit,
        status: 'success',
      };

      const store = mockStore(mockInitialState);
      const { getByTestId, getByText } = render(
        <Provider store={store}>
          <PerpsDepositProcessingView />
        </Provider>
      );

      expect(getByTestId('success-checkmark')).toBeTruthy();
      expect(getByText('perps.deposit.depositCompleted')).toBeTruthy();
      expect(getByTestId('view-balance-button')).toBeTruthy();
    });

    it('should show error status', () => {
      mockUsePerpsDeposit = {
        ...mockUsePerpsDeposit,
        status: 'error',
        error: 'Network error occurred' as string | null,
      };

      const store = mockStore(mockInitialState);
      const { getByTestId, getByText } = render(
        <Provider store={store}>
          <PerpsDepositProcessingView />
        </Provider>
      );

      expect(getByTestId('processing-icon')).toBeTruthy();
      expect(getByText('perps.deposit.depositFailed')).toBeTruthy();
      expect(getByText('Network error occurred')).toBeTruthy();
      expect(getByTestId('retry-button')).toBeTruthy();
      expect(getByTestId('go-back-button')).toBeTruthy();
    });
  });

  describe('navigation', () => {
    it('should navigate to success screen after success', async () => {
      mockUsePerpsDeposit = {
        ...mockUsePerpsDeposit,
        status: 'success',
        currentTxHash: '0x123456' as string | null,
      };

      const store = mockStore(mockInitialState);
      render(
        <Provider store={store}>
          <PerpsDepositProcessingView />
        </Provider>
      );

      await waitFor(
        () => {
          expect(mockNavigate).toHaveBeenCalledWith(
            Routes.PERPS.DEPOSIT_SUCCESS,
            {
              amount: '100',
              selectedToken: 'USDC',
              txHash: '0x123456',
            }
          );
        },
        { timeout: 3000 }
      );
    });

    it('should handle close button press', () => {
      const store = mockStore(mockInitialState);
      const { getByTestId } = render(
        <Provider store={store}>
          <PerpsDepositProcessingView />
        </Provider>
      );

      const closeButton = getByTestId('close-button');
      closeButton.props.onPress();

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.TRADING_VIEW);
    });

    it('should handle retry button press', () => {
      mockUsePerpsDeposit = {
        ...mockUsePerpsDeposit,
        status: 'error',
      };

      const store = mockStore(mockInitialState);
      const { getByTestId } = render(
        <Provider store={store}>
          <PerpsDepositProcessingView />
        </Provider>
      );

      const retryButton = getByTestId('retry-button');
      retryButton.props.onPress();

      expect(mockGoBack).toHaveBeenCalled();
    });

    it('should handle view balance button press', () => {
      mockUsePerpsDeposit = {
        ...mockUsePerpsDeposit,
        status: 'success',
      };

      const store = mockStore(mockInitialState);
      const { getByTestId } = render(
        <Provider store={store}>
          <PerpsDepositProcessingView />
        </Provider>
      );

      const viewBalanceButton = getByTestId('view-balance-button');
      viewBalanceButton.props.onPress();

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.TRADING_VIEW);
    });
  });

  describe('token display', () => {
    it('should display token information', () => {
      const store = mockStore(mockInitialState);
      const { getByTestId, getByText } = render(
        <Provider store={store}>
          <PerpsDepositProcessingView />
        </Provider>
      );

      expect(getByTestId('avatar-token-USD Coin')).toBeTruthy();
      expect(getByText('100 USDC')).toBeTruthy();
    });

    it('should handle missing route params', () => {
      // Update the mock route params
      mockRoute.params = undefined;

      const store = mockStore(mockInitialState);
      const { queryByTestId } = render(
        <Provider store={store}>
          <PerpsDepositProcessingView />
        </Provider>
      );

      // Should still render without crashing
      expect(queryByTestId('header-title')).toBeTruthy();
    });
  });

  describe('direct deposit vs complex routes', () => {
    it('should show direct deposit message when isDirectDeposit is true', () => {
      const store = mockStore(mockInitialState);
      const { getByText } = render(
        <Provider store={store}>
          <PerpsDepositProcessingView />
        </Provider>
      );

      expect(getByText('perps.deposit.steps.depositingDirect')).toBeTruthy();
    });

    it('should show complex route message when isDirectDeposit is false', () => {
      // Update the mock route params
      mockRoute.params = {
        amount: '100',
        selectedToken: 'ETH',
        isDirectDeposit: false,
      };

      const store = mockStore(mockInitialState);
      const { getByText } = render(
        <Provider store={store}>
          <PerpsDepositProcessingView />
        </Provider>
      );

      expect(getByText('perps.deposit.stepDescriptions.depositing')).toBeTruthy();
    });
  });
});
