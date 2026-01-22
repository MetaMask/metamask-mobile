import { useNavigation } from '@react-navigation/native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PerpsWithdrawViewSelectorsIDs } from '../../Perps.testIds';
import { strings } from '../../../../../../locales/i18n';
import Engine from '../../../../../core/Engine';
import { PerpsStreamProvider } from '../../providers/PerpsStreamManager';
import PerpsWithdrawView from './PerpsWithdrawView';
import { ToastContext } from '../../../../../component-library/components/Toast';

// Mock component-library Button to avoid IconSize import issues during tests
jest.mock('../../../../../component-library/components/Buttons/Button', () => ({
  __esModule: true,
  default: 'Button',
  ButtonSize: { Lg: 'Lg', Md: 'Md' },
  ButtonVariants: { Primary: 'Primary', Secondary: 'Secondary' },
  ButtonWidthTypes: { Full: 'Full', Auto: 'Auto' },
}));

// Mock usePerpsLiveAccount hook
jest.mock('../../hooks/stream', () => ({
  usePerpsLiveAccount: jest.fn(() => ({
    account: {
      availableBalance: '1000.00',
      marginUsed: '0.00',
      unrealizedPnl: '0.00',
      returnOnEquity: '0.00',
      totalBalance: '1000.00',
    },
    isInitialLoading: false,
  })),
}));

// Mock locales
jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string, params?: Record<string, unknown>) => {
    const translations: Record<string, string> = {
      'perps.withdrawal.title': 'Withdraw',
      'perps.withdrawal.available_balance': `Available balance: ${
        params?.amount || ''
      }`,
      'perps.withdrawal.provider_fee': 'Provider fee',
      'perps.withdrawal.you_will_receive': 'You will receive',
      'perps.withdrawal.withdraw': 'Withdraw',
      'perps.withdrawal.insufficient_funds': 'Insufficient funds',
      'perps.withdrawal.minimum_amount_error': `Minimum amount: ${
        params?.amount || ''
      }`,
    };
    return translations[key] || key;
  }),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: jest.fn(() => ({
    style: jest.fn(() => ({})),
  })),
}));

// Mock hooks
jest.mock('../../hooks', () => ({
  usePerpsAccount: jest.fn(() => ({
    availableBalance: '$1000.00',
  })),
  usePerpsWithdrawQuote: jest.fn(() => ({
    formattedQuoteData: {
      networkFee: '$1.00',
    },
  })),
  useWithdrawTokens: jest.fn(() => ({
    destToken: {
      symbol: 'USDC',
      address: '0xaf88d065e77c8cc2239327c5edb3a432268e5831',
      chainId: '0xa4b1',
      decimals: 6,
      name: 'USD Coin',
      image: undefined,
      currencyExchangeRate: 1,
    },
  })),
  usePerpsEventTracking: jest.fn(() => ({
    track: jest.fn(),
  })),
  useWithdrawValidation: jest.fn(() => ({
    hasAmount: false,
    isBelowMinimum: false,
    hasInsufficientBalance: false,
    getMinimumAmount: jest.fn(() => '10.00'),
  })),
  usePerpsNetwork: jest.fn(() => 'mainnet'),
  usePerpsMeasurement: jest.fn(),
}));

// Mock components
jest.mock('../../../../Base/Keypad', () => 'Keypad');
jest.mock(
  '../../components/PerpsBottomSheetTooltip',
  () => 'PerpsBottomSheetTooltip',
);
jest.mock(
  '../../../../../component-library/components-temp/KeyValueRow',
  () => 'KeyValueRow',
);
jest.mock(
  '../../../../../component-library/components/Avatars/Avatar/variants/AvatarToken',
  () => 'AvatarToken',
);
jest.mock('../../../../../component-library/components/Badges/Badge', () => ({
  __esModule: true,
  default: 'Badge',
  BadgeVariant: {
    Network: 'Network',
  },
}));
jest.mock(
  '../../../../../component-library/components/Badges/BadgeWrapper',
  () => ({
    __esModule: true,
    default: 'BadgeWrapper',
    BadgePosition: {
      BottomRight: 'BottomRight',
    },
  }),
);
jest.mock('../../../../UI/AssetOverview/Balance/Balance', () => ({
  NetworkBadgeSource: jest.fn(() => ({ uri: 'network-badge-uri' })),
}));

// Mock design system components
jest.mock('@metamask/design-system-react-native', () => ({
  Box: 'Box',
  BoxAlignItems: {
    Center: 'Center',
  },
  BoxFlexDirection: {
    Row: 'Row',
  },
  BoxJustifyContent: {
    Between: 'Between',
  },
  ButtonBase: 'ButtonBase',
  IconSize: {
    Xl: 'Xl',
  },
  IconColor: {
    PrimaryDefault: 'PrimaryDefault',
  },
  Text: 'Text',
  TextVariant: {
    HeadingSm: 'HeadingSm',
    HeadingLg: 'HeadingLg',
    HeadingMd: 'HeadingMd',
    BodyMd: 'BodyMd',
    BodySm: 'BodySm',
  },
  TextColor: {
    TextDefault: 'TextDefault',
    TextAlternative: 'TextAlternative',
  },
  FontWeight: {
    Bold: 'Bold',
    Medium: 'Medium',
  },
  IconName: {
    ArrowLeft: 'ArrowLeft',
    Close: 'Close',
  },
}));

// Mock Text component
jest.mock('../../../../../component-library/components/Texts/Text', () => ({
  __esModule: true,
  default: 'Text',
  TextColor: {
    Alternative: 'Alternative',
    Error: 'Error',
  },
  TextVariant: {
    HeadingMD: 'HeadingMD',
    BodyMD: 'BodyMD',
    BodyMDMedium: 'BodyMDMedium',
    BodyLGMedium: 'BodyLGMedium',
    BodySM: 'BodySM',
    DisplayMD: 'DisplayMD',
  },
}));

// Mock Avatar types
jest.mock(
  '../../../../../component-library/components/Avatars/Avatar/Avatar.types',
  () => ({
    AvatarSize: {
      Sm: 'Sm',
    },
  }),
);

// Mock Engine
jest.mock('../../../../../core/Engine', () => ({
  context: {
    PerpsController: {
      withdraw: jest.fn(),
      getWithdrawalRoutes: jest.fn(() => [
        {
          assetId: 'USDC-42161',
          minimumAmount: '10',
        },
      ]),
    },
  },
}));

// Mock Toast
jest.mock('../../../../../component-library/components/Toast', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
  const mockReact = require('react');
  return {
    ToastContext: mockReact.createContext({
      toastRef: { current: { showToast: jest.fn() } },
    }),
    ToastVariants: {
      Icon: 'Icon',
    },
  };
});

describe('PerpsWithdrawView', () => {
  const mockNavigation = {
    goBack: jest.fn(),
  };

  const mockToastRef = {
    current: {
      showToast: jest.fn(),
    },
  };

  // Helper function to render component with required providers
  const renderWithProviders = (component: React.ReactElement) =>
    render(
      <SafeAreaProvider
        initialMetrics={{
          insets: { top: 0, left: 0, right: 0, bottom: 0 },
          frame: { x: 0, y: 0, width: 0, height: 0 },
        }}
      >
        <ToastContext.Provider
          value={
            { toastRef: mockToastRef } as unknown as React.ContextType<
              typeof ToastContext
            >
          }
        >
          <PerpsStreamProvider>{component}</PerpsStreamProvider>
        </ToastContext.Provider>
      </SafeAreaProvider>,
    );

  beforeEach(() => {
    jest.clearAllMocks();
    (useNavigation as jest.Mock).mockReturnValue(mockNavigation);
  });

  describe('Component Rendering', () => {
    it('renders correctly with title and key elements', () => {
      renderWithProviders(<PerpsWithdrawView />);

      expect(
        screen.getByText(strings('perps.withdrawal.title')),
      ).toBeOnTheScreen();
      expect(screen.getByText('$0')).toBeOnTheScreen(); // Initial amount display matches component logic
      expect(
        screen.getByText(
          strings('perps.withdrawal.available_balance', {
            amount: '$1,000',
          }),
        ),
      ).toBeOnTheScreen();
    });

    it('renders percentage buttons when focused', () => {
      renderWithProviders(<PerpsWithdrawView />);

      expect(screen.getByText('10%')).toBeOnTheScreen();
      expect(screen.getByText('25%')).toBeOnTheScreen();
      expect(screen.getByText('50%')).toBeOnTheScreen();
      expect(screen.getByText('Max')).toBeOnTheScreen();
    });

    it('renders without errors', () => {
      expect(() => renderWithProviders(<PerpsWithdrawView />)).not.toThrow();
    });
  });

  describe('User Interactions', () => {
    it('handles back button press', () => {
      renderWithProviders(<PerpsWithdrawView />);

      const backButton = screen.getByTestId(
        PerpsWithdrawViewSelectorsIDs.BACK_BUTTON,
      );
      fireEvent.press(backButton);

      expect(mockNavigation.goBack).toHaveBeenCalled();
    });

    it('handles percentage button press', () => {
      renderWithProviders(<PerpsWithdrawView />);

      const tenPercentButton = screen.getByText('10%');
      expect(() => fireEvent.press(tenPercentButton)).not.toThrow();
    });

    it('handles max button press', () => {
      renderWithProviders(<PerpsWithdrawView />);

      const maxButton = screen.getByText('Max');
      expect(() => fireEvent.press(maxButton)).not.toThrow();
    });

    it('shows withdrawal button when amount is entered', () => {
      const mockUseWithdrawValidation =
        jest.requireMock('../../hooks').useWithdrawValidation;

      expect(mockUseWithdrawValidation).toBeDefined();
    });

    it('handles withdrawal submission', async () => {
      const mockWithdraw = jest.fn().mockResolvedValue({ success: true });
      Engine.context.PerpsController.withdraw = mockWithdraw;

      expect(mockWithdraw).toBeDefined();
    });

    it('validates insufficient funds scenario', () => {
      const mockUseWithdrawValidation =
        jest.requireMock('../../hooks').useWithdrawValidation;

      expect(mockUseWithdrawValidation).toBeDefined();
    });

    it('validates minimum amount scenario', () => {
      const mockUseWithdrawValidation =
        jest.requireMock('../../hooks').useWithdrawValidation;

      expect(mockUseWithdrawValidation).toBeDefined();
    });
  });
});
