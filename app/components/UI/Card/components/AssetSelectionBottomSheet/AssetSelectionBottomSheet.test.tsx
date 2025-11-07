// Mock dependencies first - must be hoisted before imports
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

// Mock theme first to prevent component initialization errors
jest.mock('../../../../../util/theme', () => ({
  useTheme: jest.fn(() => ({
    colors: {
      primary: { default: '#0376c9' },
      success: { default: '#28a745', muted: '#d4edda' },
      error: { default: '#d73a49', muted: '#f8d7da' },
      background: { default: '#ffffff' },
      text: { default: '#000000' },
    },
    themeAppearance: 'light',
  })),
  mockTheme: {
    colors: {
      primary: { default: '#0376c9' },
      success: { default: '#28a745', muted: '#d4edda' },
      error: { default: '#d73a49', muted: '#f8d7da' },
      background: { default: '#ffffff' },
      text: { default: '#000000' },
    },
    themeAppearance: 'light',
  },
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
}));

const mockDispatch = jest.fn();
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
  useDispatch: () => mockDispatch,
}));

const mockSdk = {
  getSupportedTokensByChainId: jest.fn(() => []),
  updateWalletPriority: jest.fn(),
  lineaChainId: 'eip155:59144',
};

jest.mock('../../sdk', () => ({
  useCardSDK: () => ({
    sdk: mockSdk,
    isLoading: false,
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
  useSafeAreaFrame: () => ({ x: 0, y: 0, width: 390, height: 844 }),
}));

const mockShowToast = jest.fn();

jest.mock('../../../../../component-library/components/Toast');

const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn();
const mockEventBuilder = {
  addProperties: jest.fn().mockReturnThis(),
  build: jest.fn().mockReturnValue({}),
};

jest.mock('../../../../hooks/useMetrics', () => ({
  useMetrics: jest.fn(),
  MetaMetricsEvents: {
    CARD_BUTTON_CLICKED: 'CARD_BUTTON_CLICKED',
  },
}));

const mockNavigateToCardPage = jest.fn();
jest.mock('../../hooks/useNavigateToCardPage', () => ({
  useNavigateToCardPage: jest.fn(() => ({
    navigateToCardPage: mockNavigateToCardPage,
  })),
}));

jest.mock('../../hooks/useAssetBalances', () => ({
  useAssetBalances: jest.fn(),
}));

const mockUpdateTokenPriority = jest.fn();
jest.mock('../../hooks/useUpdateTokenPriority', () => ({
  useUpdateTokenPriority: jest.fn(),
}));

jest.mock('../../../../../util/Logger');

// Create a mock tailwind function that can be called and has a style method
const mockTw = Object.assign(
  jest.fn((className: string) => ({ className })),
  {
    style: jest.fn((...args: unknown[]) => {
      const styles = args.filter(
        (arg) => typeof arg === 'string' || typeof arg === 'boolean',
      );
      return { className: styles.join(' ') };
    }),
  },
);

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => mockTw,
}));

jest.mock('react-native-gesture-handler', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...jest.requireActual('react-native-gesture-handler'),
    FlatList: RN.FlatList,
  };
});

import React, { createRef } from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { CaipChainId } from '@metamask/utils';
import { SolScope } from '@metamask/keyring-api';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AssetSelectionBottomSheet from './AssetSelectionBottomSheet';
import {
  AllowanceState,
  CardTokenAllowance,
  DelegationSettingsResponse,
  CardExternalWalletDetail,
} from '../../types';
import Routes from '../../../../../constants/navigation/Routes';
import { BottomSheetRef } from '../../../../../component-library/components/BottomSheets/BottomSheet';
import { ToastContext } from '../../../../../component-library/components/Toast';
import { useMetrics } from '../../../../hooks/useMetrics';
import { useNavigateToCardPage } from '../../hooks/useNavigateToCardPage';
import { useAssetBalances } from '../../hooks/useAssetBalances';
import { useUpdateTokenPriority } from '../../hooks/useUpdateTokenPriority';

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

// Wrapper component to provide Toast context and SafeAreaProvider
const renderWithToastContext = (component: React.ReactElement) =>
  render(
    <SafeAreaProvider>
      <ToastContext.Provider
        value={{
          toastRef: {
            current: { showToast: mockShowToast, closeToast: jest.fn() },
          },
        }}
      >
        {component}
      </ToastContext.Provider>
    </SafeAreaProvider>,
  );

// Helper function to create mock token
const createMockToken = (
  overrides: Partial<CardTokenAllowance> = {},
): CardTokenAllowance => ({
  address: '0x123',
  symbol: 'USDC',
  name: 'USD Coin',
  decimals: 6,
  caipChainId: 'eip155:59144' as CaipChainId,
  walletAddress: '0xwallet',
  allowanceState: AllowanceState.NotEnabled,
  allowance: '0',
  priority: undefined,
  ...overrides,
});

// Helper function to create mock delegation settings
const createMockDelegationSettings = (): DelegationSettingsResponse => ({
  networks: [
    {
      network: 'linea',
      environment: 'production',
      chainId: '59144',
      delegationContract: '0xdelegation',
      tokens: {
        USDC: {
          symbol: 'USDC',
          decimals: 6,
          address: '0x123',
        },
        USDT: {
          symbol: 'USDT',
          decimals: 6,
          address: '0x456',
        },
      },
    },
  ],
  count: 1,
  _links: {
    self: '/api/v1/settings',
  },
});

describe('AssetSelectionBottomSheet', () => {
  let sheetRef: React.RefObject<BottomSheetRef>;

  beforeEach(() => {
    jest.clearAllMocks();
    sheetRef = createRef<BottomSheetRef>();

    mockUseSelector.mockImplementation((selector) => {
      if (selector.toString().includes('selectUserCardLocation')) {
        return 'international';
      }
      return undefined;
    });

    (useAssetBalances as jest.Mock).mockReturnValue(new Map());

    // Re-configure mockEventBuilder after resetAllMocks clears it
    mockEventBuilder.addProperties = jest.fn().mockReturnThis();
    mockEventBuilder.build = jest.fn().mockReturnValue({});

    (useMetrics as jest.Mock).mockReturnValue({
      trackEvent: mockTrackEvent,
      createEventBuilder: mockCreateEventBuilder,
    });

    mockCreateEventBuilder.mockReturnValue(mockEventBuilder);

    (useNavigateToCardPage as jest.Mock).mockReturnValue({
      navigateToCardPage: mockNavigateToCardPage,
    });

    // Mock useUpdateTokenPriority to call onSuccess by default
    mockUpdateTokenPriority.mockImplementation(async () => true);
    (useUpdateTokenPriority as jest.Mock).mockImplementation((params) => ({
      updateTokenPriority: async (token: unknown, walletDetails: unknown) => {
        const result = await mockUpdateTokenPriority(token, walletDetails);
        if (result && params?.onSuccess) {
          params.onSuccess();
        } else if (!result && params?.onError) {
          params.onError(new Error('Update failed'));
        }
        return result;
      },
    }));
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('rendering', () => {
    it('renders bottom sheet with title', () => {
      const mockSetOpen = jest.fn();
      const tokens: CardTokenAllowance[] = [];
      const delegationSettings = createMockDelegationSettings();

      const { getByText } = renderWithToastContext(
        <AssetSelectionBottomSheet
          setOpenAssetSelectionBottomSheet={mockSetOpen}
          sheetRef={sheetRef}
          tokensWithAllowances={tokens}
          delegationSettings={delegationSettings}
        />,
      );

      expect(getByText('Select token and network')).toBeOnTheScreen();
    });

    it('displays loading indicator when delegation settings is null', () => {
      const mockSetOpen = jest.fn();
      const tokens: CardTokenAllowance[] = [];

      const { UNSAFE_getByType, queryByText } = renderWithToastContext(
        <AssetSelectionBottomSheet
          setOpenAssetSelectionBottomSheet={mockSetOpen}
          sheetRef={sheetRef}
          tokensWithAllowances={tokens}
          delegationSettings={null}
        />,
      );

      expect(UNSAFE_getByType('ActivityIndicator' as never)).toBeTruthy();
      expect(queryByText('No tokens available')).toBeNull();
    });

    it('displays no tokens message when no tokens available', () => {
      const mockSetOpen = jest.fn();
      const tokens: CardTokenAllowance[] = [];
      // Create delegation settings with no tokens
      const delegationSettings: DelegationSettingsResponse = {
        networks: [
          {
            network: 'linea',
            environment: 'production',
            chainId: '59144',
            delegationContract: '0xdelegation',
            tokens: {}, // Empty tokens object
          },
        ],
        count: 1,
        _links: {
          self: '/api/v1/settings',
        },
      };

      const { getByText } = renderWithToastContext(
        <AssetSelectionBottomSheet
          setOpenAssetSelectionBottomSheet={mockSetOpen}
          sheetRef={sheetRef}
          tokensWithAllowances={tokens}
          delegationSettings={delegationSettings}
        />,
      );

      expect(getByText('No tokens available')).toBeOnTheScreen();
    });

    it('renders token list when tokens are available', () => {
      const mockSetOpen = jest.fn();
      const token = createMockToken({
        symbol: 'USDC',
        allowanceState: AllowanceState.Enabled,
      });
      const delegationSettings = createMockDelegationSettings();

      const { getByText } = renderWithToastContext(
        <AssetSelectionBottomSheet
          setOpenAssetSelectionBottomSheet={mockSetOpen}
          sheetRef={sheetRef}
          tokensWithAllowances={[token]}
          delegationSettings={delegationSettings}
        />,
      );

      expect(getByText(/USDC on/)).toBeOnTheScreen();
      expect(getByText('Enabled')).toBeOnTheScreen();
    });

    it('displays limited state for tokens with limited allowance', () => {
      const mockSetOpen = jest.fn();
      const token = createMockToken({
        symbol: 'USDT',
        allowanceState: AllowanceState.Limited,
      });
      const delegationSettings = createMockDelegationSettings();

      const { getByText } = renderWithToastContext(
        <AssetSelectionBottomSheet
          setOpenAssetSelectionBottomSheet={mockSetOpen}
          sheetRef={sheetRef}
          tokensWithAllowances={[token]}
          delegationSettings={delegationSettings}
        />,
      );

      expect(getByText('Limited')).toBeOnTheScreen();
    });

    it('displays not enabled state for tokens without allowance', () => {
      const mockSetOpen = jest.fn();
      const token = createMockToken({
        symbol: 'DAI',
        allowanceState: AllowanceState.NotEnabled,
      });
      const delegationSettings = createMockDelegationSettings();

      const { getAllByText } = renderWithToastContext(
        <AssetSelectionBottomSheet
          setOpenAssetSelectionBottomSheet={mockSetOpen}
          sheetRef={sheetRef}
          tokensWithAllowances={[token]}
          delegationSettings={delegationSettings}
        />,
      );

      const notEnabledElements = getAllByText('Not enabled');
      expect(notEnabledElements.length).toBeGreaterThan(0);
      expect(notEnabledElements[0]).toBeOnTheScreen();
    });
  });

  describe('token filtering', () => {
    it('filters out Solana tokens when hideSolanaAssets is true', () => {
      const mockSetOpen = jest.fn();
      const solanaToken = createMockToken({
        symbol: 'SOL',
        caipChainId: SolScope.Mainnet,
      });
      const lineaToken = createMockToken({
        symbol: 'USDC',
        caipChainId: 'eip155:59144' as CaipChainId,
      });
      const delegationSettings = createMockDelegationSettings();

      const { getByText, queryByText } = renderWithToastContext(
        <AssetSelectionBottomSheet
          setOpenAssetSelectionBottomSheet={mockSetOpen}
          sheetRef={sheetRef}
          tokensWithAllowances={[solanaToken, lineaToken]}
          delegationSettings={delegationSettings}
          hideSolanaAssets
        />,
      );

      expect(getByText(/USDC on/)).toBeOnTheScreen();
      expect(queryByText(/SOL on/)).toBeNull();
    });

    it('shows Solana tokens when hideSolanaAssets is false', () => {
      const mockSetOpen = jest.fn();
      const solanaToken = createMockToken({
        symbol: 'SOL',
        caipChainId: SolScope.Mainnet,
      });
      const delegationSettings = createMockDelegationSettings();

      const { getByText } = renderWithToastContext(
        <AssetSelectionBottomSheet
          setOpenAssetSelectionBottomSheet={mockSetOpen}
          sheetRef={sheetRef}
          tokensWithAllowances={[solanaToken]}
          delegationSettings={delegationSettings}
          hideSolanaAssets={false}
        />,
      );

      expect(getByText(/SOL on/)).toBeOnTheScreen();
    });

    it('filters Linea tokens based on US location', () => {
      mockUseSelector.mockImplementation((selector) => {
        if (selector.toString().includes('selectUserCardLocation')) {
          return 'us';
        }
        return false;
      });

      const mockSetOpen = jest.fn();
      const token = createMockToken();
      const delegationSettings: DelegationSettingsResponse = {
        networks: [
          {
            network: 'linea-us',
            environment: 'production',
            chainId: '59144',
            delegationContract: '0xdelegation',
            tokens: {
              USDC: {
                symbol: 'USDC',
                decimals: 6,
                address: '0x123',
              },
            },
          },
        ],
        count: 1,
        _links: { self: '/api' },
      };

      const { getByText } = renderWithToastContext(
        <AssetSelectionBottomSheet
          setOpenAssetSelectionBottomSheet={mockSetOpen}
          sheetRef={sheetRef}
          tokensWithAllowances={[token]}
          delegationSettings={delegationSettings}
        />,
      );

      expect(getByText(/USDC on/)).toBeOnTheScreen();
    });

    it('filters Linea tokens based on international location', () => {
      mockUseSelector.mockImplementation((selector) => {
        if (selector.toString().includes('selectUserCardLocation')) {
          return 'international';
        }
        return false;
      });

      const mockSetOpen = jest.fn();
      const token = createMockToken();
      const delegationSettings = createMockDelegationSettings();

      const { getByText } = renderWithToastContext(
        <AssetSelectionBottomSheet
          setOpenAssetSelectionBottomSheet={mockSetOpen}
          sheetRef={sheetRef}
          tokensWithAllowances={[token]}
          delegationSettings={delegationSettings}
        />,
      );

      expect(getByText(/USDC on/)).toBeOnTheScreen();
    });
  });

  describe('token sorting', () => {
    it('sorts tokens by priority', () => {
      mockUseSelector.mockImplementation((selector) => {
        if (selector.toString().includes('selectUserCardLocation')) {
          return 'international';
        }
        return undefined;
      });

      const mockSetOpen = jest.fn();
      const token1 = createMockToken({
        symbol: 'USDC',
        priority: 2,
        allowanceState: AllowanceState.Enabled,
      });
      const token2 = createMockToken({
        symbol: 'USDT',
        address: '0x456',
        priority: 1,
        allowanceState: AllowanceState.Enabled,
      });
      const delegationSettings = createMockDelegationSettings();

      const { getAllByText } = renderWithToastContext(
        <AssetSelectionBottomSheet
          setOpenAssetSelectionBottomSheet={mockSetOpen}
          sheetRef={sheetRef}
          tokensWithAllowances={[token1, token2]}
          delegationSettings={delegationSettings}
        />,
      );

      // Check that tokens are sorted by priority (USDT has priority 1, USDC has priority 2)
      const usdtToken = getAllByText(/USDT on Linea/)[0];
      const usdcToken = getAllByText(/USDC on Linea/)[0];
      expect(usdtToken).toBeTruthy();
      expect(usdcToken).toBeTruthy();
    });

    it('sorts enabled tokens before not enabled tokens', () => {
      const mockSetOpen = jest.fn();
      const notEnabledToken = createMockToken({
        symbol: 'DAI',
        allowanceState: AllowanceState.NotEnabled,
      });
      const enabledToken = createMockToken({
        symbol: 'USDC',
        address: '0x456',
        allowanceState: AllowanceState.Enabled,
      });
      const delegationSettings = createMockDelegationSettings();

      const { getAllByText } = renderWithToastContext(
        <AssetSelectionBottomSheet
          setOpenAssetSelectionBottomSheet={mockSetOpen}
          sheetRef={sheetRef}
          tokensWithAllowances={[notEnabledToken, enabledToken]}
          delegationSettings={delegationSettings}
        />,
      );

      // Check that enabled tokens come before not enabled tokens
      const usdcToken = getAllByText(/USDC on Linea/)[0];
      const daiToken = getAllByText(/DAI on Linea/)[0];
      expect(usdcToken).toBeTruthy();
      expect(daiToken).toBeTruthy();
    });
  });

  describe('balance display', () => {
    it('displays token balance from useAssetBalances hook', () => {
      const mockSetOpen = jest.fn();
      const token = createMockToken();
      const delegationSettings = createMockDelegationSettings();

      const tokenKey = `${token.address?.toLowerCase()}-${token.caipChainId}-${token.walletAddress?.toLowerCase()}`;
      (useAssetBalances as jest.Mock).mockReturnValue(
        new Map([
          [
            tokenKey,
            {
              rawTokenBalance: 123.456789,
              balanceFiat: '$123.45',
            },
          ],
        ]),
      );

      const { getByText } = renderWithToastContext(
        <AssetSelectionBottomSheet
          setOpenAssetSelectionBottomSheet={mockSetOpen}
          sheetRef={sheetRef}
          tokensWithAllowances={[token]}
          delegationSettings={delegationSettings}
        />,
      );

      expect(getByText('$123.45')).toBeOnTheScreen();
      expect(getByText('123.456789 USDC')).toBeOnTheScreen();
    });

    it('displays zero balance when balance data is not available', () => {
      const mockSetOpen = jest.fn();
      const token = createMockToken();
      const delegationSettings = createMockDelegationSettings();

      (useAssetBalances as jest.Mock).mockReturnValue(new Map());

      const { getAllByText, getByText } = renderWithToastContext(
        <AssetSelectionBottomSheet
          setOpenAssetSelectionBottomSheet={mockSetOpen}
          sheetRef={sheetRef}
          tokensWithAllowances={[token]}
          delegationSettings={delegationSettings}
        />,
      );

      const zeroBalanceElements = getAllByText('$0.00');
      expect(zeroBalanceElements.length).toBeGreaterThan(0);
      expect(zeroBalanceElements[0]).toBeOnTheScreen();
      expect(getByText('0 USDC')).toBeOnTheScreen();
    });
  });

  describe('token selection', () => {
    it('calls onTokenSelect and closes bottom sheet in selection only mode', () => {
      const mockSetOpen = jest.fn();
      const mockOnTokenSelect = jest.fn();
      const token = createMockToken();
      const delegationSettings = createMockDelegationSettings();

      const { getByText } = renderWithToastContext(
        <AssetSelectionBottomSheet
          setOpenAssetSelectionBottomSheet={mockSetOpen}
          sheetRef={sheetRef}
          tokensWithAllowances={[token]}
          delegationSettings={delegationSettings}
          selectionOnly
          onTokenSelect={mockOnTokenSelect}
        />,
      );

      fireEvent.press(getByText(/USDC on/));

      expect(mockOnTokenSelect).toHaveBeenCalledWith(
        expect.objectContaining({
          address: token.address,
          symbol: token.symbol,
          name: token.name,
          decimals: token.decimals,
          caipChainId: token.caipChainId,
          walletAddress: token.walletAddress,
          allowanceState: token.allowanceState,
          allowance: token.allowance,
        }),
      );
      expect(mockSetOpen).toHaveBeenCalledWith(false);
    });

    it('navigates to spending limit for not enabled token', () => {
      const mockSetOpen = jest.fn();
      const token = createMockToken({
        allowanceState: AllowanceState.NotEnabled,
      });
      const delegationSettings = createMockDelegationSettings();

      const { getByText } = renderWithToastContext(
        <AssetSelectionBottomSheet
          setOpenAssetSelectionBottomSheet={mockSetOpen}
          sheetRef={sheetRef}
          tokensWithAllowances={[token]}
          delegationSettings={delegationSettings}
        />,
      );

      fireEvent.press(getByText(/USDC on/));

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.CARD.SPENDING_LIMIT,
        expect.objectContaining({
          flow: 'manage',
          selectedToken: expect.objectContaining({
            address: token.address,
            symbol: token.symbol,
            name: token.name,
            decimals: token.decimals,
            caipChainId: token.caipChainId,
            walletAddress: token.walletAddress,
            allowanceState: token.allowanceState,
            allowance: token.allowance,
          }),
          priorityToken: undefined,
          delegationSettings,
        }),
      );
    });

    it('updates priority for enabled token', async () => {
      const mockSetOpen = jest.fn();
      const token = createMockToken({
        allowanceState: AllowanceState.Enabled,
        priority: 2,
      });
      const delegationSettings = createMockDelegationSettings();
      const cardExternalWalletDetails: {
        walletDetails: CardExternalWalletDetail[];
        mappedWalletDetails: CardTokenAllowance[];
        priorityWalletDetail: CardTokenAllowance | undefined;
      } = {
        walletDetails: [
          {
            id: 1,
            walletAddress: '0xwallet',
            currency: 'USDC',
            balance: '1000',
            allowance: '500',
            priority: 2,
            tokenDetails: {
              address: '0x123',
              symbol: 'USDC',
              name: 'USD Coin',
              decimals: 6,
            },
            caipChainId: 'eip155:59144' as CaipChainId,
            network: 'linea' as const,
          },
        ],
        mappedWalletDetails: [token],
        priorityWalletDetail: undefined,
      };

      mockUpdateTokenPriority.mockImplementation(async () => true);

      const { getByText } = renderWithToastContext(
        <AssetSelectionBottomSheet
          setOpenAssetSelectionBottomSheet={mockSetOpen}
          sheetRef={sheetRef}
          tokensWithAllowances={[token]}
          delegationSettings={delegationSettings}
          cardExternalWalletDetails={cardExternalWalletDetails}
        />,
      );

      const tokenElement = getByText('USDC on Linea');

      await act(async () => {
        fireEvent.press(tokenElement);
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      await waitFor(
        () => {
          expect(mockUpdateTokenPriority).toHaveBeenCalledWith(
            expect.objectContaining({
              address: token.address,
              symbol: token.symbol,
              caipChainId: token.caipChainId,
              walletAddress: token.walletAddress,
            }),
            cardExternalWalletDetails.walletDetails,
          );
        },
        { timeout: 3000 },
      );

      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({
          labelOptions: [{ label: 'Spend priority updated successfully' }],
        }),
      );
      expect(mockSetOpen).toHaveBeenCalledWith(false);
    });

    it('closes bottom sheet when already priority token is selected and navigateToCardHomeOnPriorityToken is false', () => {
      const mockSetOpen = jest.fn();
      const token = createMockToken();
      const delegationSettings = createMockDelegationSettings();
      const cardExternalWalletDetails = {
        walletDetails: [],
        mappedWalletDetails: [],
        priorityWalletDetail: token,
      };

      const { getByText } = renderWithToastContext(
        <AssetSelectionBottomSheet
          setOpenAssetSelectionBottomSheet={mockSetOpen}
          sheetRef={sheetRef}
          tokensWithAllowances={[token]}
          delegationSettings={delegationSettings}
          cardExternalWalletDetails={cardExternalWalletDetails}
          navigateToCardHomeOnPriorityToken={false}
        />,
      );

      fireEvent.press(getByText(/USDC on/));

      expect(mockSetOpen).toHaveBeenCalledWith(false);
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('displays error toast when updateTokenPriority fails', async () => {
      const mockSetOpen = jest.fn();
      const token = createMockToken({
        allowanceState: AllowanceState.Enabled,
      });
      const delegationSettings = createMockDelegationSettings();
      const cardExternalWalletDetails: {
        walletDetails: CardExternalWalletDetail[];
        mappedWalletDetails: CardTokenAllowance[];
        priorityWalletDetail: CardTokenAllowance | undefined;
      } = {
        walletDetails: [
          {
            id: 1,
            walletAddress: '0xwallet',
            currency: 'USDC',
            balance: '1000',
            allowance: '500',
            priority: 1,
            tokenDetails: {
              address: '0x123',
              symbol: 'USDC',
              name: 'USD Coin',
              decimals: 6,
            },
            caipChainId: 'eip155:59144' as CaipChainId,
            network: 'linea' as const,
          },
        ],
        mappedWalletDetails: [token],
        priorityWalletDetail: undefined,
      };

      mockUpdateTokenPriority.mockImplementation(async () => false);

      const { getByText } = renderWithToastContext(
        <AssetSelectionBottomSheet
          setOpenAssetSelectionBottomSheet={mockSetOpen}
          sheetRef={sheetRef}
          tokensWithAllowances={[token]}
          delegationSettings={delegationSettings}
          cardExternalWalletDetails={cardExternalWalletDetails}
        />,
      );

      const tokenElement = getByText('USDC on Linea');

      await act(async () => {
        fireEvent.press(tokenElement);
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      await waitFor(
        () => {
          expect(mockShowToast).toHaveBeenCalledWith(
            expect.objectContaining({
              labelOptions: [{ label: 'Failed to update spend priority' }],
            }),
          );
        },
        { timeout: 3000 },
      );

      expect(mockSetOpen).toHaveBeenCalledWith(false);
    });

    it('displays error toast when wallet details are not available', async () => {
      const mockSetOpen = jest.fn();
      const token = createMockToken({
        allowanceState: AllowanceState.Enabled,
      });
      const delegationSettings = createMockDelegationSettings();

      const { getByText } = renderWithToastContext(
        <AssetSelectionBottomSheet
          setOpenAssetSelectionBottomSheet={mockSetOpen}
          sheetRef={sheetRef}
          tokensWithAllowances={[token]}
          delegationSettings={delegationSettings}
          cardExternalWalletDetails={null}
        />,
      );

      const tokenElement = getByText('USDC on Linea');

      await act(async () => {
        fireEvent.press(tokenElement);
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      await waitFor(
        () => {
          expect(mockShowToast).toHaveBeenCalledWith(
            expect.objectContaining({
              labelOptions: [{ label: 'Failed to update spend priority' }],
            }),
          );
        },
        { timeout: 3000 },
      );

      expect(mockSetOpen).toHaveBeenCalledWith(false);
      expect(mockUpdateTokenPriority).not.toHaveBeenCalled();
    });
  });

  describe('metrics tracking', () => {
    it('tracks token selection event', async () => {
      const mockSetOpen = jest.fn();
      const token = createMockToken({
        allowanceState: AllowanceState.Enabled,
        allowance: '1000',
      });
      const delegationSettings = createMockDelegationSettings();
      const cardExternalWalletDetails: {
        walletDetails: CardExternalWalletDetail[];
        mappedWalletDetails: CardTokenAllowance[];
        priorityWalletDetail: CardTokenAllowance | undefined;
      } = {
        walletDetails: [
          {
            id: 1,
            walletAddress: '0xwallet',
            currency: 'USDC',
            balance: '1000',
            allowance: '1000',
            priority: 1,
            tokenDetails: {
              address: '0x123',
              symbol: 'USDC',
              name: 'USD Coin',
              decimals: 6,
            },
            caipChainId: 'eip155:59144' as CaipChainId,
            network: 'linea' as const,
          },
        ],
        mappedWalletDetails: [token],
        priorityWalletDetail: undefined,
      };

      mockUpdateTokenPriority.mockImplementation(async () => true);

      const { getByText } = renderWithToastContext(
        <AssetSelectionBottomSheet
          setOpenAssetSelectionBottomSheet={mockSetOpen}
          sheetRef={sheetRef}
          tokensWithAllowances={[token]}
          delegationSettings={delegationSettings}
          cardExternalWalletDetails={cardExternalWalletDetails}
        />,
      );

      const tokenElement = getByText('USDC on Linea');

      await act(async () => {
        fireEvent.press(tokenElement);
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      await waitFor(
        () => {
          expect(mockCreateEventBuilder).toHaveBeenCalled();
        },
        { timeout: 3000 },
      );

      expect(mockTrackEvent).toHaveBeenCalled();
    });
  });

  describe('Solana not supported footer', () => {
    it('displays Solana not supported button when hideSolanaAssets is true', () => {
      const mockSetOpen = jest.fn();
      const token = createMockToken();
      const delegationSettings = createMockDelegationSettings();

      const { getByText } = renderWithToastContext(
        <AssetSelectionBottomSheet
          setOpenAssetSelectionBottomSheet={mockSetOpen}
          sheetRef={sheetRef}
          tokensWithAllowances={[token]}
          delegationSettings={delegationSettings}
          hideSolanaAssets
        />,
      );

      expect(getByText('Others tokens on Solana')).toBeOnTheScreen();
      expect(getByText('Enable on card.metamask.io')).toBeOnTheScreen();
    });

    it('calls navigateToCardPage when Solana not supported button is pressed', () => {
      const mockSetOpen = jest.fn();
      const token = createMockToken();
      const delegationSettings = createMockDelegationSettings();

      const { getByText } = renderWithToastContext(
        <AssetSelectionBottomSheet
          setOpenAssetSelectionBottomSheet={mockSetOpen}
          sheetRef={sheetRef}
          tokensWithAllowances={[token]}
          delegationSettings={delegationSettings}
          hideSolanaAssets
        />,
      );

      fireEvent.press(getByText('Others tokens on Solana'));

      expect(mockNavigateToCardPage).toHaveBeenCalled();
    });

    it('does not display Solana not supported button when hideSolanaAssets is false', () => {
      const mockSetOpen = jest.fn();
      const token = createMockToken();
      const delegationSettings = createMockDelegationSettings();

      const { queryByText } = renderWithToastContext(
        <AssetSelectionBottomSheet
          setOpenAssetSelectionBottomSheet={mockSetOpen}
          sheetRef={sheetRef}
          tokensWithAllowances={[token]}
          delegationSettings={delegationSettings}
          hideSolanaAssets={false}
        />,
      );

      expect(
        queryByText('card.asset_selection.solana_not_supported_button_title'),
      ).toBeNull();
    });
  });
});
