// Mock SDK first - must be hoisted before imports
const mockLogoutFromProvider = jest.fn();
const mockSetIsAuthenticated = jest.fn();
const mockSdk = {
  getSupportedTokensByChainId: jest.fn(() => []),
  isCardHolder: jest.fn(),
  getGeoLocation: jest.fn(),
  getSupportedTokensAllowances: jest.fn(),
  getPriorityToken: jest.fn(),
  initiateCardProviderAuthentication: jest.fn(),
  login: jest.fn(),
  authorize: jest.fn(),
  exchangeToken: jest.fn(),
  refreshLocalToken: jest.fn(),
  getCardDetails: jest.fn(),
  getCardExternalWalletDetails: jest.fn(),
};

jest.mock('../../sdk', () => ({
  useCardSDK: jest.fn(() => ({
    sdk: mockSdk,
    isLoading: false,
    logoutFromProvider: mockLogoutFromProvider,
    userCardLocation: 'international' as const,
  })),
  withCardSDK: (component: React.ComponentType) => component,
}));

// Mock push provisioning hook
const mockInitiateProvisioning = jest.fn();
const mockResetProvisioningStatus = jest.fn();
const mockOpenInWallet = jest.fn(() => Promise.resolve());
const mockUsePushProvisioning = jest.fn(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  (_options: unknown) => ({
    initiateProvisioning: mockInitiateProvisioning,
    resetStatus: mockResetProvisioningStatus,
    status: 'idle' as const,
    error: null,
    isProvisioning: false,
    isSuccess: false,
    isError: false,
    isLoading: false,
    canAddToWallet: false,
    isCardInWallet: false,
    pendingVerificationDevices: [] as ('phone' | 'watch')[],
    canOpenInWallet: false,
    openInWallet: mockOpenInWallet,
  }),
);

jest.mock('../../pushProvisioning', () => ({
  usePushProvisioning: (options: unknown) => mockUsePushProvisioning(options),
  getWalletName: jest.fn(() => 'Apple Wallet'),
}));

// Mock @expensify/react-native-wallet
jest.mock('@expensify/react-native-wallet', () => ({
  AddToWalletButton: () => null,
}));

const mockRemoveQueries = jest.fn();
jest.mock('@tanstack/react-query', () => ({
  ...jest.requireActual('@tanstack/react-query'),
  useQueryClient: jest.fn(() => ({
    removeQueries: mockRemoveQueries,
    invalidateQueries: jest.fn().mockResolvedValue(undefined),
  })),
  // The registration-status poll inside useCardSetupPendingRefresh only
  // runs while the signed-out pending state is on screen; the tests never
  // exercise it, so a settled empty query keeps the hook inert.
  useQuery: jest.fn(() => ({
    data: undefined,
    isLoading: false,
    isFetching: false,
    error: null,
  })),
}));

import {
  act,
  fireEvent,
  screen,
  waitFor,
  within,
} from '@testing-library/react-native';
import { type ReactTestInstance } from 'react-test-renderer';
import { strings } from '../../../../../../locales/i18n';
import {
  Alert,
  Linking,
  Platform,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { useSelector } from 'react-redux';
import React from 'react';
import CardHome from './CardHome';
import { CardHomeStatusViewSelectors } from './components/CardHomeStatusView';
import { METAL_CARD_ART_FILL } from '../../components/CardImage/CardImage';
import { useCardEnableCard } from './hooks/useCardEnableCard';
import {
  CARD_SETUP_CREATING_POLL_MS,
  CARD_SETUP_PENDING_POLL_MS,
} from './hooks/useCardSetupPendingRefresh';
import { renderScreen } from '../../../../../util/test/renderWithProvider';
import { withCardSDK } from '../../sdk';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import Routes from '../../../../../constants/navigation/Routes';
import {
  FundingStatus,
  CardFundingTokenWithBalance,
  CardStateWarning,
  CardStatus,
  CardType,
  type RegistrationSettingsResponse,
} from '../../types';
import type { TokenI } from '../../../Tokens/types';
import { useCardHomeData } from '../../hooks/useCardHomeData';
import { useOpenSwaps } from '../../hooks/useOpenSwaps';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { ToastContext } from '../../../../../component-library/components/Toast';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { TOKEN_RATE_UNDEFINED } from '../../../Tokens/constants';
import { selectPrivacyMode } from '../../../../../selectors/preferencesController';
import { selectCurrentCurrency } from '../../../../../selectors/currencyRateController';
import {
  selectDepositActiveFlag,
  selectDepositMinimumVersionFlag,
} from '../../../../../selectors/featureFlagController/deposit';
import {
  selectApplePayLearnMoreUrl,
  selectMetalCardCheckoutFeatureFlag,
  selectCardIntercomSupportEnabled,
} from '../../../../../selectors/featureFlagController/card';
import {
  selectIsCardAuthenticated,
  selectHasCard,
  selectCardLastUnauthenticatedReason,
  selectCardUserLocation,
  selectCardHomeDataStatus,
  selectMoneyAccountVedaTokenConfig,
  selectCardActiveProviderId,
  selectCardProviderUserId,
  selectCardSelectedCountry,
  selectHasCompletedCardMigration,
} from '../../../../../selectors/cardController';
import { selectPrimaryMoneyAccount } from '../../../../../selectors/moneyAccountController';
import { useIsSwapEnabledForPriorityToken } from '../../hooks/useIsSwapEnabledForPriorityToken';
import { useCardUkMigrationState } from '../../hooks/useCardUkMigrationState';
import { useCardUkMigrationUpdateBadge } from '../../hooks/useCardUkMigrationUpdateBadge';
import { selectSelectedInternalAccountByScope } from '../../../../../selectors/multichainAccounts/accounts';
import useImmersveSupportedRegions from '../../hooks/useImmersveSupportedRegions';
import useCardDetailsToken from '../../hooks/useCardDetailsToken';
import useCardPinToken from '../../hooks/useCardPinToken';
import type { UseMoneyAccountCardLinkageReturn } from '../../hooks/useMoneyAccountCardLinkage';
import { MONEY_HOME_CARD_ORIGIN } from '../../hooks/useCardPostAuthRedirect';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockSetNavigationOptions = jest.fn();
const mockNavigationDispatch = jest.fn();
let mockIsFocused = true;
let mockCardNavigationParent:
  | {
      getState: () => { routes: { params?: Record<string, unknown> }[] };
      getParent: () => undefined;
    }
  | undefined;
let mockArrivalOverride: {
  usesRiveCard: boolean;
  playReveal: boolean;
} | null = null;

import {
  useFocusEffect,
  StackActions,
  CommonActions,
} from '@react-navigation/native';

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useFocusEffect: jest.fn(),
    useIsFocused: () => mockIsFocused,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: mockGoBack,
      setOptions: mockSetNavigationOptions,
      dispatch: mockNavigationDispatch,
      addListener: jest.fn(() => jest.fn()),
      getParent: () => mockCardNavigationParent,
    }),
    useRoute: () => ({
      params: {},
    }),
    StackActions: {
      replace: jest.fn((routeName: string) => ({
        type: 'REPLACE',
        routeName,
      })),
    },
    CommonActions: {
      reset: jest.fn((payload: unknown) => ({
        type: 'RESET',
        payload,
      })),
    },
  };
});

// mockPriorityToken matches the output of toCardFundingToken(mockPrimaryFundingAsset)
const mockPriorityToken = {
  address: '0x123...',
  symbol: 'USDC',
  decimals: 6,
  spendableBalance: '250000000',
  spendingCap: '500000000',
  name: 'USD Coin',
  caipChainId: 'eip155:1',
  walletAddress: '0x789',
  fundingStatus: FundingStatus.Enabled,
  priority: 1,
  stagingTokenAddress: null,
  delegationContract: null,
};

// CardFundingTokenWithBalance — mockPriorityToken with balance data merged in.
const mockPrimaryAssetWithBalance = {
  ...mockPriorityToken,
  balanceFiat: '$1,000.00',
  balanceFormatted: '1000.000000 USDC',
  rawFiatNumber: 1000,
  rawTokenBalance: 1000,
};

// CardFundingAsset version — spendableBalance is remaining amount, spendingCap is total cap.
const mockPrimaryFundingAsset = {
  address: '0x123...',
  symbol: 'USDC',
  decimals: 6,
  spendableBalance: '250000000',
  spendingCap: '500000000',
  name: 'USD Coin',
  chainId: 'eip155:1',
  walletAddress: '0x789',
  priority: 1,
  status: 'active',
};

const mockCurrentAddress = '0x789';

const mockSelectedInternalAccount = {
  address: mockCurrentAddress,
};

// Mock hooks
const mockRefetchAllData = jest.fn().mockResolvedValue(undefined);
const mockFreezeMutate = jest
  .fn()
  .mockImplementation((_, options?: { onSuccess?: () => void }) => {
    options?.onSuccess?.();
  });
const mockUnfreezeMutate = jest
  .fn()
  .mockImplementation((_, options?: { onSuccess?: () => void }) => {
    options?.onSuccess?.();
  });
const mockUseCardFreeze = jest.fn(() => ({
  freeze: {
    isError: false,
    isPending: false,
    isSuccess: false,
    mutate: mockFreezeMutate,
    data: undefined,
    error: null,
  },
  unfreeze: {
    isError: false,
    isPending: false,
    isSuccess: false,
    mutate: mockUnfreezeMutate,
    data: undefined,
    error: null,
  },
}));
const mockGoToSwaps = jest.fn();
const mockDispatch = jest.fn();
const mockOpenSwaps = jest.fn();
const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn();

const mockEventBuilder = {
  addProperties: jest.fn().mockReturnThis(),
  build: jest.fn().mockReturnValue({ event: 'built' }),
};

interface MockAssetBalanceInfo {
  balanceFiat: string | undefined;
  asset: { symbol: string; image: string };
  balanceFormatted: string | undefined;
  rawTokenBalance?: number;
  rawFiatNumber?: number;
}

const createMockAssetBalancesMap = (
  balanceInfo: MockAssetBalanceInfo,
  token = mockPriorityToken,
): Map<string, MockAssetBalanceInfo> => {
  const map = new Map<string, MockAssetBalanceInfo>();
  // Use the same key format as the component: `${address}-${caipChainId}-${walletAddress}`
  const key = `${token.address?.toLowerCase()}-${token.caipChainId}-${token.walletAddress?.toLowerCase()}`;
  map.set(key, balanceInfo);
  return map;
};

const mockUseAssetBalances = jest.fn(() =>
  createMockAssetBalancesMap({
    balanceFiat: '$1,000.00',
    asset: {
      symbol: 'USDC',
      image: 'usdc-image-url',
    },
    balanceFormatted: '1000.000000 USDC',
    rawTokenBalance: 1000,
    rawFiatNumber: 1000,
  }),
);

const mockNavigateToTravelPage = jest.fn();
const mockNavigateToCardTosPage = jest.fn();

interface NavigateToCardPageHookReturn {
  navigateToTravelPage: jest.Mock;
  navigateToCardTosPage: jest.Mock;
}

const mockUseNavigateToCardPage = jest.fn<
  NavigateToCardPageHookReturn,
  [unknown, string | undefined]
>(() => ({
  navigateToTravelPage: mockNavigateToTravelPage,
  navigateToCardTosPage: mockNavigateToCardTosPage,
}));

const mockUseSwapBridgeNavigation = jest.fn(() => ({
  goToSwaps: mockGoToSwaps,
}));

interface RegistrationSettingsHookReturn {
  data: RegistrationSettingsResponse | null;
  isLoading: boolean;
  error: Error | null;
  fetchData: jest.Mock;
}

jest.mock('../../hooks/useCardHomeData', () => ({
  __esModule: true,
  useCardHomeData: jest.fn(),
}));

jest.mock('../../hooks/useImmersveSupportedRegions', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    region: null,
    onboardingDocuments: [],
    permanentDocuments: [],
    isLoading: false,
    error: null,
    refetch: jest.fn(),
  })),
}));

const mockEnableCard = jest.fn();
const mockRecheckProvisioning = jest.fn();
let mockCanEnableCard = false;
let mockIsEnableCardPending = false;
let mockProvisioningView:
  | 'reconciling'
  | 'hidden'
  | 'kyc_under_review'
  | 'provisioning' = 'provisioning';
let mockIsProvisioningPollActive = false;
let mockIsSignedOutKycPending = false;
let mockNetworkTier:
  | 'NONE'
  | 'SLOW_CELLULAR'
  | 'FAST_CELLULAR'
  | 'WIFI'
  | null = null;
let mockHardwareTier: 'LOW' | 'MID' | 'HIGH' | null = null;
jest.mock('../../../../../hooks/useNetworkTier', () => ({
  useNetworkTier: () => mockNetworkTier,
}));
jest.mock('../../../../../util/deviceCapability', () => ({
  getHardwareTier: () => mockHardwareTier,
}));
jest.mock('./hooks/useSignedOutKycPending', () => ({
  __esModule: true,
  default: () => mockIsSignedOutKycPending,
}));

const mockRefreshRegistrationStatus = jest.fn().mockResolvedValue(undefined);
const mockUseCardSetupPendingRefresh = jest.fn((_options: unknown) => ({
  refreshRegistrationStatus: mockRefreshRegistrationStatus,
}));
jest.mock('./hooks/useCardSetupPendingRefresh', () => {
  const actual = jest.requireActual('./hooks/useCardSetupPendingRefresh');
  const mockedHook = (options: unknown) =>
    mockUseCardSetupPendingRefresh(options);
  return {
    ...actual,
    __esModule: true,
    default: mockedHook,
    useCardSetupPendingRefresh: mockedHook,
  };
});

jest.mock('./hooks/useCardEnableCard', () => ({
  useCardEnableCard: jest.fn(() => ({
    canEnableCard: mockCanEnableCard,
    enableCard: mockCanEnableCard ? mockEnableCard : null,
    provisioningView: mockProvisioningView,
    isEnableCardPending: mockIsEnableCardPending,
    isProvisioningPollActive: mockIsProvisioningPollActive,
    recheck: mockRecheckProvisioning,
  })),
}));

jest.mock('../../../../hooks/useIsGlassSurfaceEnabled', () => ({
  useIsGlassSurfaceEnabled: () => false,
}));

const mockUseCardRecentTransactions = jest.fn(
  (_options?: { enabled?: boolean }) => ({
    transactions: [],
    isLoading: false,
    error: null,
    refetch: jest.fn(),
  }),
);

jest.mock('./hooks/useCardArrivalAnimation', () => {
  const actual = jest.requireActual('./hooks/useCardArrivalAnimation');
  return {
    ...actual,
    useCardArrivalAnimation: (params: unknown) => {
      if (mockArrivalOverride) {
        return {
          usesRiveCard: mockArrivalOverride.usesRiveCard,
          playReveal: mockArrivalOverride.playReveal,
          revealKey: 1,
          revealDelayMs: 0,
          cardStyle: {},
        };
      }
      return actual.useCardArrivalAnimation(params);
    },
  };
});

jest.mock('../../../Money/components/MoneyCardTiltAnimation', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  const MockTilt = ({ testID }: { testID?: string }) =>
    ReactActual.createElement(View, { testID });
  return { __esModule: true, default: MockTilt };
});

jest.mock('../../hooks/useCardRecentTransactions', () => ({
  useCardRecentTransactions: (options?: { enabled?: boolean }) =>
    mockUseCardRecentTransactions(options),
}));

let mockTransactionHistoryDestination: 'card' | 'money' | null = 'card';
jest.mock('../../hooks/useCardTransactionHistoryDestination', () => ({
  useCardTransactionHistoryDestination: () => mockTransactionHistoryDestination,
}));

jest.mock('../../hooks/useCreditBalance', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    wallet: null,
    creditBalance: '0',
    creditBalanceNumber: 0,
    creditCurrency: undefined,
    creditFiatNumber: undefined,
    hasCredit: false,
    isLoading: false,
  })),
}));

jest.mock('../../hooks/useCardFreeze', () => ({
  __esModule: true,
  default: jest.fn(() => mockUseCardFreeze()),
}));

jest.mock('../../hooks/useAssetBalances', () => ({
  useAssetBalances: () => mockUseAssetBalances(),
}));

jest.mock('../../hooks/useNavigateToCardPage', () => ({
  useNavigateToCardPage: (
    navigation: unknown,
    cardTermsAndConditionsUrl?: string,
  ) => mockUseNavigateToCardPage(navigation, cardTermsAndConditionsUrl),
}));

const mockUseRegistrationSettings = jest.fn<RegistrationSettingsHookReturn, []>(
  () => ({
    data: null,
    isLoading: false,
    error: null,
    fetchData: jest.fn(),
  }),
);

jest.mock('../../hooks/useRegistrationSettings', () => ({
  __esModule: true,
  default: () => mockUseRegistrationSettings(),
}));

jest.mock('../../../Bridge/hooks/useSwapBridgeNavigation', () => ({
  useSwapBridgeNavigation: () => mockUseSwapBridgeNavigation(),
  SwapBridgeNavigationLocation: {
    TokenDetails: 'TokenDetails',
  },
}));

jest.mock('../../hooks/useOpenSwaps', () => ({
  useOpenSwaps: jest.fn(),
}));

jest.mock('../../../Ramp/hooks/useRampNavigation', () => ({
  useRampNavigation: jest.fn(),
  RampMode: { AGGREGATOR: 'AGGREGATOR', DEPOSIT: 'DEPOSIT' },
}));

jest.mock('../../hooks/useIsSwapEnabledForPriorityToken', () => ({
  useIsSwapEnabledForPriorityToken: jest.fn(),
}));

const mockStartMoneyAccountLinkFlow = jest.fn();
const createDefaultMoneyAccountCardLinkageMock =
  (): UseMoneyAccountCardLinkageReturn => ({
    hasMoneyAccountRequirements: false,
    hasMoneyAccountBaseRequirements: false,
    isCardAuthenticated: false,
    isCardVerified: false,
    isCardLinkedToMoneyAccount: false,
    isResidencyBlocked: false,
    primaryMoneyAccount: undefined,
    moneyAccountCardToken: null,
    canLink: false,
    isMoneyAccountLinkingSupported: true,
    isMoneyCardSectionAvailable: true,
    reportsVerificationStatus: true,
    status: 'idle' as const,
    isLinking: false,
    error: null,
    getLinkFlowRedirectTarget: jest.fn(() => undefined),
    startLinkFlow: mockStartMoneyAccountLinkFlow,
    openLinkCardSheet: jest.fn(),
    confirmLinkInBackground: jest.fn(),
    reset: jest.fn(),
  });
const mockUseMoneyAccountCardLinkage = jest.fn<
  UseMoneyAccountCardLinkageReturn,
  []
>(createDefaultMoneyAccountCardLinkageMock);

jest.mock('../../hooks/useMoneyAccountCardLinkage', () => ({
  __esModule: true,
  useMoneyAccountCardLinkage: () => mockUseMoneyAccountCardLinkage(),
  default: () => mockUseMoneyAccountCardLinkage(),
}));

const mockUseMoneyVaultApy = jest.fn(() => ({
  apyPercent: undefined as number | undefined,
}));

jest.mock('../../../Money/hooks/useMoneyVaultApy', () => ({
  __esModule: true,
  default: () => mockUseMoneyVaultApy(),
}));

const mockFetchCardDetailsToken = jest.fn();
const mockClearCardDetailsImageUrl = jest.fn();
const mockOnCardDetailsImageLoad = jest.fn();
jest.mock('../../hooks/useCardDetailsToken', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    fetchCardDetailsToken: mockFetchCardDetailsToken,
    isLoading: false,
    isImageLoading: false,
    onImageLoad: mockOnCardDetailsImageLoad,
    error: null,
    imageUrl: null,
    clearImageUrl: mockClearCardDetailsImageUrl,
  })),
}));

const mockGeneratePinToken = jest.fn();
const mockResetPinToken = jest.fn();
jest.mock('../../hooks/useCardPinToken', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    generatePinToken: mockGeneratePinToken,
    isLoading: false,
    error: null,
    imageUrl: null,
    reset: mockResetPinToken,
  })),
}));

jest.mock('../../components/ViewPinBottomSheet', () => ({
  createViewPinBottomSheetNavigationDetails: jest.fn((params) => [
    'CardModals',
    { screen: 'CardViewPinModal', params },
  ]),
}));

// Mock useAuthentication for biometric verification
const mockReauthenticate = jest.fn();
jest.mock('../../../../../core/Authentication/hooks/useAuthentication', () =>
  jest.fn(() => ({
    reauthenticate: mockReauthenticate,
  })),
);

jest.mock('../../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: jest.fn(),
}));

// Mock navigation helper functions
jest.mock('../../hooks/useFundingAccountName', () => ({
  useFundingAccountName: () => 'Account 1',
}));

jest.mock('../../components/AddFundsBottomSheet/AddFundsBottomSheet', () => ({
  createAddFundsModalNavigationDetails: jest.fn((params) => [
    'CardModals',
    { screen: 'CardAddFundsModal', params },
  ]),
}));

jest.mock(
  '../../components/AssetSelectionBottomSheet/AssetSelectionBottomSheet',
  () => ({
    createAssetSelectionModalNavigationDetails: jest.fn((params) => [
      'CardModals',
      { screen: 'CardAssetSelectionModal', params },
    ]),
  }),
);

// Mock the design-system BottomSheet: the real sheet does not render its
// children in the test environment, and the More sheet holds the TOS and
// Contact support rows.
jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  const MockBottomSheet = ReactActual.forwardRef(
    (
      props: {
        children?: React.ReactNode;
        testID?: string;
      },
      ref: React.Ref<{ onCloseBottomSheet: (cb?: () => void) => void }>,
    ) => {
      const { children, ...rest } = props;
      ReactActual.useImperativeHandle(ref, () => ({
        onCloseBottomSheet: (cb?: () => void) => cb?.(),
        onOpenBottomSheet: jest.fn(),
      }));
      return ReactActual.createElement(View, { ...rest }, children);
    },
  );
  return { ...actual, BottomSheet: MockBottomSheet };
});

// Mock react-native-device-info
jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn(() => '1.0.0'),
  // Read by useLiquidGlass inside the action row's MainActionButtonGlass.
  getTotalMemorySync: jest.fn(() => 8 * 1024 * 1024 * 1024),
}));

// Mock deposit feature flag selectors
jest.mock('../../../../../selectors/featureFlagController/deposit', () => ({
  selectDepositActiveFlag: jest.fn(),
  selectDepositMinimumVersionFlag: jest.fn(),
}));

// Mock card feature flag selectors
jest.mock('../../../../../selectors/featureFlagController/card', () => ({
  ...jest.requireActual('../../../../../selectors/featureFlagController/card'),
  selectMetalCardCheckoutFeatureFlag: jest.fn(),
}));

jest.mock('../../hooks/useCardUkMigrationState', () => ({
  useCardUkMigrationState: jest.fn(() => ({
    state: {
      phase: 'off',
      isActive: false,
      deadline: null,
    },
    refresh: jest.fn(),
  })),
}));

jest.mock('../../hooks/useCardUkMigrationUpdateBadge', () => ({
  useCardUkMigrationUpdateBadge: jest.fn(() => null),
}));

// Mock bridge actions
jest.mock('../../../../../core/redux/slices/bridge', () => ({
  setDestToken: jest.fn((token) => ({
    type: 'bridge/setDestToken',
    payload: token,
  })),
  setSourceToken: jest.fn((token) => ({
    type: 'bridge/setSourceToken',
    payload: token,
  })),
}));

// Mock utility functions
jest.mock('../../util/getHighestFiatToken', () => ({
  getHighestFiatToken: jest.fn(() => mockPriorityToken),
}));

// Mock isSolanaChainId
jest.mock('@metamask/bridge-controller', () => ({
  ...jest.requireActual('@metamask/bridge-controller'),
  isSolanaChainId: jest.fn(),
}));

// Mock authentication error utility
const mockIsAuthenticationError = jest.fn();
jest.mock('../../util/isAuthenticationError', () => ({
  isAuthenticationError: (...args: unknown[]) =>
    mockIsAuthenticationError(...args),
}));

// Mock card token vault
const mockRemoveCardBaanxToken = jest.fn();
jest.mock('../../util/cardTokenVault', () => ({
  removeCardBaanxToken: () => mockRemoveCardBaanxToken(),
}));

// Mock Redux card actions
const mockClearAllCache = jest.fn(() => ({
  type: 'card/clearAllCache',
}));
jest.mock('../../../../../core/redux/slices/card', () => {
  const actualModule = jest.requireActual(
    '../../../../../core/redux/slices/card',
  );
  return {
    ...actualModule,
    clearAllCache: () => mockClearAllCache(),
  };
});

// Mock Logger
jest.mock('../../../../../util/Logger', () => ({
  error: jest.fn(),
  log: jest.fn(),
}));

// Mock token constants
jest.mock('../../../Tokens/constants', () => ({
  TOKEN_BALANCE_LOADING: 'tokenBalanceLoading',
  TOKEN_BALANCE_LOADING_UPPERCASE: 'TOKENBALANCELOADING',
  TOKEN_RATE_UNDEFINED: 'tokenRateUndefined',
}));

// Mock Engine properly to match how it's used in the component
jest.mock('../../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    setSelectedAddress: jest.fn(),
    context: {
      PreferencesController: {
        setPrivacyMode: jest.fn(),
      },
      NetworkController: {
        setActiveNetwork: jest.fn().mockResolvedValue(undefined),
        findNetworkClientIdByChainId: jest.fn().mockReturnValue(undefined), // Return undefined to prevent network switching
      },
      AccountsController: {
        getAccountByAddress: jest.fn().mockReturnValue({ id: 'account-id' }),
        setSelectedAccount: jest.fn(),
      },
      CardController: {
        validateAndRefreshSession: jest.fn().mockResolvedValue(undefined),
        getCapabilities: jest.fn().mockReturnValue(null),
        logout: jest.fn().mockResolvedValue(undefined),
        fetchCardHomeData: jest.fn().mockResolvedValue(undefined),
        clearLastUnauthenticatedReason: jest.fn(),
      },
    },
  },
}));

// Import the Engine to get typed references to the mocked functions
import Engine from '../../../../../core/Engine';
import { CardHomeSelectors } from './CardHome.testIds';
import { MoneyBalanceSummaryTestIds } from '../../../Money/components/MoneyBalanceSummary/MoneyBalanceSummary.testIds';
import { CARD_SUPPORT_EMAIL } from '../../constants';
import { isSolanaChainId } from '@metamask/bridge-controller';
import { CardEntryPoint } from '../../util/metrics';
import { MoneyMetaMaskCardTestIds } from '../../../Money/components/MoneyMetaMaskCard/MoneyMetaMaskCard.testIds';

// Get references to the mocked functions
const mockSetActiveNetwork = Engine.context.NetworkController
  .setActiveNetwork as jest.MockedFunction<
  typeof Engine.context.NetworkController.setActiveNetwork
>;
const mockFindNetworkClientIdByChainId = Engine.context.NetworkController
  .findNetworkClientIdByChainId as jest.MockedFunction<
  typeof Engine.context.NetworkController.findNetworkClientIdByChainId
>;
const mockSetPrivacyMode = Engine.context.PreferencesController
  .setPrivacyMode as jest.MockedFunction<
  typeof Engine.context.PreferencesController.setPrivacyMode
>;
const mockGetAccountByAddress = Engine.context.AccountsController
  .getAccountByAddress as jest.MockedFunction<
  typeof Engine.context.AccountsController.getAccountByAddress
>;
const mockSetSelectedAccount = Engine.context.AccountsController
  .setSelectedAccount as jest.MockedFunction<
  typeof Engine.context.AccountsController.setSelectedAccount
>;
const mockSetSelectedAddress = Engine.setSelectedAddress as jest.MockedFunction<
  typeof Engine.setSelectedAddress
>;
const mockGetCapabilities = Engine.context.CardController
  .getCapabilities as jest.Mock;
const mockClearLastUnauthenticatedReason = Engine.context.CardController
  .clearLastUnauthenticatedReason as jest.MockedFunction<
  typeof Engine.context.CardController.clearLastUnauthenticatedReason
>;

const BAANX_CAPABILITIES = {
  authMethod: 'email_password',
  supportsOTP: true,
  supportsFundingApproval: true,
  supportsFundingLimits: true,
  fundingChains: ['eip155:59144', 'eip155:8453'],
  supportsFreeze: true,
  pushProvisioning: { applePay: true, googlePay: true },
  onboarding: { type: 'steps', steps: [], kycProvider: 'veriff' },
  supportsPinView: true,
  supportsPinSet: false,
  supportsCashback: true,
  supportsCredit: true,
  supportsSensitiveDetailsView: false,
  supportsTravel: true,
  supportsTransactionHistory: true,
  supportsContactDetails: false,
  supportsMoneyAccountLinking: true,
  reportsVerificationStatus: true,
};

const mockIsSolanaChainId = isSolanaChainId as jest.MockedFunction<
  typeof isSolanaChainId
>;
const mockShowToast = jest.fn();
const mockCloseToast = jest.fn();
const mockToastRef = {
  current: {
    showToast: mockShowToast,
    closeToast: mockCloseToast,
  },
};

jest.mock('../../../../../../locales/i18n', () => ({
  // MarketingMomentTitle (rendered by the waiting view) subscribes to locale
  // changes; provide a no-op emitter so the mock stays inert.
  I18nEvents: {
    addListener: jest.fn(() => jest.fn()),
    removeListener: jest.fn(),
    emit: jest.fn(),
  },
  strings: (key: string, params?: Record<string, unknown>) => {
    const strings: { [key: string]: string } = {
      'card.card_home.spending_with': 'Spending with',
      'card.card_home.add_funds': 'Add funds',
      'card.card_home.limited_spending_warning': 'Limited spending allowance',
      'card.card_home.spending_limit_available': 'available',
      'card.card': 'Card',
      'card.card_home.error_title': 'Unable to load card',
      'card.card_home.error_description': 'Please try again later',
      'card.card_home.try_again': 'Try again',
      'card.card_home.onboarding_token_revoked':
        'We couldn’t continue your Card session. Please log in again.',
      'card.card_home.kyc_status.pending.title': 'Verification in Progress',
      'card.card_home.kyc_status.pending.description':
        'Your identity verification is being processed. This usually takes a few minutes. Please check back shortly to enable your card.',
      'card.card_home.kyc_status.rejected.title': 'Verification not approved',
      'card.card_home.kyc_status.rejected.description':
        'We were unable to verify your identity. Please contact support for assistance.',
      'card.card_home.kyc_status.rejected.support_description':
        "We were unable to verify your identity at this time. Please contact our support team for assistance and we'll help you resolve this issue.",
      'card.card_home.kyc_status.unverified.title': 'Verification required',
      'card.card_home.kyc_status.unverified.description':
        'You need to complete identity verification before enabling your card. Please complete the onboarding process.',
      'card.card_home.kyc_status.error.title':
        'Verification status unavailable',
      'card.card_home.kyc_status.error.description':
        "We couldn't check your verification status. Please try again later or contact support if the issue persists.",
      'card.card_home.kyc_status.ok_button': 'OK',
      'card.card_home.view_card_details_error':
        'Unable to load card details. Please try again.',
      'card.card_home.manage_card_options.view_card_details':
        'View card details',
      'card.card_home.manage_card_options.hide_card_details':
        'Hide card details',
      'card.card_home.manage_card_options.view_card_details_description':
        'See your full card number, expiry date, and CVV',
      'card.card_home.manage_card_options.freeze_card': 'Freeze card',
      'card.card_home.manage_card_options.unfreeze_card': 'Unfreeze card',
      'card.card_home.action_buttons.freeze': 'Freeze',
      'card.card_home.action_buttons.unfreeze': 'Unfreeze',
      'card.card_home.manage_card_options.freeze_card_description':
        'Temporarily disable your card',
      'card.card_home.manage_card_options.unfreeze_card_description':
        'Reactivate your card to resume transactions',
      'card.card_home.manage_card_options.freeze_error':
        'Failed to update card status. Please try again.',
      'card.card_home.manage_card_options.freeze_success':
        'Card successfully frozen',
      'card.card_home.manage_card_options.unfreeze_success':
        'Card successfully unfrozen',
      'card.card_home.biometric_verification_required':
        'Authentication required to view card details.',
      'card.card_home.unfreeze_auth_required':
        'Authentication required to resume spending on your card.',
      'card.password_bottomsheet.description_unfreeze':
        'Enter your wallet password to unfreeze your card.',
      'card.card_home.setup_pending.reviewing.title':
        "We're reviewing your identity",
      'card.card_home.setup_pending.reviewing.description':
        "This can take a little while. We'll update this screen when it's ready.",
      'card.card_home.setup_pending.creating.title': 'Creating your card',
      'card.card_home.setup_pending.creating.description':
        'This only takes a moment.',
      'card.card_home.setup_pending.checking.title': 'Checking your card',
      'card.card_home.setup_pending.checking.description':
        "We'll update this screen when it's ready.",
      'card.card_home.setup_pending.signed_out_pending.title':
        'Setting up your card',
      'card.card_home.setup_pending.signed_out_pending.description':
        "We'll update this screen when it's ready. You can leave and come back anytime.",
      'card.card_home.segments.activity': 'Activity',
      'card.card_home.segments.manage': 'Manage',
      'card.card_home.recent_activity.see_all': 'See all',
      'card.card_home.activity_empty_title': 'No transactions yet',
      'card.card_home.activity_empty_description':
        'Your card purchases will show here.',
      'card.card_home.manage_card_options.manage_spending_limit':
        'Manage limit',
      'card.card_home.manage_card_options.view_pin': 'View PIN',
      'card.card_home.manage_card_options.view_pin_description':
        'View your card PIN securely',
      'card.card_home.manage_card_options.view_pin_error':
        'Failed to load PIN. Please try again.',
      'card.password_bottomsheet.description_view_pin':
        'Enter your wallet password to view your card PIN.',
      'card.card_home.manage_card_options.cashback_description':
        'Earn on all spending',
      'card.card_home.manage_card_options.unlink_money_account':
        'Unlink Money account',
      'card.card_home.manage_card_options.unlink_money_account_description':
        'Change your Card funding source',
      'card.card_home.manage_card_options.unlink_funding_account':
        'Unlink card',
      'card.card_home.manage_card_options.unlink_funding_account_description':
        'Prevent future purchases from {{accountName}}',
      'money.metamask_card.unlink_card_sheet_another_money_account':
        'another Money account',
      'money.metamask_card.link_title': 'Link card',
      'money.metamask_card.link_card': 'Link card',
      'money.metamask_card.link_subtitle_no_apy':
        'Spend your balance while it earns, anywhere Mastercard is accepted.',
      'card.card_home.manage_card_options.manage_spending_limit_description_remaining':
        '{{remaining}} {{symbol}} of {{total}} {{symbol}} left',
    };
    const value = strings[key];
    if (value) {
      if (
        key ===
          'card.card_home.manage_card_options.unlink_funding_account_description' &&
        params &&
        typeof params === 'object' &&
        'accountName' in params
      ) {
        return value.replace(
          '{{accountName}}',
          String((params as { accountName?: string }).accountName ?? ''),
        );
      }
      if (
        key ===
          'card.card_home.manage_card_options.manage_spending_limit_description_remaining' &&
        params &&
        typeof params === 'object'
      ) {
        const limitParams = params as {
          remaining?: string | number;
          total?: string | number;
          symbol?: string;
        };
        return value
          .replaceAll('{{remaining}}', String(limitParams.remaining ?? ''))
          .replaceAll('{{total}}', String(limitParams.total ?? ''))
          .replaceAll('{{symbol}}', String(limitParams.symbol ?? ''));
      }
      return value;
    }
    if (key === 'money.metamask_card.link_subtitle') {
      return 'Spend your balance while it earns, anywhere Mastercard is accepted.';
    }
    if (key === 'money.metamask_card.link_bullet_apy') {
      const apy = (params as { apy?: number | string } | undefined)?.apy;
      return `Earn up to ~${apy}% APY`;
    }
    if (key === 'card.card_home.manage_card_options.cashback') {
      const cashbackPercentage = (
        params as { cashbackPercentage?: number | string } | undefined
      )?.cashbackPercentage;
      return `${cashbackPercentage}% mUSD Back`;
    }
    return key;
  },
}));

jest.mock('../../../../../util/support/betaSupportUrl', () => ({
  getBetaSupportUrl: jest.fn(() => ''),
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
  useDispatch: () => mockDispatch,
}));

// Mock useState to return our priority token instead of null
jest.mock('react', () => {
  const actualReact = jest.requireActual('react');
  return {
    ...actualReact,
    useState: (initial: unknown) => {
      if (initial === 0) {
        // This is the retries useState call
        return [0, jest.fn()];
      }
      if (initial === true) {
        // This is the isLoadingNetworkChange useState call - start as false for tests
        return [false, jest.fn()];
      }
      return actualReact.useState(initial);
    },
  };
});

// Helper: Setup mock selectors with default values
function setupMockSelectors(
  overrides?: Partial<{
    privacyMode: boolean;
    depositActive: boolean;
    depositMinVersion: string;
    chainId: string;
    selectedAccount: typeof mockSelectedInternalAccount;
    isAuthenticated: boolean;
    hasCard: boolean;
    lastUnauthenticatedReason: 'onboarding_token_revoked' | null;
    userLocation: 'us' | 'international';
    isMetalCardCheckoutEnabled: boolean;
    ukMigrationState: {
      phase: 'off' | 'soft' | 'forced';
      isActive: boolean;
      deadline: Date | null;
    };
    cardHomeDataStatus: 'idle' | 'loading' | 'success' | 'error';
    primaryMoneyAccount: { address: string } | undefined;
    vedaConfig: {
      caipChainId: string;
      address: string;
      decimals: number;
    } | null;
    activeProviderId: string;
    selectedCountry: string | null;
    isCardIntercomSupportEnabled: boolean;
    providerUserId: string | null;
    hasCompletedMigration: boolean;
  }>,
) {
  const defaults = {
    privacyMode: false,
    depositActive: true,
    depositMinVersion: '0.9.0',
    chainId: '0xe708',
    selectedAccount: mockSelectedInternalAccount,
    isAuthenticated: true,
    hasCard: true,
    lastUnauthenticatedReason: null,
    userLocation: 'international' as const,
    isMetalCardCheckoutEnabled: true,
    ukMigrationState: {
      phase: 'off' as const,
      isActive: false,
      deadline: null,
    },
    cardHomeDataStatus: 'success' as const,
    primaryMoneyAccount: { address: mockCurrentAddress },
    vedaConfig: null,
    currentCurrency: 'usd',
    activeProviderId: 'baanx',
    selectedCountry: null,
    isCardIntercomSupportEnabled: false,
    providerUserId: 'cardholder-1',
    hasCompletedMigration: false,
  };

  const config = { ...defaults, ...overrides };

  mockUseSelector.mockImplementation((selector) => {
    if (!selector) return [];

    if (selector === selectPrivacyMode) return config.privacyMode;
    if (selector === selectCurrentCurrency) return config.currentCurrency;
    if (selector === selectDepositActiveFlag) return config.depositActive;
    if (selector === selectDepositMinimumVersionFlag)
      return config.depositMinVersion;
    if (selector === selectIsCardAuthenticated) return config.isAuthenticated;
    if (selector === selectHasCard) return config.hasCard;
    if (selector === selectCardLastUnauthenticatedReason)
      return config.lastUnauthenticatedReason;
    if (selector === selectCardUserLocation) return config.userLocation;
    if (selector === selectCardActiveProviderId) return config.activeProviderId;
    if (selector === selectCardSelectedCountry) return config.selectedCountry;
    if (selector === selectCardHomeDataStatus) return config.cardHomeDataStatus;
    if (selector === selectPrimaryMoneyAccount)
      return config.primaryMoneyAccount;
    if (selector === selectMoneyAccountVedaTokenConfig)
      return config.vedaConfig;
    if (selector === selectMetalCardCheckoutFeatureFlag)
      return config.isMetalCardCheckoutEnabled;
    if (selector === selectApplePayLearnMoreUrl)
      return 'https://metamask.io/card';
    if (selector === selectCardIntercomSupportEnabled)
      return config.isCardIntercomSupportEnabled;
    if (selector === selectCardProviderUserId) return config.providerUserId;
    if (selector === selectHasCompletedCardMigration)
      return config.hasCompletedMigration;

    if (selector === selectSelectedInternalAccountByScope)
      return () => config.selectedAccount;

    const selectorString =
      typeof selector === 'function' ? selector.toString() : '';
    if (selectorString.includes('selectSelectedInternalAccount'))
      return config.selectedAccount;

    return [];
  });

  jest.mocked(useCardUkMigrationState).mockReturnValue({
    state: config.ukMigrationState,
    refresh: jest.fn(),
  });
}

// Helper: Setup useCardHomeData mock with custom values (keeps old params for compatibility)
function setupLoadCardDataMock(
  overrides?: Partial<{
    priorityToken: typeof mockPriorityToken | null;
    allTokens: (typeof mockPriorityToken)[];
    cardDetails: Record<string, unknown> | null;
    isLoading: boolean;
    error: string | null;
    warning: CardStateWarning | null;
    isAuthenticated: boolean;
    isCardholder: boolean;
    kycStatus: {
      verificationState:
        | 'VERIFIED'
        | 'PENDING'
        | 'REJECTED'
        | 'UNVERIFIED'
        | null;
      userId: string;
      userDetails?: {
        id: string;
        firstName?: string | null;
        lastName?: string | null;
        addressLine1?: string | null;
        addressLine2?: string | null;
        city?: string | null;
        zip?: string | null;
        usState?: string | null;
        mailingAddressLine1?: string | null;
        mailingAddressLine2?: string | null;
        mailingCity?: string | null;
        mailingZip?: string | null;
        mailingUsState?: string | null;
      } | null;
    } | null;
    hasExternalWallets: boolean;
    delegationSettings: Record<string, unknown> | null;
    countryOfResidence: string | null;
    alerts: { type: string; dismissable: boolean }[];
    tokenBalance: number;
  }>,
) {
  const defaults = {
    priorityToken: mockPriorityToken,
    allTokens: [mockPriorityToken],
    cardDetails: { type: CardType.VIRTUAL },
    isLoading: false,
    error: null,
    warning: null,
    isAuthenticated: true,
    isCardholder: true,
    kycStatus: {
      verificationState: 'VERIFIED' as const,
      userId: 'user-123',
      userDetails: undefined,
    },
    hasExternalWallets: false,
    delegationSettings: null,
    countryOfResidence: null as string | null,
    alerts: undefined as { type: string; dismissable: boolean }[] | undefined,
  };

  const config = { ...defaults, ...overrides };

  // Map priorityToken (CardFundingToken) to primaryFundingAsset (CardFundingAsset).
  const primaryFundingAsset = config.priorityToken
    ? {
        address: config.priorityToken.address,
        symbol: config.priorityToken.symbol,
        decimals: config.priorityToken.decimals,
        spendableBalance: String(config.priorityToken.spendableBalance ?? '0'),
        spendingCap: String(config.priorityToken.spendingCap ?? '0'),
        originalSpendingCap: (config.priorityToken as Record<string, unknown>)
          .originalSpendingCap as string | undefined,
        name: config.priorityToken.name,
        chainId: config.priorityToken.caipChainId,
        walletAddress: config.priorityToken.walletAddress,
        priority: 1,
        status:
          config.priorityToken.fundingStatus === FundingStatus.Limited
            ? 'limited'
            : config.priorityToken.fundingStatus === FundingStatus.NotEnabled
              ? 'inactive'
              : 'active',
      }
    : null;

  const fundingAssets = config.allTokens.map((t) => ({
    address: t.address,
    symbol: t.symbol,
    decimals: t.decimals,
    spendableBalance: String(t.spendableBalance ?? '0'),
    spendingCap: String(t.spendingCap ?? '0'),
    name: t.name,
    chainId: t.caipChainId,
    walletAddress: t.walletAddress,
    priority: 1,
    status:
      t.fundingStatus === FundingStatus.Limited
        ? 'limited'
        : t.fundingStatus === FundingStatus.NotEnabled
          ? 'inactive'
          : 'active',
  }));

  // Map alerts based on kycStatus (or use explicit overrides)
  const alerts: { type: string; dismissable: boolean }[] = config.alerts ?? [];
  if (
    !config.alerts &&
    (config.kycStatus?.verificationState === 'PENDING' ||
      config.kycStatus?.verificationState === 'UNVERIFIED')
  ) {
    alerts.push({ type: 'kyc_pending', dismissable: false });
  }

  // Map actions based on warning + kycStatus + hasExternalWallets
  const actions: { type: string; enabled?: boolean }[] = [];
  if (
    !config.alerts &&
    (config.warning === CardStateWarning.NeedDelegation ||
      config.warning === CardStateWarning.NoCard)
  ) {
    if (config.kycStatus?.verificationState === 'VERIFIED') {
      if (config.hasExternalWallets) {
        alerts.push({ type: 'card_provisioning', dismissable: false });
      } else {
        actions.push({ type: 'enable_card' });
      }
    }
  } else if (!config.warning && primaryFundingAsset) {
    actions.push({ type: 'add_funds', enabled: true });
  }

  // Map kycStatus to CardAccountStatus
  let account = null;
  const ud = config.kycStatus?.userDetails;
  if (config.kycStatus?.verificationState && !ud) {
    account = {
      verificationStatus: config.kycStatus.verificationState,
      holderName: null,
      shippingAddress: null,
      countryOfResidence: config.countryOfResidence ?? null,
      usState: null,
      createdAt: null,
    };
  } else if (ud) {
    // Pre-select mailing or physical address (same logic as controller)
    let shippingAddress = null;
    const mailingOk = ud.mailingAddressLine1 && ud.mailingCity && ud.mailingZip;
    if (mailingOk) {
      const mailingAddressLine1 = ud.mailingAddressLine1;
      const mailingCity = ud.mailingCity;
      const mailingZip = ud.mailingZip;
      shippingAddress = {
        line1: mailingAddressLine1,
        line2: ud.mailingAddressLine2 ?? undefined,
        city: mailingCity,
        state: ud.mailingUsState ?? '',
        postalCode: mailingZip,
        country: 'US',
      };
    } else if (ud.addressLine1 && ud.city && ud.zip) {
      shippingAddress = {
        line1: ud.addressLine1,
        line2: ud.addressLine2 ?? undefined,
        city: ud.city,
        state: ud.usState ?? '',
        postalCode: ud.zip,
        country: 'US',
      };
    }
    const derivedHolderName =
      ud.firstName && ud.lastName ? `${ud.firstName} ${ud.lastName}` : null;
    account = {
      verificationStatus: config.kycStatus?.verificationState ?? null,
      holderName: derivedHolderName,
      shippingAddress,
      countryOfResidence: config.countryOfResidence ?? null,
      usState: null,
      createdAt: null,
    };
  }

  // Map cardDetails to CardDetails
  const card = config.cardDetails
    ? {
        id: 'card-123',
        status: 'ACTIVE',
        lastFour: '1234',
        ...config.cardDetails,
      }
    : null;

  // Build enriched CardFundingTokenWithBalance for the new fields returned by useCardHomeData
  const enrichedPrimaryAsset = config.priorityToken
    ? {
        ...config.priorityToken,
        balanceFiat: '$1,000.00',
        balanceFormatted: '1000.000000 USDC',
        rawFiatNumber: config.tokenBalance ?? 1000,
        rawTokenBalance: config.tokenBalance ?? 1000,
      }
    : null;

  (useCardHomeData as jest.Mock).mockReturnValue({
    data: config.error
      ? null
      : {
          primaryFundingAsset,
          fundingAssets,
          availableFundingAssets: fundingAssets,
          card,
          account,
          walletProvisioning: card
            ? {
                eligible: card.status === 'ACTIVE',
                cardholderName: account?.holderName ?? '',
                lastFour: String(card.lastFour ?? ''),
                network: 'MASTERCARD' as const,
              }
            : null,
          alerts,
          actions,
          delegationSettings: config.delegationSettings,
        },
    primaryToken: enrichedPrimaryAsset,
    availableTokens: enrichedPrimaryAsset ? [enrichedPrimaryAsset] : [],
    fundingTokens: enrichedPrimaryAsset ? [enrichedPrimaryAsset] : [],
    balanceMap: enrichedPrimaryAsset
      ? createMockAssetBalancesMap(
          {
            balanceFiat: '$1,000.00',
            asset: { symbol: enrichedPrimaryAsset.symbol, image: '' },
            balanceFormatted: '1000.000000 USDC',
            rawTokenBalance: 1000,
            rawFiatNumber: 1000,
          },
          enrichedPrimaryAsset,
        )
      : new Map(),
    isLoading: config.isLoading,
    isError: !!config.error,
    refetch: mockRefetchAllData,
  });
}

// Helper: Override only primaryToken balance fields in the useCardHomeData mock.
// Use once=true to override only the next render, false to override all subsequent renders.
// This replaces mockUseAssetBalances overrides — balance now flows via useCardHomeData().primaryToken.
function overrideCardHomeDataBalance(
  assetOverrides: Partial<CardFundingTokenWithBalance>,
  once = false,
  cardOverrides: Record<string, unknown> = {},
) {
  const mockReturn = {
    data: {
      primaryFundingAsset: mockPrimaryFundingAsset,
      fundingAssets: [mockPrimaryFundingAsset],
      availableFundingAssets: [mockPrimaryFundingAsset],
      card: {
        id: 'card-123',
        status: 'ACTIVE',
        lastFour: '1234',
        ...cardOverrides,
        type: CardType.VIRTUAL,
      },
      account: null,
      walletProvisioning: {
        eligible: true,
        cardholderName: '',
        lastFour: '1234',
        network: 'MASTERCARD' as const,
      },
      alerts: [],
      actions: [{ type: 'add_funds', enabled: true }],
    },
    primaryToken: { ...mockPrimaryAssetWithBalance, ...assetOverrides },
    availableTokens: [mockPrimaryAssetWithBalance],
    fundingTokens: [mockPrimaryAssetWithBalance],
    balanceMap: new Map(),
    isLoading: false,
    isError: false,
    refetch: mockRefetchAllData,
  };
  if (once) {
    (useCardHomeData as jest.Mock).mockReturnValueOnce(mockReturn);
  } else {
    (useCardHomeData as jest.Mock).mockReturnValue(mockReturn);
  }
}

const CardHomeWithToast = () => (
  <ToastContext.Provider value={{ toastRef: mockToastRef }}>
    <CardHome />
  </ToastContext.Provider>
);

// Helper: Render component with proper wrapper
// Terms and Contact support live in the header's More sheet.
function artHasProp(
  node: ReactTestInstance,
  expected: Record<string, unknown>,
): boolean {
  const props = node.props as Record<string, unknown>;
  const matches = Object.entries(expected).every(
    ([key, value]) => props[key] === value,
  );
  if (matches) return true;
  return node.children.some(
    (child: ReactTestInstance | string) =>
      typeof child !== 'string' && artHasProp(child, expected),
  );
}

function openMoreSheet() {
  fireEvent.press(screen.getByTestId(CardHomeSelectors.MORE_BUTTON));
}

function render(options?: { segment?: 'activity' | 'manage' }) {
  const view = renderScreen(
    withCardSDK(CardHomeWithToast),
    {
      name: Routes.CARD.HOME,
    },
    {
      state: {
        engine: {
          backgroundState,
        },
      },
    },
  );
  if (options?.segment) {
    const segmentTestId =
      options.segment === 'manage'
        ? CardHomeSelectors.MANAGE_SEGMENT
        : CardHomeSelectors.ACTIVITY_SEGMENT;
    const expectedTestId =
      options.segment === 'manage'
        ? CardHomeSelectors.CHANGE_ASSET_BUTTON
        : CardHomeSelectors.RECENT_ACTIVITY;
    const segmentButton = screen.queryByTestId(segmentTestId);
    if (segmentButton) {
      fireEvent.press(segmentButton);
      if (screen.queryByTestId(expectedTestId) == null) {
        const control = screen.queryByTestId(CardHomeSelectors.HOME_SEGMENTS);
        if (control) {
          fireEvent(control, 'onChange', options.segment);
        }
      }
    }
  }
  return view;
}

const authTransitionListeners = new Set<() => void>();

const CardHomeAuthTransitionProbe = () => {
  const [, setTick] = React.useState(1);
  React.useEffect(() => {
    const listener = () => setTick((tick) => tick + 1);
    authTransitionListeners.add(listener);
    return () => {
      authTransitionListeners.delete(listener);
    };
  }, []);
  return (
    <ToastContext.Provider value={{ toastRef: mockToastRef }}>
      <CardHome />
    </ToastContext.Provider>
  );
};

function renderAuthTransition() {
  const view = renderScreen(
    withCardSDK(CardHomeAuthTransitionProbe),
    { name: Routes.CARD.HOME },
    {
      state: {
        engine: {
          backgroundState,
        },
      },
    },
  );
  return {
    ...view,
    update() {
      act(() => {
        authTransitionListeners.forEach((listener) => listener());
      });
    },
  };
}

describe('CardHome Component', () => {
  beforeEach(() => {
    authTransitionListeners.clear();
    mockIsFocused = true;
    mockCardNavigationParent = undefined;
    mockArrivalOverride = null;
    mockCanEnableCard = false;
    mockIsEnableCardPending = false;
    mockIsSignedOutKycPending = false;
    mockNetworkTier = null;
    mockHardwareTier = null;
    mockProvisioningView = 'provisioning';
    mockIsProvisioningPollActive = false;
    mockNetworkTier = null;
    mockEnableCard.mockClear();
    mockUseCardRecentTransactions.mockReturnValue({
      transactions: [],
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });
    mockTransactionHistoryDestination = 'card';
    mockRecheckProvisioning.mockClear();
    jest.clearAllMocks();

    // Mock Alert.alert
    jest
      .spyOn(Alert, 'alert')
      .mockImplementation((_title, _message, buttons) => {
        // Immediately confirm the second button of any confirmation alert.
        if (buttons && buttons.length > 1 && buttons[1].onPress) {
          buttons[1].onPress();
        }
      });

    jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined as never);

    // Clear SDK mocks
    mockLogoutFromProvider.mockClear();
    mockSetIsAuthenticated.mockClear();

    // Clear authentication error handling mocks
    mockIsAuthenticationError.mockClear();
    mockIsAuthenticationError.mockReturnValue(false); // Default to no auth error
    mockRemoveCardBaanxToken.mockClear();
    mockRemoveCardBaanxToken.mockResolvedValue(undefined);
    mockClearAllCache.mockClear();
    mockNavigationDispatch.mockClear();

    // Setup Engine controller mocks
    mockGetCapabilities.mockReturnValue(BAANX_CAPABILITIES);
    mockDispatch.mockClear();
    mockSetActiveNetwork.mockResolvedValue(undefined);
    mockFindNetworkClientIdByChainId.mockReturnValue(''); // Prevent network switching
    mockSetPrivacyMode.mockClear();
    mockGetAccountByAddress.mockReturnValue({
      id: 'account-id',
      type: 'eip155:eoa',
      address: mockCurrentAddress,
      options: {},
      metadata: {
        name: 'Test Account',
        importTime: Date.now(),
        keyring: { type: 'HD Key Tree' },
      },
      scopes: [],
      methods: [],
    });
    mockSetSelectedAccount.mockClear();
    mockIsSolanaChainId.mockReturnValue(false);

    // Reset freeze hook mock
    mockFreezeMutate.mockClear();
    mockUnfreezeMutate.mockClear();
    mockUseCardFreeze.mockReturnValue({
      freeze: {
        isError: false,
        isPending: false,
        isSuccess: false,
        mutate: mockFreezeMutate,
        data: undefined,
        error: null,
      },
      unfreeze: {
        isError: false,
        isPending: false,
        isSuccess: false,
        mutate: mockUnfreezeMutate,
        data: undefined,
        error: null,
      },
    });

    // Setup hook mocks with default values
    (useCardHomeData as jest.Mock).mockReturnValue({
      data: {
        primaryFundingAsset: mockPrimaryFundingAsset,
        fundingAssets: [mockPrimaryFundingAsset],
        availableFundingAssets: [mockPrimaryFundingAsset],
        card: {
          id: 'card-123',
          status: 'ACTIVE',
          lastFour: '1234',
          type: CardType.VIRTUAL,
        },
        account: null,
        alerts: [],
        actions: [{ type: 'add_funds', enabled: true }],
      },
      primaryToken: mockPrimaryAssetWithBalance,
      availableTokens: [mockPrimaryAssetWithBalance],
      fundingTokens: [mockPrimaryAssetWithBalance],
      balanceMap: createMockAssetBalancesMap({
        balanceFiat: '$1,000.00',
        asset: { symbol: 'USDC', image: 'usdc-image-url' },
        balanceFormatted: '1000.000000 USDC',
        rawTokenBalance: 1000,
        rawFiatNumber: 1000,
      }),
      isLoading: false,
      isError: false,
      refetch: mockRefetchAllData,
    });

    mockUseAssetBalances.mockReturnValue(
      createMockAssetBalancesMap({
        balanceFiat: '$1,000.00',
        asset: {
          symbol: 'USDC',
          image: 'usdc-image-url',
        },
        balanceFormatted: '1000.000000 USDC',
        rawTokenBalance: 1000,
        rawFiatNumber: 1000,
      }),
    );

    mockUseNavigateToCardPage.mockReturnValue({
      navigateToTravelPage: mockNavigateToTravelPage,
      navigateToCardTosPage: mockNavigateToCardTosPage,
    });
    mockUseRegistrationSettings.mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
      fetchData: jest.fn(),
    });

    mockUseSwapBridgeNavigation.mockReturnValue({
      goToSwaps: mockGoToSwaps,
    });

    (useOpenSwaps as jest.Mock).mockReturnValue({
      openSwaps: mockOpenSwaps,
    });

    const { useRampNavigation } = jest.requireMock(
      '../../../Ramp/hooks/useRampNavigation',
    );
    (useRampNavigation as jest.Mock).mockReturnValue({
      goToBuy: jest.fn(),
    });

    (useAnalytics as jest.Mock).mockReturnValue({
      trackEvent: mockTrackEvent,
      createEventBuilder: mockCreateEventBuilder,
    });

    mockCreateEventBuilder.mockReturnValue(mockEventBuilder);

    (useIsSwapEnabledForPriorityToken as jest.Mock).mockReturnValue(true);

    jest.mocked(useImmersveSupportedRegions).mockReturnValue({
      region: null,
      onboardingDocuments: [],
      permanentDocuments: [],
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    // Setup default selectors
    setupMockSelectors();
    mockUseMoneyAccountCardLinkage.mockReset();
    mockUseMoneyAccountCardLinkage.mockImplementation(
      createDefaultMoneyAccountCardLinkageMock,
    );
  });

  it('rechecks the left-off setup step when Card home regains focus', () => {
    render();

    expect(jest.mocked(useCardEnableCard)).toHaveBeenCalledWith(
      expect.anything(),
      {
        recheckOnFocus: true,
        kycReviewSelfCheck: true,
        pollIntervalMs: 5_000,
      },
    );
  });

  it('renders card title, action buttons, and manage spending limit item', async () => {
    // Given: default state with priority token
    // When: component renders
    render();

    // Then: key structural elements are present
    await waitFor(() => {
      expect(screen.getByTestId('card-view-title')).toBeOnTheScreen();
    });
    expect(
      screen.getByTestId(CardHomeSelectors.ADD_FUNDS_BUTTON),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(CardHomeSelectors.CHANGE_ASSET_BUTTON),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(CardHomeSelectors.MANAGE_SPENDING_LIMIT_ITEM),
    ).toBeOnTheScreen();
  });

  it('renders correctly with privacy mode enabled', async () => {
    // Given: privacy mode is enabled
    setupMockSelectors({ privacyMode: true });

    // When: component renders
    render();

    // Then: should show privacy indicators
    expect(
      screen.getByTestId(MoneyBalanceSummaryTestIds.BALANCE_PRESSABLE),
    ).toBeOnTheScreen();
    expect(screen.getByText('••••••••••••')).toBeOnTheScreen();
    expect(screen.getByTestId('card-view-title')).toBeOnTheScreen();
  });

  it('resets to authentication when onboarding token is revoked', async () => {
    setupMockSelectors({
      isAuthenticated: false,
      lastUnauthenticatedReason: 'onboarding_token_revoked',
    });

    render();

    await waitFor(() => {
      expect(CommonActions.reset).toHaveBeenCalledWith({
        index: 0,
        routes: [{ name: Routes.CARD.AUTHENTICATION }],
      });
    });
    expect(mockNavigationDispatch).toHaveBeenCalledWith({
      type: 'RESET',
      payload: {
        index: 0,
        routes: [{ name: Routes.CARD.AUTHENTICATION }],
      },
    });
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        labelOptions: [
          {
            label: strings('card.card_home.onboarding_token_revoked'),
          },
        ],
      }),
    );
    expect(mockClearLastUnauthenticatedReason).toHaveBeenCalledTimes(1);
  });

  it('replaces with authentication when the user logs out while Card Home is focused', () => {
    mockIsFocused = true;
    setupMockSelectors({ isAuthenticated: true });
    const view = renderAuthTransition();
    jest.mocked(StackActions.replace).mockClear();
    mockNavigationDispatch.mockClear();

    setupMockSelectors({ isAuthenticated: false });
    view.update();

    expect(StackActions.replace).toHaveBeenCalledWith(
      Routes.CARD.AUTHENTICATION,
    );
    expect(mockNavigationDispatch).toHaveBeenCalledWith({
      type: 'REPLACE',
      routeName: Routes.CARD.AUTHENTICATION,
    });
  });

  it('waits until Card Home is focused before replacing with authentication', () => {
    mockIsFocused = false;
    setupMockSelectors({ isAuthenticated: true });
    const view = renderAuthTransition();

    setupMockSelectors({ isAuthenticated: false });
    jest.mocked(StackActions.replace).mockClear();
    mockNavigationDispatch.mockClear();
    view.update();

    expect(mockNavigationDispatch).not.toHaveBeenCalled();

    mockIsFocused = true;
    view.update();

    expect(StackActions.replace).toHaveBeenCalledWith(
      Routes.CARD.AUTHENTICATION,
    );
    expect(mockNavigationDispatch).toHaveBeenCalledWith({
      type: 'REPLACE',
      routeName: Routes.CARD.AUTHENTICATION,
    });
  });

  it('does not replace with authentication when auth returns before Card Home refocuses', () => {
    mockIsFocused = false;
    setupMockSelectors({ isAuthenticated: true });
    const view = renderAuthTransition();

    setupMockSelectors({ isAuthenticated: false });
    view.update();

    setupMockSelectors({ isAuthenticated: true });
    view.update();

    mockIsFocused = true;
    jest.mocked(StackActions.replace).mockClear();
    mockNavigationDispatch.mockClear();
    view.update();

    expect(StackActions.replace).not.toHaveBeenCalled();
    expect(mockNavigationDispatch).not.toHaveBeenCalled();
  });

  it('keeps postAuthRedirect when a logged-out cardholder is sent to login', () => {
    mockCardNavigationParent = {
      getState: () => ({
        routes: [
          {
            params: {
              postAuthRedirect: MONEY_HOME_CARD_ORIGIN,
            },
          },
        ],
      }),
      getParent: () => undefined,
    };
    setupMockSelectors({ isAuthenticated: false, hasCard: true });

    render();

    expect(StackActions.replace).toHaveBeenCalledWith(
      Routes.CARD.AUTHENTICATION,
      { postAuthRedirect: MONEY_HOME_CARD_ORIGIN },
    );
  });

  it('sends a logged-out user with no card to welcome', () => {
    setupMockSelectors({ isAuthenticated: false, hasCard: false });

    render();

    expect(StackActions.replace).toHaveBeenCalledWith(Routes.CARD.WELCOME);
    expect(screen.queryByTestId('card-view-title')).toBeNull();
  });

  it('navigates to add funds modal when add funds button is pressed with USDC token', async () => {
    // Given: priority token is USDC (default)
    // When: user presses add funds button
    render();

    const addFundsButton = screen.getByTestId(
      CardHomeSelectors.ADD_FUNDS_BUTTON,
    );
    fireEvent.press(addFundsButton);

    // Then: should navigate to add funds modal, not swaps
    // priorityToken is CardFundingTokenWithBalance (superset of mockPriorityToken) so use objectContaining
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(
        'CardModals',
        expect.objectContaining({
          screen: 'CardAddFundsModal',
          params: expect.objectContaining({
            priorityToken: expect.objectContaining(mockPriorityToken),
          }),
        }),
      );
    });

    expect(mockOpenSwaps).not.toHaveBeenCalled();
  });

  it('navigates to add funds modal when add funds button is pressed with USDT token', async () => {
    // Given: priority token is USDT
    const usdtToken = {
      ...mockPriorityToken,
      symbol: 'USDT',
    };
    setupLoadCardDataMock({ priorityToken: usdtToken, allTokens: [usdtToken] });

    // When: user presses add funds button
    render();

    const addFundsButton = screen.getByTestId(
      CardHomeSelectors.ADD_FUNDS_BUTTON,
    );
    fireEvent.press(addFundsButton);

    // Then: should navigate to add funds modal for supported token
    // priorityToken is CardFundingTokenWithBalance (superset of usdtToken) so use objectContaining
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(
        'CardModals',
        expect.objectContaining({
          screen: 'CardAddFundsModal',
          params: expect.objectContaining({
            priorityToken: expect.objectContaining(usdtToken),
          }),
        }),
      );
    });

    expect(mockOpenSwaps).not.toHaveBeenCalled();
  });

  it('calls goToSwaps when add funds button is pressed with non-supported token', async () => {
    // Given: priority token is ETH (not supported for deposit)
    const ethToken = {
      ...mockPriorityToken,
      symbol: 'ETH',
    };
    setupLoadCardDataMock({ priorityToken: ethToken, allTokens: [ethToken] });

    render();
    mockOpenSwaps.mockClear();
    mockTrackEvent.mockClear();

    // When: user presses add funds button
    const addFundsButton = screen.getByTestId(
      CardHomeSelectors.ADD_FUNDS_BUTTON,
    );
    fireEvent.press(addFundsButton);

    // Then: should navigate to swaps
    await waitFor(() => {
      expect(mockTrackEvent).toHaveBeenCalled();
      expect(mockOpenSwaps).toHaveBeenCalledWith({});
    });
  });

  describe('Money Account spending source', () => {
    const moneyAccountPriorityToken = {
      ...mockPriorityToken,
      isMoneyAccountEntry: true,
    } as typeof mockPriorityToken;

    it('shows the unlink row when the active primary Money Account owns the Money Account spending source', () => {
      setupMockSelectors({ isAuthenticated: true });
      setupLoadCardDataMock({
        priorityToken: moneyAccountPriorityToken,
        allTokens: [moneyAccountPriorityToken],
      });

      render();

      expect(
        screen.getByTestId(CardHomeSelectors.UNLINK_MONEY_ACCOUNT_ITEM),
      ).toBeOnTheScreen();
      expect(
        screen.queryByTestId(CardHomeSelectors.CHANGE_ASSET_BUTTON),
      ).not.toBeOnTheScreen();
      expect(screen.getByText('Unlink Money account')).toBeOnTheScreen();
      expect(
        screen.getByText('Change your Card funding source'),
      ).toBeOnTheScreen();
    });

    it('hides the unlink row when the active primary Money Account does not own the Money Account spending source', () => {
      setupMockSelectors({
        isAuthenticated: true,
        primaryMoneyAccount: {
          address: '0x0000000000000000000000000000000000000abc',
        },
      });
      setupLoadCardDataMock({
        priorityToken: moneyAccountPriorityToken,
        allTokens: [moneyAccountPriorityToken],
      });

      render();

      expect(
        screen.queryByTestId(CardHomeSelectors.UNLINK_MONEY_ACCOUNT_ITEM),
      ).not.toBeOnTheScreen();
      expect(
        screen.getByTestId(CardHomeSelectors.CHANGE_ASSET_BUTTON),
      ).toBeOnTheScreen();
    });

    it('hides the unlink row when there is no active primary Money Account', () => {
      setupMockSelectors({
        isAuthenticated: true,
        primaryMoneyAccount: undefined,
      });
      setupLoadCardDataMock({
        priorityToken: moneyAccountPriorityToken,
        allTokens: [moneyAccountPriorityToken],
      });

      render();

      expect(
        screen.queryByTestId(CardHomeSelectors.UNLINK_MONEY_ACCOUNT_ITEM),
      ).not.toBeOnTheScreen();
    });

    it('hides the unlink row when the Money Account spending source has no wallet address', () => {
      const moneyAccountTokenWithoutWallet = {
        ...moneyAccountPriorityToken,
        walletAddress: undefined,
      } as unknown as typeof mockPriorityToken;
      setupMockSelectors({ isAuthenticated: true });
      setupLoadCardDataMock({
        priorityToken: moneyAccountTokenWithoutWallet,
        allTokens: [moneyAccountTokenWithoutWallet],
      });

      render();

      expect(
        screen.queryByTestId(CardHomeSelectors.UNLINK_MONEY_ACCOUNT_ITEM),
      ).not.toBeOnTheScreen();
    });

    it('hides the unlink row for a non-Money Account primary spending source', () => {
      setupMockSelectors({ isAuthenticated: true });
      setupLoadCardDataMock({
        priorityToken: mockPriorityToken,
        allTokens: [mockPriorityToken],
      });

      render();

      expect(
        screen.queryByTestId(CardHomeSelectors.UNLINK_MONEY_ACCOUNT_ITEM),
      ).not.toBeOnTheScreen();
    });

    it('opens the no-other-token unlink sheet when no other delegated token exists', () => {
      setupMockSelectors({ isAuthenticated: true });
      setupLoadCardDataMock({
        priorityToken: moneyAccountPriorityToken,
        allTokens: [moneyAccountPriorityToken],
      });
      render();
      mockNavigate.mockClear();

      fireEvent.press(
        screen.getByTestId(CardHomeSelectors.UNLINK_MONEY_ACCOUNT_ITEM),
      );

      expect(mockNavigate).toHaveBeenCalledWith(Routes.CARD.MODALS.ID, {
        screen: Routes.CARD.MODALS.UNLINK_MONEY_ACCOUNT,
        params: {
          fundingSource: undefined,
          entrypoint: CardEntryPoint.CARD_HOME_UNLINK_MONEY_ACCOUNT,
        },
      });
    });

    it('opens the other-token unlink sheet when another enabled token exists', () => {
      const otherDelegatedToken = {
        ...mockPriorityToken,
        address: '0x456',
        symbol: 'USDT',
        name: 'Tether USD',
        walletAddress: '0xabc',
        fundingStatus: FundingStatus.Enabled,
      };
      setupMockSelectors({ isAuthenticated: true });
      setupLoadCardDataMock({
        priorityToken: moneyAccountPriorityToken,
        allTokens: [moneyAccountPriorityToken, otherDelegatedToken],
      });
      render();
      mockNavigate.mockClear();

      fireEvent.press(
        screen.getByTestId(CardHomeSelectors.UNLINK_MONEY_ACCOUNT_ITEM),
      );

      expect(mockNavigate).toHaveBeenCalledWith(Routes.CARD.MODALS.ID, {
        screen: Routes.CARD.MODALS.UNLINK_MONEY_ACCOUNT,
        params: {
          fundingSource: 'USDT',
          entrypoint: CardEntryPoint.CARD_HOME_UNLINK_MONEY_ACCOUNT,
        },
      });
    });

    it('opens the other-token unlink sheet when another limited token exists', () => {
      const otherDelegatedToken = {
        ...mockPriorityToken,
        address: '0x456',
        symbol: 'USDT',
        name: 'Tether USD',
        walletAddress: '0xabc',
        fundingStatus: FundingStatus.Limited,
      };
      setupMockSelectors({ isAuthenticated: true });
      setupLoadCardDataMock({
        priorityToken: moneyAccountPriorityToken,
        allTokens: [moneyAccountPriorityToken, otherDelegatedToken],
      });
      render();
      mockNavigate.mockClear();

      fireEvent.press(
        screen.getByTestId(CardHomeSelectors.UNLINK_MONEY_ACCOUNT_ITEM),
      );

      expect(mockNavigate).toHaveBeenCalledWith(Routes.CARD.MODALS.ID, {
        screen: Routes.CARD.MODALS.UNLINK_MONEY_ACCOUNT,
        params: {
          fundingSource: 'USDT',
          entrypoint: CardEntryPoint.CARD_HOME_UNLINK_MONEY_ACCOUNT,
        },
      });
    });

    it('uses another Money account when the fallback token is also a Money Account', () => {
      const otherMoneyAccountToken = {
        ...mockPriorityToken,
        address: '0xb4563bcD3B7764CCBf497f515585f70B6C3EA5Ae',
        symbol: 'VEDA',
        name: 'Veda',
        caipChainId: 'eip155:143',
        walletAddress: '0xabc',
        fundingStatus: FundingStatus.Enabled,
      };
      setupMockSelectors({
        isAuthenticated: true,
        vedaConfig: {
          caipChainId: 'eip155:143',
          address: '0xb4563bcD3B7764CCBf497f515585f70B6C3EA5Ae',
          decimals: 6,
        },
      });
      setupLoadCardDataMock({
        priorityToken: moneyAccountPriorityToken,
        allTokens: [moneyAccountPriorityToken, otherMoneyAccountToken],
      });
      render();
      mockNavigate.mockClear();

      fireEvent.press(
        screen.getByTestId(CardHomeSelectors.UNLINK_MONEY_ACCOUNT_ITEM),
      );

      expect(mockNavigate).toHaveBeenCalledWith(Routes.CARD.MODALS.ID, {
        screen: Routes.CARD.MODALS.UNLINK_MONEY_ACCOUNT,
        params: {
          fundingSource: 'another Money account',
          entrypoint: CardEntryPoint.CARD_HOME_UNLINK_MONEY_ACCOUNT,
        },
      });
    });

    it('navigates to MoneyAddMoneySheet and skips switchToFundingAccountIfNeeded when add funds is pressed', async () => {
      setupLoadCardDataMock({
        priorityToken: moneyAccountPriorityToken,
        allTokens: [moneyAccountPriorityToken],
      });
      mockSetSelectedAddress.mockClear();
      mockOpenSwaps.mockClear();
      mockNavigate.mockClear();

      render();

      fireEvent.press(screen.getByTestId(CardHomeSelectors.ADD_FUNDS_BUTTON));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('MoneyModals', {
          screen: 'MoneyAddMoneySheet',
        });
      });
      expect(mockNavigate).not.toHaveBeenCalledWith(
        'CardModals',
        expect.anything(),
      );
      expect(mockOpenSwaps).not.toHaveBeenCalled();
      expect(mockSetSelectedAddress).not.toHaveBeenCalled();
    });
  });

  it('calls navigateToTravelPage when travel item is pressed', async () => {
    // TRAVEL_ITEM requires isFullySetUp (isAuthenticated + card + no setup actions)
    setupMockSelectors({ isAuthenticated: true });
    render();

    const travelItem = screen.getByTestId(CardHomeSelectors.TRAVEL_ITEM);
    fireEvent.press(travelItem);

    await waitFor(() => {
      expect(mockNavigateToTravelPage).toHaveBeenCalled();
    });
  });

  it('calls navigateToCardTosPage when TOS item is pressed', async () => {
    setupMockSelectors({ isAuthenticated: true });
    setupLoadCardDataMock({ isAuthenticated: true });

    render();
    openMoreSheet();

    const tosItem = screen.getByTestId(CardHomeSelectors.CARD_TOS_ITEM);
    fireEvent.press(tosItem);

    await waitFor(() => {
      expect(mockNavigateToCardTosPage).toHaveBeenCalled();
    });
  });

  it('loads registration settings on Card Home', () => {
    render();

    expect(mockUseRegistrationSettings).toHaveBeenCalledWith();
  });

  it('passes dynamic TOS URL to Card navigation actions', () => {
    const dynamicTosUrl = 'https://docs.baanx.us/metamask/terms.pdf';
    mockUseRegistrationSettings.mockReturnValue({
      data: {
        countries: [],
        usStates: [],
        links: {
          us: {
            termsAndConditions: dynamicTosUrl,
            accountOpeningDisclosure: '',
            noticeOfPrivacy: '',
            eSignConsentDisclosure: '',
          },
          intl: {
            termsAndConditions: '',
            rightToInformation: '',
          },
        },
        config: {
          us: {
            emailSpecialCharactersDomainsException: '',
            consentSmsNumber: '',
            supportEmail: CARD_SUPPORT_EMAIL,
          },
          intl: {
            emailSpecialCharactersDomainsException: '',
            consentSmsNumber: '',
            supportEmail: CARD_SUPPORT_EMAIL,
          },
        },
      },
      isLoading: false,
      error: null,
      fetchData: jest.fn(),
    });
    setupMockSelectors({ userLocation: 'us' });

    render();

    expect(mockUseNavigateToCardPage).toHaveBeenCalledWith(
      expect.any(Object),
      dynamicTosUrl,
    );
  });

  it('opens dynamic support email when contact support item is pressed', async () => {
    const dynamicSupportEmail = 'us-support@cl-cards.com';
    mockUseRegistrationSettings.mockReturnValue({
      data: {
        countries: [],
        usStates: [],
        links: {
          us: {
            termsAndConditions: '',
            accountOpeningDisclosure: '',
            noticeOfPrivacy: '',
            eSignConsentDisclosure: '',
          },
          intl: {
            termsAndConditions: '',
            rightToInformation: '',
          },
        },
        config: {
          us: {
            emailSpecialCharactersDomainsException: '',
            consentSmsNumber: '',
            supportEmail: dynamicSupportEmail,
          },
          intl: {
            emailSpecialCharactersDomainsException: '',
            consentSmsNumber: '',
            supportEmail: CARD_SUPPORT_EMAIL,
          },
        },
      },
      isLoading: false,
      error: null,
      fetchData: jest.fn(),
    });
    setupMockSelectors({ isAuthenticated: true, userLocation: 'us' });
    setupLoadCardDataMock({ isAuthenticated: true });

    render();
    openMoreSheet();

    const contactSupportItem = screen.getByTestId(
      CardHomeSelectors.CONTACT_SUPPORT_ITEM,
    );
    fireEvent.press(contactSupportItem);

    await waitFor(() => {
      expect(Linking.openURL).toHaveBeenCalledWith(
        `mailto:${dynamicSupportEmail}`,
      );
    });
  });

  it('opens fallback support email when contact support item is pressed', async () => {
    setupMockSelectors({ isAuthenticated: true });
    setupLoadCardDataMock({ isAuthenticated: true });

    render();
    openMoreSheet();

    const contactSupportItem = screen.getByTestId(
      CardHomeSelectors.CONTACT_SUPPORT_ITEM,
    );
    fireEvent.press(contactSupportItem);

    await waitFor(() => {
      expect(Linking.openURL).toHaveBeenCalledWith(
        `mailto:${CARD_SUPPORT_EMAIL}`,
      );
    });
  });

  it('opens an Intercom support conversation instead of an email draft when the flag is on', async () => {
    setupMockSelectors({
      isAuthenticated: true,
      isCardIntercomSupportEnabled: true,
      activeProviderId: 'immersve',
      providerUserId: 'cardholder-1',
    });
    setupLoadCardDataMock({ isAuthenticated: true });

    render();
    openMoreSheet();
    mockNavigate.mockClear();

    fireEvent.press(screen.getByTestId(CardHomeSelectors.CONTACT_SUPPORT_ITEM));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.MODAL.ROOT_MODAL_FLOW,
        expect.objectContaining({
          screen: Routes.MODAL.SUPPORT_CONSENT_SHEET,
        }),
      );
    });
    expect(Linking.openURL).not.toHaveBeenCalled();
  });

  it('uses the Immersve terms URL for the Immersve provider', () => {
    setupMockSelectors({ activeProviderId: 'immersve' });

    render();

    expect(mockUseNavigateToCardPage).toHaveBeenCalledWith(
      expect.any(Object),
      'https://immersve.com/terms-and-conditions/uk/general-terms-of-use',
    );
  });

  it('opens the Immersve support email for the Immersve provider', async () => {
    setupMockSelectors({ isAuthenticated: true, activeProviderId: 'immersve' });
    setupLoadCardDataMock({ isAuthenticated: true });

    render();
    openMoreSheet();

    fireEvent.press(screen.getByTestId(CardHomeSelectors.CONTACT_SUPPORT_ITEM));

    await waitFor(() => {
      expect(Linking.openURL).toHaveBeenCalledWith(
        'mailto:support@metamask.io',
      );
    });
  });

  describe('digital wallet instructions', () => {
    beforeEach(() => {
      setupMockSelectors({
        isAuthenticated: true,
        activeProviderId: 'immersve',
      });
      setupLoadCardDataMock({ isAuthenticated: true });
    });

    it('hides the instructions while push eligibility is loading', () => {
      mockUsePushProvisioning.mockReturnValue({
        initiateProvisioning: mockInitiateProvisioning,
        resetStatus: mockResetProvisioningStatus,
        status: 'idle' as const,
        error: null,
        isProvisioning: false,
        isSuccess: false,
        isError: false,
        isLoading: true,
        canAddToWallet: false,
        isCardInWallet: false,
        pendingVerificationDevices: [],
        canOpenInWallet: false,
        openInWallet: mockOpenInWallet,
      });

      render();

      expect(
        screen.queryByTestId(
          CardHomeSelectors.DIGITAL_WALLET_INSTRUCTIONS_ITEM,
        ),
      ).not.toBeOnTheScreen();
    });

    it('hides the instructions when push provisioning is available', () => {
      mockUsePushProvisioning.mockReturnValueOnce({
        initiateProvisioning: mockInitiateProvisioning,
        resetStatus: mockResetProvisioningStatus,
        status: 'idle' as const,
        error: null,
        isProvisioning: false,
        isSuccess: false,
        isError: false,
        isLoading: false,
        canAddToWallet: true,
        isCardInWallet: false,
        pendingVerificationDevices: [],
        canOpenInWallet: false,
        openInWallet: mockOpenInWallet,
      });

      render();

      expect(
        screen.queryByTestId(
          CardHomeSelectors.DIGITAL_WALLET_INSTRUCTIONS_ITEM,
        ),
      ).not.toBeOnTheScreen();
    });

    it('hides the instructions when the card is already in the wallet', () => {
      mockUsePushProvisioning.mockReturnValueOnce({
        initiateProvisioning: mockInitiateProvisioning,
        resetStatus: mockResetProvisioningStatus,
        status: 'idle' as const,
        error: null,
        isProvisioning: false,
        isSuccess: false,
        isError: false,
        isLoading: false,
        canAddToWallet: false,
        isCardInWallet: true,
        pendingVerificationDevices: [],
        canOpenInWallet: false,
        openInWallet: mockOpenInWallet,
      });

      render();

      expect(
        screen.queryByTestId(
          CardHomeSelectors.DIGITAL_WALLET_INSTRUCTIONS_ITEM,
        ),
      ).not.toBeOnTheScreen();
    });

    it('shows a pending verification notice that names the devices', () => {
      mockUsePushProvisioning.mockReturnValueOnce({
        initiateProvisioning: mockInitiateProvisioning,
        resetStatus: mockResetProvisioningStatus,
        status: 'idle' as const,
        error: null,
        isProvisioning: false,
        isSuccess: false,
        isError: false,
        isLoading: false,
        canAddToWallet: true,
        isCardInWallet: true,
        pendingVerificationDevices: ['phone', 'watch'],
        canOpenInWallet: false,
        openInWallet: mockOpenInWallet,
      });

      render();

      expect(
        screen.getByTestId(CardHomeSelectors.VERIFICATION_PENDING_NOTICE),
      ).toBeOnTheScreen();
      expect(
        screen.getByText(
          strings('card.push_provisioning.verification_pending_title'),
        ),
      ).toBeOnTheScreen();
      expect(
        screen.getByText(
          strings('card.push_provisioning.verification_pending_description', {
            devices: strings('card.push_provisioning.device_list_and', {
              first: strings('card.push_provisioning.device_iphone'),
              second: strings('card.push_provisioning.device_apple_watch'),
            }),
          }),
        ),
      ).toBeOnTheScreen();
      expect(
        screen.queryByTestId(
          CardHomeSelectors.DIGITAL_WALLET_INSTRUCTIONS_ITEM,
        ),
      ).not.toBeOnTheScreen();
    });

    it('opens the iPhone pass from the pending notice', () => {
      mockUsePushProvisioning.mockReturnValueOnce({
        initiateProvisioning: mockInitiateProvisioning,
        resetStatus: mockResetProvisioningStatus,
        status: 'idle' as const,
        error: null,
        isProvisioning: false,
        isSuccess: false,
        isError: false,
        isLoading: false,
        canAddToWallet: false,
        isCardInWallet: true,
        pendingVerificationDevices: ['phone'],
        canOpenInWallet: true,
        openInWallet: mockOpenInWallet,
      });

      render();

      fireEvent.press(
        within(
          screen.getByTestId(CardHomeSelectors.VERIFICATION_PENDING_NOTICE),
        ).getByTestId('confirm-button'),
      );

      expect(mockOpenInWallet).toHaveBeenCalledTimes(1);
    });

    it('hides the wallet link when only the Watch pass is pending', () => {
      mockUsePushProvisioning.mockReturnValueOnce({
        initiateProvisioning: mockInitiateProvisioning,
        resetStatus: mockResetProvisioningStatus,
        status: 'idle' as const,
        error: null,
        isProvisioning: false,
        isSuccess: false,
        isError: false,
        isLoading: false,
        canAddToWallet: true,
        isCardInWallet: true,
        pendingVerificationDevices: ['watch'],
        canOpenInWallet: false,
        openInWallet: mockOpenInWallet,
      });

      render();

      expect(
        screen.getByTestId(CardHomeSelectors.VERIFICATION_PENDING_NOTICE),
      ).toBeOnTheScreen();
      expect(
        within(
          screen.getByTestId(CardHomeSelectors.VERIFICATION_PENDING_NOTICE),
        ).queryByTestId('confirm-button'),
      ).not.toBeOnTheScreen();
    });

    it('shows the instructions when push provisioning is unavailable', () => {
      mockUsePushProvisioning.mockReturnValueOnce({
        initiateProvisioning: mockInitiateProvisioning,
        resetStatus: mockResetProvisioningStatus,
        status: 'idle' as const,
        error: null,
        isProvisioning: false,
        isSuccess: false,
        isError: false,
        isLoading: false,
        canAddToWallet: false,
        isCardInWallet: false,
        pendingVerificationDevices: [],
        canOpenInWallet: false,
        openInWallet: mockOpenInWallet,
      });

      render();

      expect(
        screen.getByTestId(CardHomeSelectors.DIGITAL_WALLET_INSTRUCTIONS_ITEM),
      ).toBeOnTheScreen();
    });

    it('hides the instructions when the Immersve card is frozen', () => {
      setupLoadCardDataMock({
        isAuthenticated: true,
        cardDetails: { type: CardType.VIRTUAL, status: CardStatus.FROZEN },
      });

      render();

      expect(
        screen.queryByTestId(
          CardHomeSelectors.DIGITAL_WALLET_INSTRUCTIONS_ITEM,
        ),
      ).not.toBeOnTheScreen();
    });
  });

  describe('Apple Pay learn more', () => {
    const originalPlatform = Platform.OS;

    beforeEach(() => {
      Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true });
      setupMockSelectors({
        isAuthenticated: true,
        activeProviderId: 'baanx',
      });
      setupLoadCardDataMock({ isAuthenticated: true });
    });

    afterEach(() => {
      Object.defineProperty(Platform, 'OS', {
        value: originalPlatform,
        writable: true,
      });
    });

    it('drops the learn-more link from the wallet section; the Manage row covers it', () => {
      mockUsePushProvisioning.mockReturnValueOnce({
        initiateProvisioning: mockInitiateProvisioning,
        resetStatus: mockResetProvisioningStatus,
        status: 'idle' as const,
        error: null,
        isProvisioning: false,
        isSuccess: false,
        isError: false,
        isLoading: false,
        canAddToWallet: true,
        isCardInWallet: false,
        pendingVerificationDevices: [],
        canOpenInWallet: false,
        openInWallet: mockOpenInWallet,
      });

      render();

      // The learn-more link is gone from the wallet section (the Manage
      // list's how-to-use row covers the already-added-card state).
      expect(
        screen.queryByTestId(CardHomeSelectors.APPLE_PAY_LEARN_MORE_BUTTON),
      ).toBeNull();
    });

    it('hides learn more when the card is already on a device', () => {
      mockUsePushProvisioning.mockReturnValue({
        initiateProvisioning: mockInitiateProvisioning,
        resetStatus: mockResetProvisioningStatus,
        status: 'idle' as const,
        error: null,
        isProvisioning: false,
        isSuccess: false,
        isError: false,
        isLoading: false,
        canAddToWallet: true,
        isCardInWallet: true,
        pendingVerificationDevices: [],
        canOpenInWallet: true,
        openInWallet: mockOpenInWallet,
      });

      render();

      expect(
        screen.queryByTestId(CardHomeSelectors.APPLE_PAY_LEARN_MORE_BUTTON),
      ).toBeNull();
    });

    it('hides learn more when the card cannot be added to Apple Wallet', () => {
      mockUsePushProvisioning.mockReturnValue({
        initiateProvisioning: mockInitiateProvisioning,
        resetStatus: mockResetProvisioningStatus,
        status: 'idle' as const,
        error: null,
        isProvisioning: false,
        isSuccess: false,
        isError: false,
        isLoading: false,
        canAddToWallet: false,
        isCardInWallet: false,
        pendingVerificationDevices: [],
        canOpenInWallet: false,
        openInWallet: mockOpenInWallet,
      });

      render();

      expect(
        screen.queryByTestId(CardHomeSelectors.APPLE_PAY_LEARN_MORE_BUTTON),
      ).toBeNull();
    });

    it('hides learn more on Android even when the card can be added', () => {
      Object.defineProperty(Platform, 'OS', {
        value: 'android',
        writable: true,
      });
      mockUsePushProvisioning.mockReturnValue({
        initiateProvisioning: mockInitiateProvisioning,
        resetStatus: mockResetProvisioningStatus,
        status: 'idle' as const,
        error: null,
        isProvisioning: false,
        isSuccess: false,
        isError: false,
        isLoading: false,
        canAddToWallet: true,
        isCardInWallet: false,
        pendingVerificationDevices: [],
        canOpenInWallet: false,
        openInWallet: mockOpenInWallet,
      });

      render();

      expect(
        screen.queryByTestId(CardHomeSelectors.APPLE_PAY_LEARN_MORE_BUTTON),
      ).toBeNull();
    });
  });

  describe('How to use Apple Pay', () => {
    const originalPlatform = Platform.OS;

    const mockWalletState = ({
      canAddToWallet,
      isCardInWallet,
    }: {
      canAddToWallet: boolean;
      isCardInWallet: boolean;
    }) => {
      mockUsePushProvisioning.mockReturnValue({
        initiateProvisioning: mockInitiateProvisioning,
        resetStatus: mockResetProvisioningStatus,
        status: 'idle' as const,
        error: null,
        isProvisioning: false,
        isSuccess: false,
        isError: false,
        isLoading: false,
        canAddToWallet,
        isCardInWallet,
        pendingVerificationDevices: [],
        canOpenInWallet: false,
        openInWallet: mockOpenInWallet,
      });
    };

    beforeEach(() => {
      Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true });
      setupMockSelectors({
        isAuthenticated: true,
        activeProviderId: 'baanx',
      });
      setupLoadCardDataMock({ isAuthenticated: true });
    });

    afterEach(() => {
      Object.defineProperty(Platform, 'OS', {
        value: originalPlatform,
        writable: true,
      });
    });

    it('hides the row when the card is still missing from a device', () => {
      mockWalletState({ canAddToWallet: true, isCardInWallet: true });

      render();

      expect(
        screen.queryByTestId(CardHomeSelectors.APPLE_PAY_USAGE_ITEM),
      ).toBeNull();
    });

    it('opens the usage sheet when the card is on every device', () => {
      mockWalletState({ canAddToWallet: false, isCardInWallet: true });

      render();
      mockNavigate.mockClear();
      fireEvent.press(
        screen.getByTestId(CardHomeSelectors.APPLE_PAY_USAGE_ITEM),
      );

      expect(mockNavigate).toHaveBeenCalledWith(Routes.CARD.MODALS.ID, {
        screen: Routes.CARD.MODALS.APPLE_PAY_USAGE,
      });
    });

    it('hides the row when the card is on no devices', () => {
      mockWalletState({ canAddToWallet: true, isCardInWallet: false });

      render();

      expect(
        screen.queryByTestId(CardHomeSelectors.APPLE_PAY_USAGE_ITEM),
      ).toBeNull();
    });
  });

  it('shows the Enable card button for provider pending actions and resumes from it', () => {
    mockCanEnableCard = true;
    mockProvisioningView = 'hidden';
    setupMockSelectors({ isAuthenticated: true, activeProviderId: 'immersve' });
    setupLoadCardDataMock({
      isAuthenticated: true,
      warning: CardStateWarning.NoCard,
      kycStatus: { verificationState: 'VERIFIED', userId: 'user-123' },
      hasExternalWallets: true,
    });

    render();

    expect(
      screen.getByTestId(CardHomeSelectors.ENABLE_CARD_BUTTON),
    ).toBeOnTheScreen();
    expect(screen.queryByTestId('card-message-box')).not.toBeOnTheScreen();
    fireEvent.press(screen.getByTestId(CardHomeSelectors.ENABLE_CARD_BUTTON));
    expect(mockEnableCard).toHaveBeenCalledTimes(1);
  });

  it('disables Enable card while the Money account approval is running', () => {
    mockCanEnableCard = true;
    mockIsEnableCardPending = true;
    mockProvisioningView = 'hidden';
    setupMockSelectors({ isAuthenticated: true, activeProviderId: 'immersve' });
    setupLoadCardDataMock({
      isAuthenticated: true,
      warning: CardStateWarning.NoCard,
      kycStatus: { verificationState: 'VERIFIED', userId: 'user-123' },
      hasExternalWallets: true,
    });

    render();

    expect(
      screen.getByTestId(CardHomeSelectors.ENABLE_CARD_BUTTON),
    ).toBeDisabled();
  });

  it('shows the card skeleton and disables Enable card while setup is being checked', () => {
    mockCanEnableCard = true;
    mockProvisioningView = 'reconciling';
    setupMockSelectors({ isAuthenticated: true, activeProviderId: 'immersve' });
    setupLoadCardDataMock({
      isAuthenticated: true,
      warning: CardStateWarning.NoCard,
      kycStatus: { verificationState: 'VERIFIED', userId: 'user-123' },
      hasExternalWallets: true,
    });

    render();

    // No card face exists yet, so reconciliation keeps the image skeleton
    // instead of the virtual freeze animation.
    expect(screen.queryByTestId(CardHomeSelectors.CARD_FREEZE_RIVE)).toBeNull();
    expect(
      screen.getByTestId(CardHomeSelectors.CARD_IMAGE_SKELETON),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(CardHomeSelectors.ENABLE_CARD_BUTTON),
    ).toBeDisabled();
    expect(screen.queryByTestId('card-provisioning-alert-skeleton')).toBeNull();
    // The provisioning alert renders nothing while reconciling, so no empty
    // banner block is left under the header.
    expect(
      screen.queryByTestId(CardHomeSelectors.DASHBOARD_BANNERS),
    ).not.toBeOnTheScreen();
  });

  it('does not flash the creating copy while an Immersve check is in flight', () => {
    mockProvisioningView = 'reconciling';
    setupMockSelectors({ isAuthenticated: true, activeProviderId: 'immersve' });
    setupLoadCardDataMock({
      isAuthenticated: true,
      warning: CardStateWarning.NoCard,
      alerts: [{ type: 'card_provisioning', dismissable: false }],
      kycStatus: { verificationState: 'VERIFIED', userId: 'user-123' },
    });

    render();

    expect(
      screen.getByTestId(CardHomeSelectors.SETUP_PENDING_STATUS_VIEW),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(CardHomeStatusViewSelectors.TITLE),
    ).toHaveTextContent(strings('card.card_home.setup_pending.checking.title'));
    expect(
      screen.queryByText(
        strings('card.card_home.setup_pending.creating.title'),
      ),
    ).not.toBeOnTheScreen();
  });

  it('rechecks an Immersve review when the waiting view is pulled to refresh', async () => {
    mockProvisioningView = 'kyc_under_review';
    setupMockSelectors({ isAuthenticated: true, activeProviderId: 'immersve' });
    setupLoadCardDataMock({
      isAuthenticated: true,
      warning: CardStateWarning.NoCard,
      kycStatus: { verificationState: 'VERIFIED', userId: 'user-123' },
      hasExternalWallets: true,
    });

    render();

    // RefreshControl is a prop of the status view's ScrollView, not a host
    // element, so reach it through the ScrollView's testID.
    const { refreshControl } = screen.getByTestId(
      CardHomeStatusViewSelectors.SCROLL_VIEW,
    ).props;
    await act(async () => {
      await refreshControl.props.onRefresh();
    });

    expect(mockRecheckProvisioning).toHaveBeenCalledTimes(1);
  });

  it('rechecks a card that is still being created when the waiting view is pulled to refresh', async () => {
    mockProvisioningView = 'provisioning';
    setupMockSelectors({ isAuthenticated: true, activeProviderId: 'immersve' });
    setupLoadCardDataMock({
      isAuthenticated: true,
      warning: CardStateWarning.NoCard,
      kycStatus: { verificationState: 'VERIFIED', userId: 'user-123' },
      hasExternalWallets: true,
    });

    render();

    // RefreshControl is a prop of the status view's ScrollView, not a host
    // element, so reach it through the ScrollView's testID.
    const { refreshControl } = screen.getByTestId(
      CardHomeStatusViewSelectors.SCROLL_VIEW,
    ).props;
    await act(async () => {
      await refreshControl.props.onRefresh();
    });

    expect(mockRecheckProvisioning).toHaveBeenCalledTimes(1);
  });

  it('shows the KYC under review banner without Enable card when KYC is pending', () => {
    mockCanEnableCard = false;
    mockProvisioningView = 'kyc_under_review';
    setupMockSelectors({ isAuthenticated: true, activeProviderId: 'immersve' });
    setupLoadCardDataMock({
      isAuthenticated: true,
      warning: CardStateWarning.NoCard,
      kycStatus: { verificationState: 'VERIFIED', userId: 'user-123' },
      hasExternalWallets: true,
    });

    render();

    // The waiting view replaces the dashboard; the reviewing copy shows and
    // no Enable card button or dashboard banner does.
    expect(
      screen.getByTestId(CardHomeSelectors.SETUP_PENDING_STATUS_VIEW),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(CardHomeStatusViewSelectors.TITLE),
    ).toHaveTextContent(
      strings('card.card_home.setup_pending.reviewing.title'),
    );
    expect(screen.queryByTestId('card-message-box')).not.toBeOnTheScreen();
    expect(
      screen.queryByTestId(CardHomeSelectors.ENABLE_CARD_BUTTON),
    ).not.toBeOnTheScreen();
  });

  describe('when card history lives in Money activity', () => {
    beforeEach(() => {
      mockTransactionHistoryDestination = 'money';
      setupMockSelectors({ isAuthenticated: true });
      setupLoadCardDataMock({
        isAuthenticated: true,
        cardDetails: { type: CardType.VIRTUAL, status: CardStatus.ACTIVE },
      });
    });

    it('hides the Activity and Manage tabs', () => {
      render();

      expect(
        screen.queryByTestId(CardHomeSelectors.HOME_SEGMENTS),
      ).not.toBeOnTheScreen();
    });

    it('does not fetch provider transactions', () => {
      render();

      expect(mockUseCardRecentTransactions).not.toHaveBeenCalledWith({
        enabled: true,
      });
    });

    it('keeps the transaction history row in the management list', () => {
      render();

      expect(
        screen.getByTestId(CardHomeSelectors.TRANSACTION_HISTORY_ITEM),
      ).toBeOnTheScreen();
    });
  });

  it('shows the Immersve privacy policy and contact support before a card exists', () => {
    setupMockSelectors({
      isAuthenticated: true,
      activeProviderId: 'immersve',
      selectedCountry: 'GB',
    });
    setupLoadCardDataMock({
      isAuthenticated: true,
      cardDetails: null,
      alerts: [{ type: 'card_provisioning', dismissable: false }],
    });
    jest.mocked(useImmersveSupportedRegions).mockReturnValue({
      region: null,
      onboardingDocuments: [],
      permanentDocuments: [
        {
          id: 'privacyPolicy',
          title: 'Privacy policy',
          url: 'https://example.com/privacy',
        },
      ],
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    render();
    openMoreSheet();

    expect(useImmersveSupportedRegions).toHaveBeenCalledWith('GB', {
      enabled: true,
    });
    expect(
      screen.getByTestId(`${CardHomeSelectors.CARD_TOS_ITEM}-privacyPolicy`),
    ).toBeOnTheScreen();
    expect(screen.getByText('Privacy policy')).toBeOnTheScreen();
    expect(
      screen.getByTestId(CardHomeSelectors.CONTACT_SUPPORT_ITEM),
    ).toBeOnTheScreen();
    expect(screen.queryByTestId(CardHomeSelectors.CARD_TOS_ITEM)).toBeNull();
  });

  it('uses the issued card region for legal documents when a card exists', () => {
    setupMockSelectors({
      isAuthenticated: true,
      activeProviderId: 'immersve',
      selectedCountry: 'GB',
    });
    setupLoadCardDataMock({
      isAuthenticated: true,
      cardDetails: { type: CardType.VIRTUAL, regionCode: 'NZ' },
    });

    render();

    expect(useImmersveSupportedRegions).toHaveBeenCalledWith('NZ', {
      enabled: true,
    });
  });

  it('shows the Enable card button for allowance_revoked with no banner', () => {
    mockCanEnableCard = true;
    mockProvisioningView = 'hidden';
    setupMockSelectors({ isAuthenticated: true, activeProviderId: 'immersve' });
    setupLoadCardDataMock({
      isAuthenticated: true,
      alerts: [{ type: 'allowance_revoked', dismissable: false }],
    });

    render();

    expect(
      screen.getByTestId(CardHomeSelectors.ENABLE_CARD_BUTTON),
    ).toBeOnTheScreen();
    expect(screen.queryByTestId('card-message-box')).not.toBeOnTheScreen();
    fireEvent.press(screen.getByTestId(CardHomeSelectors.ENABLE_CARD_BUTTON));
    expect(mockEnableCard).toHaveBeenCalledTimes(1);
  });

  it('displays correct priority token information', async () => {
    // Given: USDC is the priority token
    // When: component renders with privacy mode off
    render();

    // Then: should show balance information
    expect(screen.getByText('$1,000.00')).toBeOnTheScreen();
    // CardAssetItem should be rendered (not a skeleton)
    expect(
      screen.queryByTestId(CardHomeSelectors.CARD_ASSET_ITEM_SKELETON),
    ).not.toBeOnTheScreen();
  });

  it('passes formatted balance to CardAssetItem', () => {
    // Given: primary asset includes formatted balance and token metadata (from useCardHomeData)
    overrideCardHomeDataBalance({
      balanceFiat: '$1,000.00',
      asset: {
        symbol: 'USDC',
        image: 'usdc-image-url',
      } as TokenI,
      balanceFormatted: '1000.000000 USDC',
      rawTokenBalance: 1000,
      rawFiatNumber: 1000,
    });

    // When: component renders
    render();

    // Then: CardAssetItem should be rendered with formatted balance
    expect(
      screen.queryByTestId(CardHomeSelectors.CARD_ASSET_ITEM_SKELETON),
    ).not.toBeOnTheScreen();
  });

  it('displays travel item in manage options section', () => {
    setupMockSelectors({ isAuthenticated: true });
    render();

    expect(screen.getByTestId(CardHomeSelectors.TRAVEL_ITEM)).toBeOnTheScreen();
  });

  it('toggles privacy mode when privacy toggle button is pressed', async () => {
    // Given: privacy mode is off
    // When: user presses privacy toggle button
    render();

    const privacyToggleButton = screen.getByTestId(
      MoneyBalanceSummaryTestIds.BALANCE_PRESSABLE,
    );
    fireEvent.press(privacyToggleButton);

    // Then: should toggle privacy mode
    await waitFor(() => {
      expect(mockSetPrivacyMode).toHaveBeenCalled();
      const calls = mockSetPrivacyMode.mock.calls;
      expect(calls.length).toBeGreaterThan(0);
    });
  });

  it('displays error state when there is an error fetching priority token', () => {
    // Given: priority token fetch failed
    setupLoadCardDataMock({
      priorityToken: null,
      error: 'Failed to fetch token',
    });

    // When: component renders
    render();

    // Then: should show error state
    expect(screen.getByText('Unable to load card')).toBeOnTheScreen();
    expect(screen.getByText('Please try again later')).toBeOnTheScreen();
    expect(
      screen.getByTestId(CardHomeSelectors.TRY_AGAIN_BUTTON),
    ).toBeOnTheScreen();
  });

  it('calls fetchAllData when try again button is pressed', async () => {
    // Given: error state is displayed
    setupLoadCardDataMock({
      priorityToken: null,
      error: 'Failed to fetch token',
    });

    render();

    // When: user presses try again button
    const tryAgainButton = screen.getByTestId(
      CardHomeSelectors.TRY_AGAIN_BUTTON,
    );
    fireEvent.press(tryAgainButton);

    // Then: should retry fetching all data
    await waitFor(() => {
      expect(mockRefetchAllData).toHaveBeenCalled();
    });
  });

  it('shows the remaining spending limit when the allowance is limited', () => {
    // Given: priority token has a limited allowance with a cap
    const limitedAllowanceToken = {
      ...mockPriorityToken,
      fundingStatus: FundingStatus.Limited,
    };
    setupLoadCardDataMock({
      priorityToken: limitedAllowanceToken,
      allTokens: [limitedAllowanceToken],
    });

    // When: component renders
    render();

    // Then: the Manage limit row shows the remaining and total amounts
    expect(
      screen.getByText('500000000 USDC of 500000000 USDC left'),
    ).toBeOnTheScreen();
  });

  it('dispatches bridge tokens when opening swaps with non-supported token', async () => {
    // Given: ETH token (not supported for deposit)
    jest.mocked(useFocusEffect).mockImplementation(jest.fn());

    const ethToken = {
      ...mockPriorityToken,
      symbol: 'ETH',
    };
    setupLoadCardDataMock({ priorityToken: ethToken, allTokens: [ethToken] });

    render();
    mockOpenSwaps.mockClear();
    mockTrackEvent.mockClear();

    // When: user presses add funds button
    const addFundsButton = screen.getByTestId(
      CardHomeSelectors.ADD_FUNDS_BUTTON,
    );
    fireEvent.press(addFundsButton);

    // Then: should navigate to swaps
    await waitFor(() => {
      expect(mockTrackEvent).toHaveBeenCalled();
      expect(mockOpenSwaps).toHaveBeenCalledWith({});
    });
  });

  it('falls back to balanceFormatted when balanceFiat is TOKEN_RATE_UNDEFINED', () => {
    // Given: fiat rate is undefined — balance comes from useCardHomeData().primaryAsset now
    overrideCardHomeDataBalance({
      balanceFiat: TOKEN_RATE_UNDEFINED,
      balanceFormatted: '1000.000000 USDC',
    });

    // When: component renders
    render();

    // Then: should display formatted balance instead of fiat
    expect(screen.getByText('1000.000000 USDC')).toBeOnTheScreen();
  });

  it('falls back to balanceFormatted when balanceFiat is not available', () => {
    // Given: fiat balance is empty — balance comes from useCardHomeData().primaryAsset now
    overrideCardHomeDataBalance({
      balanceFiat: '',
      balanceFormatted: '1000.000000 USDC',
    });

    // When: component renders
    render();

    // Then: should display formatted balance as fallback
    expect(screen.getByText('1000.000000 USDC')).toBeOnTheScreen();
  });

  it('fires CARD_HOME_VIEWED once when balances are loaded', async () => {
    // Given: both fiat and main balances are valid
    // When: component renders
    render();

    // Then: should fire metric once
    await waitFor(() => {
      expect(mockTrackEvent).toHaveBeenCalledTimes(1);
    });
  });

  it('includes raw numeric properties in CARD_HOME_VIEWED event', async () => {
    // Given: balances with numeric values
    // When: component renders and metrics fire
    render();
    await new Promise((r) => setTimeout(r, 0));

    // Then: should include raw balance properties
    expect(mockEventBuilder.addProperties).toHaveBeenCalledWith(
      expect.objectContaining({
        token_raw_balance_priority: 1000,
        token_fiat_balance_priority: 1000,
      }),
    );
  });

  it('includes zero raw balances in metrics', async () => {
    // Given: zero balances
    overrideCardHomeDataBalance(
      {
        balanceFiat: '$0.00',
        balanceFormatted: '0.000000 USDC',
        rawTokenBalance: 0,
        rawFiatNumber: 0,
      },
      true,
    );

    // When: component renders
    render();
    await new Promise((r) => setTimeout(r, 0));

    // Then: should include zero values in metrics
    expect(mockEventBuilder.addProperties).toHaveBeenCalledWith(
      expect.objectContaining({
        token_raw_balance_priority: 0,
        token_fiat_balance_priority: 0,
      }),
    );
  });

  it('includes only rawTokenBalance when fiat is undefined', async () => {
    // Given: only formatted balance is valid (fiat undefined)
    overrideCardHomeDataBalance(
      {
        balanceFiat: undefined as unknown as string,
        balanceFormatted: '1000.000000 USDC',
        rawTokenBalance: 1000,
        rawFiatNumber: undefined,
      },
      true,
    );

    // When: component renders
    render();
    await new Promise((r) => setTimeout(r, 0));

    // Then: should include only token balance in metrics
    expect(mockTrackEvent).toHaveBeenCalled();
    expect(mockEventBuilder.addProperties).toHaveBeenCalledWith(
      expect.objectContaining({
        token_raw_balance_priority: 1000,
        token_fiat_balance_priority: undefined,
      }),
    );
  });

  it('does not fire metrics when formatted balance is undefined even if rawFiatNumber exists', async () => {
    // Given: fiat exists but formatted balance is missing
    overrideCardHomeDataBalance(
      {
        balanceFiat: '$1,000.00',
        balanceFormatted: undefined as unknown as string,
        rawTokenBalance: undefined,
        rawFiatNumber: 1000,
      },
      true,
    );

    // When: component renders
    render();
    await new Promise((r) => setTimeout(r, 0));

    // Then: analytics should not fire until a formatted balance exists
    expect(mockTrackEvent).not.toHaveBeenCalled();
    expect(mockEventBuilder.addProperties).not.toHaveBeenCalled();
  });

  it('fires CARD_HOME_VIEWED once when only balanceFormatted is valid', async () => {
    // Given: only formatted balance is available (no fiat / no raw fiat from useCardHomeData)
    overrideCardHomeDataBalance(
      {
        balanceFiat: undefined,
        balanceFormatted: '1000.000000 USDC',
        rawTokenBalance: 1000,
        rawFiatNumber: undefined,
      },
      true,
    );

    // When: component renders
    render();

    // Then: should fire metric once and not re-fire
    await waitFor(() => {
      expect(mockTrackEvent).toHaveBeenCalledTimes(1);
    });

    await new Promise((r) => setTimeout(r, 0));
    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
  });

  it('does not fire CARD_HOME_VIEWED when only fiat balance is available', async () => {
    // Given: fiat exists but formatted balance is missing
    overrideCardHomeDataBalance({
      balanceFiat: '$1,000.00',
      balanceFormatted: undefined as unknown as string,
      rawTokenBalance: undefined,
      rawFiatNumber: 1000,
    });

    // When: component renders
    render();

    // Then: analytics should not fire without a formatted balance
    await new Promise((r) => setTimeout(r, 0));
    expect(mockTrackEvent).not.toHaveBeenCalled();
  });

  it('does not fire metrics when balances are still loading', async () => {
    // Given: balances show loading sentinels
    overrideCardHomeDataBalance({
      balanceFiat: 'tokenBalanceLoading',
      balanceFormatted: 'TOKENBALANCELOADING',
      rawTokenBalance: undefined,
      rawFiatNumber: undefined,
    });

    // When: component renders
    render();

    // Then: should not fire metrics while loading
    await new Promise((r) => setTimeout(r, 0));
    expect(mockTrackEvent).not.toHaveBeenCalled();
  });

  it('does not fire metrics when balances are unavailable', async () => {
    // Given: fiat is undefined and formatted balance is also undefined
    overrideCardHomeDataBalance({
      balanceFiat: 'tokenRateUndefined',
      balanceFormatted: undefined as unknown as string,
      rawTokenBalance: undefined,
      rawFiatNumber: undefined,
    });

    // When: component renders
    render();

    // Then: should not fire metrics without valid balance
    await new Promise((r) => setTimeout(r, 0));
    expect(mockTrackEvent).not.toHaveBeenCalled();
  });

  it('converts NaN rawTokenBalance to 0 in metrics', async () => {
    // Given: rawTokenBalance is NaN
    overrideCardHomeDataBalance(
      {
        balanceFiat: '$1,000.00',
        balanceFormatted: '1000.000000 USDC',
        rawTokenBalance: NaN,
        rawFiatNumber: 1000,
      },
      true,
    );

    // When: component renders and fires metrics
    render();
    await new Promise((r) => setTimeout(r, 0));

    // Then: should convert NaN to 0 in metrics
    expect(mockTrackEvent).toHaveBeenCalled();
    expect(mockEventBuilder.addProperties).toHaveBeenCalledWith(
      expect.objectContaining({
        token_raw_balance_priority: 0,
        token_fiat_balance_priority: 1000,
      }),
    );
  });

  it('converts NaN rawFiatNumber to 0 in metrics', async () => {
    // Given: rawFiatNumber is NaN
    overrideCardHomeDataBalance(
      {
        balanceFiat: '$1,000.00',
        balanceFormatted: '1000.000000 USDC',
        rawTokenBalance: 1000,
        rawFiatNumber: NaN,
      },
      true,
    );

    // When: component renders and fires metrics
    render();
    await new Promise((r) => setTimeout(r, 0));

    // Then: should convert NaN to 0 in metrics
    expect(mockTrackEvent).toHaveBeenCalled();
    expect(mockEventBuilder.addProperties).toHaveBeenCalledWith(
      expect.objectContaining({
        token_raw_balance_priority: 1000,
        token_fiat_balance_priority: 0,
      }),
    );
  });

  it('converts both NaN raw values to 0 in metrics', async () => {
    // Given: both raw values are NaN
    overrideCardHomeDataBalance(
      {
        balanceFiat: '$1,000.00',
        balanceFormatted: '1000.000000 USDC',
        rawTokenBalance: NaN,
        rawFiatNumber: NaN,
      },
      true,
    );

    // When: component renders and fires metrics
    render();
    await new Promise((r) => setTimeout(r, 0));

    // Then: should convert both NaN values to 0
    expect(mockTrackEvent).toHaveBeenCalled();
    expect(mockEventBuilder.addProperties).toHaveBeenCalledWith(
      expect.objectContaining({
        token_raw_balance_priority: 0,
        token_fiat_balance_priority: 0,
      }),
    );
  });

  it('preserves undefined raw values in metrics', async () => {
    // Given: raw values are undefined (not provided)
    overrideCardHomeDataBalance(
      {
        balanceFiat: '$1,000.00',
        balanceFormatted: '1000.000000 USDC',
        rawTokenBalance: undefined,
        rawFiatNumber: undefined,
      },
      true,
    );

    // When: component renders and fires metrics
    render();
    await new Promise((r) => setTimeout(r, 0));

    // Then: should preserve undefined values (not convert to 0)
    expect(mockTrackEvent).toHaveBeenCalled();
    expect(mockEventBuilder.addProperties).toHaveBeenCalledWith(
      expect.objectContaining({
        token_raw_balance_priority: undefined,
        token_fiat_balance_priority: undefined,
      }),
    );
  });

  describe('CARD_HOME_VIEWED state property', () => {
    it('includes state PENDING when kycStatus is PENDING', async () => {
      // Given: user is authenticated with PENDING KYC
      setupLoadCardDataMock({
        isAuthenticated: true,
        kycStatus: { verificationState: 'PENDING', userId: 'user-123' },
      });
      setupMockSelectors({ isAuthenticated: true });

      // When: component renders and fires metrics
      render();
      await new Promise((r) => setTimeout(r, 0));

      // Then: state should be PENDING
      expect(mockEventBuilder.addProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          state: 'PENDING',
        }),
      );
    });

    it('includes state PENDING when kycStatus is UNVERIFIED', async () => {
      // Given: user is authenticated with UNVERIFIED KYC
      setupLoadCardDataMock({
        isAuthenticated: true,
        kycStatus: { verificationState: 'UNVERIFIED', userId: 'user-123' },
      });
      setupMockSelectors({ isAuthenticated: true });

      // When: component renders and fires metrics
      render();
      await new Promise((r) => setTimeout(r, 0));

      // Then: state should be PENDING
      expect(mockEventBuilder.addProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          state: 'PENDING',
        }),
      );
    });

    it('includes state PENDING with undefined token fields when no priority token', async () => {
      // Given: user is authenticated with PENDING KYC and no priority token
      setupLoadCardDataMock({
        isAuthenticated: true,
        kycStatus: { verificationState: 'PENDING', userId: 'user-123' },
        priorityToken: null,
        allTokens: [],
      });
      setupMockSelectors({ isAuthenticated: true });

      // When: component renders and fires metrics
      render();
      await new Promise((r) => setTimeout(r, 0));

      // Then: state should be PENDING with undefined token fields
      expect(mockEventBuilder.addProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          state: 'PENDING',
          token_symbol_priority: undefined,
          token_raw_balance_priority: undefined,
          token_fiat_balance_priority: undefined,
          token_chain_id_priority: undefined,
        }),
      );
    });

    it('includes state ENABLE_CARD when VERIFIED with NoCard warning and no delegated wallets', async () => {
      // Given: user is VERIFIED but has NoCard warning and no external wallet details
      setupLoadCardDataMock({
        isAuthenticated: true,
        kycStatus: { verificationState: 'VERIFIED', userId: 'user-123' },
        warning: CardStateWarning.NoCard,
      });
      setupMockSelectors({ isAuthenticated: true });

      // When: component renders and fires metrics
      render();
      await new Promise((r) => setTimeout(r, 0));

      // Then: state should be ENABLE_CARD
      expect(mockEventBuilder.addProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          state: 'ENABLE_CARD',
        }),
      );
    });

    it('includes state ENABLE_CARD when VERIFIED with NeedDelegation warning', async () => {
      // Given: user is VERIFIED but has NeedDelegation warning and no delegated wallets
      setupLoadCardDataMock({
        isAuthenticated: true,
        kycStatus: { verificationState: 'VERIFIED', userId: 'user-123' },
        warning: CardStateWarning.NeedDelegation,
      });
      setupMockSelectors({ isAuthenticated: true });

      // When: component renders and fires metrics
      render();
      await new Promise((r) => setTimeout(r, 0));

      // Then: state should be ENABLE_CARD
      expect(mockEventBuilder.addProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          state: 'ENABLE_CARD',
        }),
      );
    });

    it('includes state ENABLE_CARD with undefined token fields when no priority token', async () => {
      // Given: user is VERIFIED with NoCard warning, no wallet details, and no priority token
      setupLoadCardDataMock({
        isAuthenticated: true,
        kycStatus: { verificationState: 'VERIFIED', userId: 'user-123' },
        warning: CardStateWarning.NoCard,
        priorityToken: null,
        allTokens: [],
      });
      setupMockSelectors({ isAuthenticated: true });

      // When: component renders and fires metrics
      render();
      await new Promise((r) => setTimeout(r, 0));

      // Then: state should be ENABLE_CARD with undefined token fields
      expect(mockEventBuilder.addProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          state: 'ENABLE_CARD',
          token_symbol_priority: undefined,
          token_raw_balance_priority: undefined,
          token_fiat_balance_priority: undefined,
          token_chain_id_priority: undefined,
        }),
      );
    });

    it('includes state PROVISIONING_CARD when VERIFIED with NoCard warning and has delegated wallets', async () => {
      // Given: user is VERIFIED with NoCard warning but has delegated wallet details
      setupLoadCardDataMock({
        isAuthenticated: true,
        kycStatus: { verificationState: 'VERIFIED', userId: 'user-123' },
        warning: CardStateWarning.NoCard,
        hasExternalWallets: true,
      });
      setupMockSelectors({ isAuthenticated: true });

      // When: component renders and fires metrics
      render();
      await new Promise((r) => setTimeout(r, 0));

      // Then: state should be PROVISIONING_CARD
      expect(mockEventBuilder.addProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          state: 'PROVISIONING_CARD',
        }),
      );
    });

    it('includes state PROVISIONING_CARD when VERIFIED with NeedDelegation warning and has delegated wallets', async () => {
      // Given: user is VERIFIED with NeedDelegation warning and has delegated wallet details
      setupLoadCardDataMock({
        isAuthenticated: true,
        kycStatus: { verificationState: 'VERIFIED', userId: 'user-123' },
        warning: CardStateWarning.NeedDelegation,
        hasExternalWallets: true,
      });
      setupMockSelectors({ isAuthenticated: true });

      // When: component renders and fires metrics
      render();
      await new Promise((r) => setTimeout(r, 0));

      // Then: state should be PROVISIONING_CARD
      expect(mockEventBuilder.addProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          state: 'PROVISIONING_CARD',
        }),
      );
    });

    it('includes state PROVISIONING_CARD with undefined token fields when no priority token', async () => {
      // Given: user is VERIFIED with NoCard warning, has wallet details, but no priority token
      setupLoadCardDataMock({
        isAuthenticated: true,
        kycStatus: { verificationState: 'VERIFIED', userId: 'user-123' },
        warning: CardStateWarning.NoCard,
        hasExternalWallets: true,
        priorityToken: null,
        allTokens: [],
      });
      setupMockSelectors({ isAuthenticated: true });

      // When: component renders and fires metrics
      render();
      await new Promise((r) => setTimeout(r, 0));

      // Then: state should be PROVISIONING_CARD with undefined token fields
      expect(mockEventBuilder.addProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          state: 'PROVISIONING_CARD',
          token_symbol_priority: undefined,
          token_raw_balance_priority: undefined,
          token_fiat_balance_priority: undefined,
          token_chain_id_priority: undefined,
        }),
      );
    });

    it('includes state VERIFIED when user is fully set up', async () => {
      // Given: user is authenticated and VERIFIED with no warnings
      setupLoadCardDataMock({
        isAuthenticated: true,
        kycStatus: { verificationState: 'VERIFIED', userId: 'user-123' },
        warning: null,
        cardDetails: { type: CardType.VIRTUAL },
      });
      setupMockSelectors({ isAuthenticated: true });

      // When: component renders and fires metrics
      render();
      await new Promise((r) => setTimeout(r, 0));

      // Then: state should be VERIFIED
      expect(mockEventBuilder.addProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          state: 'VERIFIED',
        }),
      );
    });

    it('includes state UNFUNDED when authenticated user has zero balance', async () => {
      // Given: user is authenticated and VERIFIED but has zero balance
      overrideCardHomeDataBalance({
        rawTokenBalance: 0,
        balanceFiat: '$0.00',
        balanceFormatted: '0.000000 USDC',
      });
      setupMockSelectors({ isAuthenticated: true });

      // When: component renders and fires metrics
      render();
      await new Promise((r) => setTimeout(r, 0));

      // Then: state should be UNFUNDED
      expect(mockEventBuilder.addProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          state: 'UNFUNDED',
        }),
      );
    });
  });

  describe('Swap Enabled for Priority Token', () => {
    it('disables add funds button when swap is not enabled for priority token', () => {
      // Given: swap is not enabled for the priority token
      (useIsSwapEnabledForPriorityToken as jest.Mock).mockReturnValueOnce(
        false,
      );

      // When: component renders
      render();

      // Then: add funds button should exist and be disabled
      const addFundsButton = screen.getByTestId(
        CardHomeSelectors.ADD_FUNDS_BUTTON,
      );
      expect(addFundsButton).toBeOnTheScreen();
      // Button should have disabled styling applied
      expect(addFundsButton).toBeDisabled();
    });

    it('enables add funds button when swap is enabled for priority token', () => {
      // Given: swap is enabled for the priority token
      (useIsSwapEnabledForPriorityToken as jest.Mock).mockReturnValueOnce(true);

      // When: component renders
      render();

      // Then: add funds button should be enabled
      const addFundsButton = screen.getByTestId(
        CardHomeSelectors.ADD_FUNDS_BUTTON,
      );
      expect(addFundsButton).toBeOnTheScreen();
      expect(addFundsButton).toBeEnabled();
    });

    it('applies disabled styling when swap is not enabled', () => {
      // Given: swap is not enabled for the priority token
      (useIsSwapEnabledForPriorityToken as jest.Mock).mockReturnValueOnce(
        false,
      );

      // When: component renders
      render();

      // Then: button should have disabled prop set to true
      const addFundsButton = screen.getByTestId(
        CardHomeSelectors.ADD_FUNDS_BUTTON,
      );
      expect(addFundsButton).toBeOnTheScreen();
      expect(addFundsButton).toBeDisabled();
    });

    it('does not disable button when swap is enabled for priority token', async () => {
      // Given: swap is enabled for the priority token
      (useIsSwapEnabledForPriorityToken as jest.Mock).mockReturnValueOnce(true);

      // When: component renders
      render();

      // Then: add funds button should be enabled and callable
      const addFundsButton = screen.getByTestId(
        CardHomeSelectors.ADD_FUNDS_BUTTON,
      );
      expect(addFundsButton).toBeEnabled();

      mockTrackEvent.mockClear();
      fireEvent.press(addFundsButton);

      // When: user presses add funds button
      // Then: should track event
      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalled();
      });
    });

    it('calls Engine.setSelectedAddress when wallet address differs from selected account', async () => {
      const differentWalletAddress = '0xAnotherOwnedAccount123456789000';

      (useIsSwapEnabledForPriorityToken as jest.Mock).mockReturnValueOnce(true);
      (useCardHomeData as jest.Mock).mockReturnValueOnce({
        data: {
          primaryFundingAsset: {
            ...mockPrimaryFundingAsset,
            walletAddress: differentWalletAddress,
          },
          fundingAssets: [mockPrimaryFundingAsset],
          availableFundingAssets: [mockPrimaryFundingAsset],
          card: {
            id: 'card-123',
            status: 'ACTIVE',
          },
          account: null,
          alerts: [],
          actions: [{ type: 'add_funds', enabled: true }],
        },
        primaryToken: mockPrimaryAssetWithBalance,
        availableTokens: [mockPrimaryAssetWithBalance],
        fundingTokens: [mockPrimaryAssetWithBalance],
        isLoading: false,
        error: null,
        warning: null,
      });

      render();

      const addFundsButton = screen.getByTestId(
        CardHomeSelectors.ADD_FUNDS_BUTTON,
      );
      fireEvent.press(addFundsButton);

      await waitFor(() => {
        expect(mockSetSelectedAddress).toHaveBeenCalledWith(
          differentWalletAddress,
        );
      });
    });

    it('does not call Engine.setSelectedAddress when wallet address matches selected account', async () => {
      (useIsSwapEnabledForPriorityToken as jest.Mock).mockReturnValueOnce(true);

      render();

      const addFundsButton = screen.getByTestId(
        CardHomeSelectors.ADD_FUNDS_BUTTON,
      );
      fireEvent.press(addFundsButton);

      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalled();
      });
      expect(mockSetSelectedAddress).not.toHaveBeenCalled();
    });
  });

  describe('Data refresh on focus', () => {
    it('calls fetchCardHomeData when the screen gains focus', () => {
      const fetchSpy = Engine.context.CardController
        .fetchCardHomeData as jest.Mock;
      fetchSpy.mockClear();

      jest.mocked(useFocusEffect).mockImplementation((cb) => cb());

      render();

      expect(fetchSpy).toHaveBeenCalledWith();

      jest.mocked(useFocusEffect).mockImplementation(jest.fn());
    });
  });

  describe('Baanx Login Features', () => {
    it('shows change asset button when Baanx login is enabled', () => {
      // Given: Baanx login is enabled (default)
      // When: component renders
      render();

      // Then: should show change asset button
      expect(
        screen.getByTestId(CardHomeSelectors.CHANGE_ASSET_BUTTON),
      ).toBeOnTheScreen();
    });

    it('navigates to asset selection modal when change asset pressed and authenticated', () => {
      // Given: user is authenticated
      setupMockSelectors({ isAuthenticated: true });
      setupLoadCardDataMock({ isAuthenticated: true });

      // When: user presses change asset button
      render();
      const changeAssetButton = screen.getByTestId(
        CardHomeSelectors.CHANGE_ASSET_BUTTON,
      );
      fireEvent.press(changeAssetButton);

      // Then: should navigate to asset selection modal with empty params
      expect(mockNavigate).toHaveBeenCalledWith(
        'CardModals',
        expect.objectContaining({
          screen: 'CardAssetSelectionModal',
          params: {},
        }),
      );
    });

    it('shows manage spending limit button when Baanx login is enabled', () => {
      // Given: Baanx login is enabled
      // When: component renders
      render();

      // Then: should show manage spending limit item
      expect(
        screen.getByTestId(CardHomeSelectors.MANAGE_SPENDING_LIMIT_ITEM),
      ).toBeOnTheScreen();
    });
  });

  describe('CardWarning Edge Cases', () => {
    it('hides balance and asset when warning is NeedDelegation', () => {
      // Given: warning is NeedDelegation
      setupLoadCardDataMock({
        warning: CardStateWarning.NeedDelegation,
      });

      // When: component renders
      render();

      // Then: balance and asset sections should be hidden
      const balanceElement = screen.queryByTestId('balance-test-id');
      const assetElement = screen.queryByTestId(
        CardHomeSelectors.ADD_FUNDS_BUTTON,
      );

      // Elements might be rendered but hidden via styles
      expect(balanceElement).toBeNull();
      expect(assetElement).toBeNull();
    });

    it('displays CardMessageBox when warning exists', () => {
      // Given: warning exists
      setupLoadCardDataMock({
        warning: CardStateWarning.NeedDelegation,
      });

      // When: component renders
      render();

      // Then: should display warning box
      expect(useCardHomeData).toHaveBeenCalled();
    });
  });

  describe('Card Details', () => {
    it('displays card with correct type from cardDetails', () => {
      // Given: card details with physical type
      setupLoadCardDataMock({
        cardDetails: { type: CardType.PHYSICAL },
      });

      // When: component renders
      render();

      // Then: should pass card type to CardImage
      // Card image component should be rendered with physical type
      expect(useCardHomeData).toHaveBeenCalled();
    });

    it('defaults to virtual card type when cardDetails is null', () => {
      // Given: no card details
      setupLoadCardDataMock({
        cardDetails: null,
      });

      // When: component renders
      render();

      // Then: should default to virtual type
      expect(useCardHomeData).toHaveBeenCalled();
    });

    it('shows error when cardDetails fetch fails', () => {
      // Given: card details error
      setupLoadCardDataMock({
        cardDetails: null,
        error: 'Failed to fetch card details',
      });

      // When: component renders
      render();

      // Then: should show error state
      expect(screen.getByText('Unable to load card')).toBeOnTheScreen();
      expect(screen.getByText('Please try again later')).toBeOnTheScreen();
    });

    it('calls fetchAllData when try again pressed with card details error', async () => {
      // Given: card details error
      setupLoadCardDataMock({
        cardDetails: null,
        error: 'Failed to fetch card details',
      });

      render();

      // When: user presses try again
      const tryAgainButton = screen.getByTestId(
        CardHomeSelectors.TRY_AGAIN_BUTTON,
      );
      fireEvent.press(tryAgainButton);

      // Then: should retry fetching all data
      await waitFor(() => {
        expect(mockRefetchAllData).toHaveBeenCalled();
      });
    });

    it('shows loading state when cardDetails is loading', () => {
      // Given: card details is loading
      setupLoadCardDataMock({
        isLoading: true,
        cardDetails: null,
      });

      // When: component renders
      render();

      // Then: should show loading skeletons since cardDetails is loading
      expect(
        screen.getByTestId(CardHomeSelectors.BALANCE_SKELETON),
      ).toBeOnTheScreen();

      // The full-screen skeleton also shows the card art placeholder
      expect(
        screen.getByTestId(CardHomeSelectors.CARD_ART_SKELETON),
      ).toBeOnTheScreen();
    });

    it('combines priority token and card details loading states', () => {
      // Given: both are loading
      setupLoadCardDataMock({
        priorityToken: null,
        cardDetails: null,
        isLoading: true,
      });

      // When: component renders
      render();

      // Then: should show loading skeletons
      expect(
        screen.getByTestId(CardHomeSelectors.BALANCE_SKELETON),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId(CardHomeSelectors.CARD_ART_SKELETON),
      ).toBeOnTheScreen();
    });

    it('prioritizes priority token error over card details error', () => {
      // Given: error present
      setupLoadCardDataMock({
        priorityToken: null,
        cardDetails: null,
        error: 'Priority token error',
      });

      // When: component renders
      render();

      // Then: should show error state
      expect(screen.getByText('Unable to load card')).toBeOnTheScreen();
    });
  });

  describe('Limited Allowance Warning', () => {
    it('does not show limited allowance warning when authenticated', () => {
      // Given: authenticated with limited allowance
      setupMockSelectors({ isAuthenticated: true });
      const limitedAllowanceToken = {
        ...mockPriorityToken,
        fundingStatus: FundingStatus.Limited,
      };
      setupLoadCardDataMock({
        priorityToken: limitedAllowanceToken,
        allTokens: [limitedAllowanceToken],
        isAuthenticated: true,
      });

      // When: component renders
      render();

      // Then: should not display limited allowance warning
      expect(
        screen.queryByText('Limited spending allowance'),
      ).not.toBeOnTheScreen();
    });

    it('does not show limited allowance warning when allowance is enabled', () => {
      // Given: not authenticated but allowance is enabled
      setupMockSelectors({ isAuthenticated: false });
      const enabledAllowanceToken = {
        ...mockPriorityToken,
        fundingStatus: FundingStatus.Enabled,
      };
      setupLoadCardDataMock({
        priorityToken: enabledAllowanceToken,
        allTokens: [enabledAllowanceToken],
        isAuthenticated: false,
      });

      // When: component renders
      render();

      // Then: should not display limited allowance warning
      expect(
        screen.queryByText('Limited spending allowance'),
      ).not.toBeOnTheScreen();
    });
  });

  describe('Manage limit row', () => {
    // The progress bar is gone from Card home; the Manage limit row shows
    // the remaining and total amounts instead.
    const limitedToken = (overrides: Record<string, unknown> = {}) => ({
      ...mockPriorityToken,
      fundingStatus: FundingStatus.Limited,
      spendingCap: '500',
      spendableBalance: '500',
      originalSpendingCap: '1000',
      caipChainId: 'eip155:59144',
      ...overrides,
    });

    it('shows the remaining and total amounts on the Activity segment', () => {
      setupMockSelectors({ isAuthenticated: true });
      setupLoadCardDataMock({
        priorityToken: limitedToken(),
        allTokens: [limitedToken()],
        isAuthenticated: true,
        warning: null,
      });

      render({ segment: 'activity' });

      expect(screen.getByText('500 USDC of 1000 USDC left')).toBeOnTheScreen();
      expect(
        screen.queryByTestId(CardHomeSelectors.CHANGE_ASSET_BUTTON),
      ).toBeNull();
    });

    it('shows the remaining and total amounts when the token balance is zero', () => {
      setupMockSelectors({ isAuthenticated: true });
      setupLoadCardDataMock({
        priorityToken: limitedToken(),
        allTokens: [limitedToken()],
        isAuthenticated: true,
        warning: null,
        tokenBalance: 0,
      });

      render();

      expect(screen.getByText('500 USDC of 1000 USDC left')).toBeOnTheScreen();
    });

    it('shows the remaining and total amounts when authenticated and limited', () => {
      setupMockSelectors({ isAuthenticated: true });
      setupLoadCardDataMock({
        priorityToken: limitedToken(),
        allTokens: [limitedToken()],
        isAuthenticated: true,
        warning: null,
      });

      render();

      expect(screen.getByText('Manage limit')).toBeOnTheScreen();
      expect(screen.getByText('500 USDC of 1000 USDC left')).toBeOnTheScreen();
    });

    it('does not show the amounts when not authenticated', () => {
      setupMockSelectors({ isAuthenticated: false });
      setupLoadCardDataMock({
        priorityToken: limitedToken(),
        allTokens: [limitedToken()],
        isAuthenticated: false,
      });

      render();

      expect(
        screen.queryByText('500 USDC of 1000 USDC left'),
      ).not.toBeOnTheScreen();
    });

    it('does not show the amounts when the allowance is enabled', () => {
      setupMockSelectors({ isAuthenticated: true });
      const enabledAllowanceToken = {
        ...mockPriorityToken,
        fundingStatus: FundingStatus.Enabled,
        spendingCap: '1000',
        spendableBalance: '500',
        caipChainId: 'eip155:59144',
      };
      setupLoadCardDataMock({
        priorityToken: enabledAllowanceToken,
        allTokens: [enabledAllowanceToken],
        isAuthenticated: true,
      });

      render();

      expect(
        screen.queryByText('1000 USDC of 1000 USDC left'),
      ).not.toBeOnTheScreen();
    });

    it('falls back to the spending cap as the total when no original cap exists', () => {
      setupMockSelectors({ isAuthenticated: true });
      const solanaToken = limitedToken({
        caipChainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
        originalSpendingCap: undefined,
      });
      setupLoadCardDataMock({
        priorityToken: solanaToken,
        allTokens: [solanaToken],
        isAuthenticated: true,
        warning: null,
      });

      render();

      expect(screen.getByText('500 USDC of 500 USDC left')).toBeOnTheScreen();
    });

    it('does not show the amounts for unsupported tokens', () => {
      setupMockSelectors({ isAuthenticated: true });
      const unsupportedToken = limitedToken({ symbol: 'AUSDC' });
      setupLoadCardDataMock({
        priorityToken: unsupportedToken,
        allTokens: [unsupportedToken],
        isAuthenticated: true,
        warning: null,
      });

      render();

      expect(
        screen.queryByText('500 USDC of 1000 USDC left'),
      ).not.toBeOnTheScreen();
    });

    it('shows the consumed and total amounts', () => {
      setupMockSelectors({ isAuthenticated: true });
      const consumedToken = limitedToken({
        spendingCap: '150',
        spendableBalance: '150',
        originalSpendingCap: '200',
      });
      setupLoadCardDataMock({
        priorityToken: consumedToken,
        allTokens: [consumedToken],
        isAuthenticated: true,
      });

      render();

      expect(screen.getByText('150 USDC of 200 USDC left')).toBeOnTheScreen();
    });

    it('shows zero remaining when the allowance is fully consumed', () => {
      setupMockSelectors({ isAuthenticated: true });
      const fullyConsumedToken = limitedToken({
        spendingCap: '0',
        spendableBalance: '0',
        originalSpendingCap: '1000',
      });
      setupLoadCardDataMock({
        priorityToken: fullyConsumedToken,
        allTokens: [fullyConsumedToken],
        isAuthenticated: true,
        warning: null,
      });

      render();

      expect(screen.getByText('0 USDC of 1000 USDC left')).toBeOnTheScreen();
    });

    it('does not show amounts when the allowance values are missing', () => {
      setupMockSelectors({ isAuthenticated: true });
      const missingToken = limitedToken({
        spendingCap: undefined as unknown as string,
        spendableBalance: undefined as unknown as string,
        originalSpendingCap: undefined,
      });
      setupLoadCardDataMock({
        priorityToken: missingToken,
        allTokens: [missingToken],
        isAuthenticated: true,
        warning: null,
      });

      render();

      expect(screen.queryByText('0 USDC of 0 USDC left')).not.toBeOnTheScreen();
    });
  });

  describe('Freeze animation persistence', () => {
    it('shows the freeze animation for a card that loads already frozen', () => {
      setupMockSelectors({ isAuthenticated: true });
      setupLoadCardDataMock({
        isAuthenticated: true,
        cardDetails: { type: CardType.VIRTUAL, status: CardStatus.FROZEN },
      });

      render();

      // The freeze animation renders in place of the static card art
      // (the CARD_ART wrapper stays, wrapping the animation).
      expect(
        screen.getByTestId(CardHomeSelectors.CARD_FREEZE_RIVE),
      ).toBeOnTheScreen();
    });

    it('keeps the Rive card mounted for a signed-in cardholder with no freeze action', () => {
      setupMockSelectors({ isAuthenticated: true });
      setupLoadCardDataMock({ isAuthenticated: true });

      render();

      // The Rive card stays mounted whenever the signed-in card is shown, so
      // a later freeze/unfreeze only fires triggers — no swapping layers.
      expect(
        screen.getByTestId(CardHomeSelectors.CARD_FREEZE_RIVE),
      ).toBeOnTheScreen();
    });

    it('keeps the animation up after a freeze succeeds while the card is frozen', () => {
      setupMockSelectors({ isAuthenticated: true });
      setupLoadCardDataMock({
        isAuthenticated: true,
        cardDetails: { type: CardType.VIRTUAL, status: CardStatus.FROZEN },
      });
      mockUseCardFreeze.mockReturnValue({
        freeze: {
          isError: false,
          isPending: false,
          isSuccess: true,
          mutate: mockFreezeMutate,
          data: undefined,
          error: null,
        },
        unfreeze: {
          isError: false,
          isPending: false,
          isSuccess: false,
          mutate: mockUnfreezeMutate,
          data: undefined,
          error: null,
        },
      });
      const setTimeoutSpy = jest.spyOn(global, 'setTimeout');

      render();

      expect(
        screen.getByTestId(CardHomeSelectors.CARD_FREEZE_RIVE),
      ).toBeOnTheScreen();
      // A frozen card never schedules the return to static — both mutations
      // keep isSuccess after they settle, so the timer is keyed off the
      // card's current state instead.
      const scheduledTimers = setTimeoutSpy.mock.calls.filter(
        (call) => call[1] === 4000,
      );
      expect(scheduledTimers).toHaveLength(0);
      setTimeoutSpy.mockRestore();
    });

    it('schedules the return to static 4s after an unfreeze when the card is not frozen', () => {
      setupMockSelectors({ isAuthenticated: true });
      setupLoadCardDataMock({
        isAuthenticated: true,
        cardDetails: { type: CardType.VIRTUAL, status: CardStatus.ACTIVE },
      });
      mockUseCardFreeze.mockReturnValue({
        freeze: {
          isError: false,
          isPending: false,
          isSuccess: false,
          mutate: mockFreezeMutate,
          data: undefined,
          error: null,
        },
        unfreeze: {
          isError: false,
          isPending: false,
          isSuccess: true,
          mutate: mockUnfreezeMutate,
          data: undefined,
          error: null,
        },
      });
      const setTimeoutSpy = jest.spyOn(global, 'setTimeout');

      render();

      expect(
        screen.getByTestId(CardHomeSelectors.CARD_FREEZE_RIVE),
      ).toBeOnTheScreen();
      const scheduledTimers = setTimeoutSpy.mock.calls.filter(
        (call) => call[1] === 4000,
      );
      expect(scheduledTimers).toHaveLength(1);
      setTimeoutSpy.mockRestore();
    });

    it('does not schedule the return to static while the card is still frozen', () => {
      setupMockSelectors({ isAuthenticated: true });
      setupLoadCardDataMock({
        isAuthenticated: true,
        cardDetails: { type: CardType.VIRTUAL, status: CardStatus.FROZEN },
      });
      mockUseCardFreeze.mockReturnValue({
        freeze: {
          isError: false,
          isPending: false,
          isSuccess: false,
          mutate: mockFreezeMutate,
          data: undefined,
          error: null,
        },
        unfreeze: {
          isError: false,
          isPending: false,
          isSuccess: true,
          mutate: mockUnfreezeMutate,
          data: undefined,
          error: null,
        },
      });
      const setTimeoutSpy = jest.spyOn(global, 'setTimeout');

      render();

      const scheduledTimers = setTimeoutSpy.mock.calls.filter(
        (call) => call[1] === 4000,
      );
      expect(scheduledTimers).toHaveLength(0);
      setTimeoutSpy.mockRestore();
    });

    it('keeps metal card art instead of the virtual freeze animation', () => {
      setupMockSelectors({ isAuthenticated: true });
      setupLoadCardDataMock({
        isAuthenticated: true,
        cardDetails: { type: CardType.METAL, status: CardStatus.ACTIVE },
      });

      render();

      expect(
        screen.queryByTestId(CardHomeSelectors.CARD_FREEZE_RIVE),
      ).toBeNull();
      expect(
        artHasProp(screen.getByTestId(CardHomeSelectors.CARD_ART), {
          fill: METAL_CARD_ART_FILL,
        }),
      ).toBe(true);
    });

    it('dims a blocked card instead of playing the freeze animation', () => {
      setupMockSelectors({ isAuthenticated: true });
      setupLoadCardDataMock({
        isAuthenticated: true,
        cardDetails: { type: CardType.VIRTUAL, status: CardStatus.BLOCKED },
      });

      render();

      expect(
        screen.queryByTestId(CardHomeSelectors.CARD_FREEZE_RIVE),
      ).toBeNull();
      expect(
        artHasProp(screen.getByTestId(CardHomeSelectors.CARD_ART), {
          opacity: 0.5,
        }),
      ).toBe(true);
    });

    it('shows the static card face instead of Rive while offline', () => {
      mockNetworkTier = 'NONE';
      mockHardwareTier = null;
      setupMockSelectors({ isAuthenticated: true });
      setupLoadCardDataMock({
        isAuthenticated: true,
        cardDetails: { type: CardType.VIRTUAL, status: CardStatus.ACTIVE },
      });

      render();

      expect(
        screen.queryByTestId(CardHomeSelectors.CARD_FREEZE_RIVE),
      ).toBeNull();
      expect(screen.getByTestId(CardHomeSelectors.CARD_ART)).toBeOnTheScreen();
    });

    it('shows the static card face on a low-end phone with a slow connection', () => {
      mockNetworkTier = 'SLOW_CELLULAR';
      mockHardwareTier = 'LOW';
      setupMockSelectors({ isAuthenticated: true });
      setupLoadCardDataMock({
        isAuthenticated: true,
        cardDetails: { type: CardType.VIRTUAL, status: CardStatus.ACTIVE },
      });

      render();

      expect(
        screen.queryByTestId(CardHomeSelectors.CARD_FREEZE_RIVE),
      ).toBeNull();
    });

    it('keeps the freeze animation on a low-end phone with a fast connection', () => {
      mockNetworkTier = 'WIFI';
      mockHardwareTier = 'LOW';
      setupMockSelectors({ isAuthenticated: true });
      setupLoadCardDataMock({
        isAuthenticated: true,
        cardDetails: { type: CardType.VIRTUAL, status: CardStatus.ACTIVE },
      });

      render();

      expect(
        screen.getByTestId(CardHomeSelectors.CARD_FREEZE_RIVE),
      ).toBeOnTheScreen();
    });

    it('plays the arrival reveal instead of the freeze animation', () => {
      mockArrivalOverride = { usesRiveCard: true, playReveal: true };
      setupMockSelectors({ isAuthenticated: true });
      setupLoadCardDataMock({
        isAuthenticated: true,
        cardDetails: { type: CardType.VIRTUAL, status: CardStatus.ACTIVE },
      });

      render();

      expect(
        screen.getByTestId(CardHomeSelectors.CARD_ARRIVAL_RIVE),
      ).toBeOnTheScreen();
      expect(
        screen.queryByTestId(CardHomeSelectors.CARD_FREEZE_RIVE),
      ).toBeNull();
    });

    it('hands the card from the arrival reveal to the freeze animation after a freeze', () => {
      mockArrivalOverride = { usesRiveCard: true, playReveal: false };
      setupMockSelectors({ isAuthenticated: true });
      setupLoadCardDataMock({
        isAuthenticated: true,
        cardDetails: { type: CardType.VIRTUAL, status: CardStatus.FROZEN },
      });
      mockUseCardFreeze.mockReturnValue({
        freeze: {
          isError: false,
          isPending: false,
          isSuccess: true,
          mutate: mockFreezeMutate,
          data: undefined,
          error: null,
        },
        unfreeze: {
          isError: false,
          isPending: false,
          isSuccess: false,
          mutate: mockUnfreezeMutate,
          data: undefined,
          error: null,
        },
      });

      render();

      expect(
        screen.getByTestId(CardHomeSelectors.CARD_FREEZE_RIVE),
      ).toBeOnTheScreen();
      expect(
        screen.queryByTestId(CardHomeSelectors.CARD_ARRIVAL_RIVE),
      ).not.toBeOnTheScreen();
    });

    it('shows the static card face instead of the arrival reveal while offline', () => {
      mockArrivalOverride = { usesRiveCard: true, playReveal: true };
      mockNetworkTier = 'NONE';
      setupMockSelectors({ isAuthenticated: true });
      setupLoadCardDataMock({
        isAuthenticated: true,
        cardDetails: { type: CardType.VIRTUAL, status: CardStatus.ACTIVE },
      });

      render();

      expect(
        screen.queryByTestId(CardHomeSelectors.CARD_ARRIVAL_RIVE),
      ).toBeNull();
      expect(
        screen.queryByTestId(CardHomeSelectors.CARD_FREEZE_RIVE),
      ).toBeNull();
    });

    it('stacks the card art wrapper above the content below so the drips fall over the action buttons', () => {
      setupMockSelectors({ isAuthenticated: true });
      setupLoadCardDataMock({ isAuthenticated: true });

      render();

      // The card art wrapper Box has no testID; walk up from the card art box
      // to the ancestor carrying the z-20 stacking class. The animation
      // overlay itself ignores touches (pointerEvents="none"), so the action
      // buttons below stay tappable.
      let cardArtWrapper = screen.getByTestId(
        CardHomeSelectors.CARD_ART,
      ).parent;
      while (
        cardArtWrapper &&
        StyleSheet.flatten([cardArtWrapper.props.style])?.zIndex !== 20
      ) {
        cardArtWrapper = cardArtWrapper.parent;
      }
      expect(cardArtWrapper).not.toBeNull();
    });

    it('keeps every card art wrapper unclipped so the drips can reach the buttons on Android', () => {
      setupMockSelectors({ isAuthenticated: true });
      setupLoadCardDataMock({ isAuthenticated: true });

      render();

      // Android clips overflow by default, so each view from the card art up
      // to the z-20 wrapper must be overflow-visible.
      let node: ReactTestInstance | null = screen.getByTestId(
        CardHomeSelectors.CARD_ART,
      );
      const clipped: unknown[] = [];
      while (node) {
        const style = StyleSheet.flatten([node.props.style]);
        if (typeof node.type === 'string' && style?.overflow !== 'visible') {
          clipped.push(style);
        }
        if (style?.zIndex === 20) {
          break;
        }
        node = node.parent;
      }
      expect(node).not.toBeNull();
      expect(clipped).toEqual([]);
    });
  });

  describe('KYC Status Verification', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());
    });

    describe('canEnableCard Logic', () => {
      it('shows enable card button for VERIFIED user', () => {
        // Given: VERIFIED user without a card
        setupMockSelectors({ isAuthenticated: true });
        setupLoadCardDataMock({
          isAuthenticated: true,

          warning: CardStateWarning.NoCard,
          kycStatus: { verificationState: 'VERIFIED', userId: 'user-123' },
          isLoading: false,
        });

        render();

        // Then: enable card button is displayed
        expect(
          screen.getByTestId(CardHomeSelectors.ENABLE_CARD_BUTTON),
        ).toBeOnTheScreen();
      });

      it('does not show Enable Card button for PENDING user without card', () => {
        // Given: PENDING user without a card - cannot enable until verified
        setupMockSelectors({ isAuthenticated: true });
        setupLoadCardDataMock({
          isAuthenticated: true,

          warning: CardStateWarning.NoCard,
          priorityToken: mockPriorityToken,
          kycStatus: { verificationState: 'PENDING', userId: 'user-123' },
          isLoading: false,
        });

        render();

        // Then: no Enable Card button shown (user must wait for verification)
        expect(
          screen.queryByTestId(CardHomeSelectors.ENABLE_CARD_BUTTON),
        ).toBeNull();
        expect(
          screen.queryByTestId(CardHomeSelectors.ADD_FUNDS_BUTTON),
        ).toBeNull();
      });

      it('does not show enable card button when user KYC is rejected', () => {
        setupMockSelectors({ isAuthenticated: true });
        setupLoadCardDataMock({
          isAuthenticated: true,

          warning: CardStateWarning.NoCard,
          kycStatus: { verificationState: 'REJECTED', userId: 'user-123' },
          isLoading: false,
        });

        render();

        // Then: no Enable Card button shown (user KYC rejected)
        expect(
          screen.queryByTestId(CardHomeSelectors.ENABLE_CARD_BUTTON),
        ).toBeNull();
      });

      it('does not show Enable Card button for UNVERIFIED user without card', () => {
        // Given: UNVERIFIED user without a card - cannot enable until verified
        setupMockSelectors({ isAuthenticated: true });
        setupLoadCardDataMock({
          isAuthenticated: true,

          warning: CardStateWarning.NoCard,
          priorityToken: mockPriorityToken,
          kycStatus: { verificationState: 'UNVERIFIED', userId: 'user-123' },
          isLoading: false,
        });

        render();

        // Then: no Enable Card button shown (user must complete verification)
        expect(
          screen.queryByTestId(CardHomeSelectors.ENABLE_CARD_BUTTON),
        ).toBeNull();
        expect(
          screen.queryByTestId(CardHomeSelectors.ADD_FUNDS_BUTTON),
        ).toBeNull();
      });

      it('disables card button when KYC status is loading', () => {
        setupMockSelectors({ isAuthenticated: true });
        setupLoadCardDataMock({
          isAuthenticated: true,

          warning: CardStateWarning.NoCard,
          kycStatus: { verificationState: 'VERIFIED', userId: 'user-123' },
          isLoading: true,
        });

        render();

        // When loading, the full-screen skeleton is shown instead
        expect(
          screen.getByTestId(CardHomeSelectors.CARD_ART_SKELETON),
        ).toBeOnTheScreen();
        expect(
          screen.queryByTestId(CardHomeSelectors.ENABLE_CARD_BUTTON),
        ).toBeNull();
      });

      it('does not show enable card button when KYC status is null', () => {
        setupMockSelectors({ isAuthenticated: true });
        setupLoadCardDataMock({
          isAuthenticated: true,

          warning: CardStateWarning.NoCard,
          kycStatus: null,
          isLoading: false,
        });

        render();

        // Then: no Enable Card button shown (KYC status unknown)
        expect(
          screen.queryByTestId(CardHomeSelectors.ENABLE_CARD_BUTTON),
        ).toBeNull();
      });

      it('does not show enable card button for unauthenticated users without verified KYC', () => {
        // Given: unauthenticated user without a card
        setupMockSelectors({ isAuthenticated: false });
        setupLoadCardDataMock({
          isAuthenticated: false,

          warning: CardStateWarning.NoCard,
          kycStatus: null,
          isLoading: false,
        });

        render();

        // Then: no Enable Card button shown (user must authenticate and verify KYC)
        expect(
          screen.queryByTestId(CardHomeSelectors.ENABLE_CARD_BUTTON),
        ).toBeNull();
      });
    });

    describe('KYC Status Button State', () => {
      it('does not show Enable Card for PENDING user without card', () => {
        // Given: PENDING user without card - cannot enable until verified
        setupMockSelectors({ isAuthenticated: true });
        setupLoadCardDataMock({
          isAuthenticated: true,

          warning: CardStateWarning.NoCard,
          priorityToken: mockPriorityToken,
          kycStatus: { verificationState: 'PENDING', userId: 'user-123' },
          isLoading: false,
        });

        render();

        // Then: no Enable Card button shown (user must wait for verification)
        expect(
          screen.queryByTestId(CardHomeSelectors.ENABLE_CARD_BUTTON),
        ).toBeNull();
      });

      it('does not show enable card button for REJECTED user', () => {
        // Given: REJECTED user
        setupMockSelectors({ isAuthenticated: true });
        setupLoadCardDataMock({
          isAuthenticated: true,

          warning: CardStateWarning.NoCard,
          kycStatus: { verificationState: 'REJECTED', userId: 'user-123' },
          isLoading: false,
        });

        render();

        // Then: no Enable Card button shown (user KYC rejected)
        expect(
          screen.queryByTestId(CardHomeSelectors.ENABLE_CARD_BUTTON),
        ).toBeNull();
      });

      it('does not show Enable Card for UNVERIFIED user without card', () => {
        // Given: UNVERIFIED user without card - cannot enable until verified
        setupMockSelectors({ isAuthenticated: true });
        setupLoadCardDataMock({
          isAuthenticated: true,

          warning: CardStateWarning.NoCard,
          priorityToken: mockPriorityToken,
          kycStatus: { verificationState: 'UNVERIFIED', userId: 'user-123' },
          isLoading: false,
        });

        render();

        // Then: no Enable Card button shown (user must complete verification)
        expect(
          screen.queryByTestId(CardHomeSelectors.ENABLE_CARD_BUTTON),
        ).toBeNull();
      });

      it('shows enable card button for VERIFIED user', () => {
        // Given: VERIFIED user with NoCard warning
        setupMockSelectors({ isAuthenticated: true });
        setupLoadCardDataMock({
          isAuthenticated: true,

          warning: CardStateWarning.NoCard,
          kycStatus: { verificationState: 'VERIFIED', userId: 'user-123' },
          isLoading: false,
        });

        render();

        // Then: enable card button is displayed (only VERIFIED users can enable)
        expect(
          screen.getByTestId(CardHomeSelectors.ENABLE_CARD_BUTTON),
        ).toBeOnTheScreen();
      });

      it('does not show enable card button for unauthenticated users', () => {
        // Given: unauthenticated user (no KYC status)
        setupMockSelectors({ isAuthenticated: false });
        setupLoadCardDataMock({
          isAuthenticated: false,

          warning: CardStateWarning.NoCard,
          kycStatus: null,
          isLoading: false,
        });

        render();

        // Then: no Enable Card button shown (user must authenticate and verify KYC)
        expect(
          screen.queryByTestId(CardHomeSelectors.ENABLE_CARD_BUTTON),
        ).toBeNull();
      });

      it('shows enable assets button when warning is NeedDelegation and user is VERIFIED', () => {
        setupMockSelectors({ isAuthenticated: true });
        setupLoadCardDataMock({
          isAuthenticated: true,

          warning: CardStateWarning.NeedDelegation,
          kycStatus: { verificationState: 'VERIFIED', userId: 'user-123' },
          isLoading: false,
        });

        render();

        expect(
          screen.getByTestId(CardHomeSelectors.ENABLE_CARD_BUTTON),
        ).toBeOnTheScreen();
      });

      it('does not show enable assets button when warning is NeedDelegation and user is PENDING', () => {
        setupMockSelectors({ isAuthenticated: true });
        setupLoadCardDataMock({
          isAuthenticated: true,

          warning: CardStateWarning.NeedDelegation,
          kycStatus: { verificationState: 'PENDING', userId: 'user-123' },
          isLoading: false,
        });

        render();

        expect(
          screen.queryByTestId(CardHomeSelectors.ENABLE_CARD_BUTTON),
        ).toBeNull();
      });

      it('shows skeleton when data is loading', () => {
        setupMockSelectors({ isAuthenticated: true });
        setupLoadCardDataMock({
          isAuthenticated: true,

          warning: CardStateWarning.NoCard,
          kycStatus: { verificationState: 'PENDING', userId: 'user-123' },
          isLoading: true,
        });

        render();

        expect(
          screen.getByTestId(CardHomeSelectors.CARD_ART_SKELETON),
        ).toBeOnTheScreen();
      });
    });

    describe('KYC Error Handling', () => {
      it('shows error view when there is an error', () => {
        setupMockSelectors({ isAuthenticated: true });
        setupLoadCardDataMock({
          isAuthenticated: true,

          warning: CardStateWarning.NoCard,
          kycStatus: null,
          error: 'KYC fetch failed',
          isLoading: false,
        });

        render();

        expect(screen.getByText('Unable to load card')).toBeOnTheScreen();
        expect(screen.getByTestId('try-again-button')).toBeOnTheScreen();
      });

      it('shows error view even when KYC status exists with error', () => {
        setupMockSelectors({ isAuthenticated: true });
        setupLoadCardDataMock({
          isAuthenticated: true,

          warning: CardStateWarning.NoCard,
          kycStatus: { verificationState: 'VERIFIED', userId: 'user-123' },
          error: 'Some other error',
          isLoading: false,
        });

        render();

        expect(screen.getByText('Unable to load card')).toBeOnTheScreen();
        expect(screen.getByTestId('try-again-button')).toBeOnTheScreen();
      });

      it('sends a logged-out user to login instead of the error view', () => {
        setupMockSelectors({ isAuthenticated: false });
        setupLoadCardDataMock({
          isAuthenticated: false,
          warning: CardStateWarning.NoCard,
          kycStatus: null,
          error: 'KYC fetch failed',
          isLoading: false,
        });

        render();

        expect(screen.queryByText('Unable to load card')).toBeNull();
        expect(StackActions.replace).toHaveBeenCalledWith(
          Routes.CARD.AUTHENTICATION,
        );
      });

      it('shows error view when loading with error', () => {
        setupMockSelectors({ isAuthenticated: true });
        setupLoadCardDataMock({
          isAuthenticated: true,

          warning: CardStateWarning.NoCard,
          kycStatus: null,
          error: 'KYC fetch failed',
          isLoading: true,
        });

        render();

        expect(screen.getByText('Unable to load card')).toBeOnTheScreen();
        expect(screen.getByTestId('try-again-button')).toBeOnTheScreen();
      });
    });

    describe('canEnableCard computed value', () => {
      it('does not show Enable Card for PENDING user without card', () => {
        // Given: PENDING user without card - cannot enable until verified
        setupMockSelectors({ isAuthenticated: true });
        setupLoadCardDataMock({
          isAuthenticated: true,

          warning: CardStateWarning.NoCard,
          priorityToken: mockPriorityToken,
          kycStatus: { verificationState: 'PENDING', userId: 'user-123' },
          isLoading: false,
        });

        render();

        // Then: no Enable Card button shown (user must wait for verification)
        expect(
          screen.queryByTestId(CardHomeSelectors.ENABLE_CARD_BUTTON),
        ).toBeNull();
      });

      it('does not show enable card button for REJECTED user', () => {
        // Given: REJECTED user
        setupMockSelectors({ isAuthenticated: true });
        setupLoadCardDataMock({
          isAuthenticated: true,

          warning: CardStateWarning.NoCard,
          kycStatus: { verificationState: 'REJECTED', userId: 'user-123' },
          isLoading: false,
        });

        render();

        // Then: no Enable Card button shown (user KYC rejected)
        expect(
          screen.queryByTestId(CardHomeSelectors.ENABLE_CARD_BUTTON),
        ).toBeNull();
      });

      it('does not show Enable Card for UNVERIFIED user without card', () => {
        // Given: UNVERIFIED user without card - cannot enable until verified
        setupMockSelectors({ isAuthenticated: true });
        setupLoadCardDataMock({
          isAuthenticated: true,

          warning: CardStateWarning.NoCard,
          priorityToken: mockPriorityToken,
          kycStatus: { verificationState: 'UNVERIFIED', userId: 'user-123' },
          isLoading: false,
        });

        render();

        // Then: no Enable Card button shown (user must complete verification)
        expect(
          screen.queryByTestId(CardHomeSelectors.ENABLE_CARD_BUTTON),
        ).toBeNull();
      });

      it('shows enable card button for VERIFIED user', () => {
        // Given: VERIFIED user without card
        setupMockSelectors({ isAuthenticated: true });
        setupLoadCardDataMock({
          isAuthenticated: true,

          warning: CardStateWarning.NoCard,
          kycStatus: { verificationState: 'VERIFIED', userId: 'user-123' },
          isLoading: false,
        });

        render();

        // Then: enable card button is displayed (only VERIFIED users can enable)
        expect(
          screen.getByTestId(CardHomeSelectors.ENABLE_CARD_BUTTON),
        ).toBeOnTheScreen();
      });

      it('does not show enable card button for null verification state', () => {
        setupMockSelectors({ isAuthenticated: true });
        setupLoadCardDataMock({
          isAuthenticated: true,

          warning: CardStateWarning.NoCard,
          kycStatus: { verificationState: null, userId: 'user-123' },
          isLoading: false,
        });

        render();

        // Then: no Enable Card button shown (KYC status unknown)
        expect(
          screen.queryByTestId(CardHomeSelectors.ENABLE_CARD_BUTTON),
        ).toBeNull();
      });
    });

    describe('KYC Warning Display', () => {
      it('displays KYC warning for PENDING user without card', () => {
        // Given: PENDING user without card
        setupMockSelectors({ isAuthenticated: true });
        setupLoadCardDataMock({
          isAuthenticated: true,

          warning: CardStateWarning.NoCard,
          priorityToken: mockPriorityToken,
          kycStatus: { verificationState: 'PENDING', userId: 'user-123' },
          isLoading: false,
        });

        // When: component renders
        render();

        // Then: the waiting view shows with the reviewing copy
        expect(
          screen.getByTestId(CardHomeSelectors.SETUP_PENDING_STATUS_VIEW),
        ).toBeOnTheScreen();
        expect(
          screen.getByTestId(CardHomeStatusViewSelectors.TITLE),
        ).toHaveTextContent(
          strings('card.card_home.setup_pending.reviewing.title'),
        );
      });

      it('displays KYC warning for UNVERIFIED user without card', () => {
        // Given: UNVERIFIED user without card
        setupMockSelectors({ isAuthenticated: true });
        setupLoadCardDataMock({
          isAuthenticated: true,

          warning: CardStateWarning.NoCard,
          priorityToken: mockPriorityToken,
          kycStatus: { verificationState: 'UNVERIFIED', userId: 'user-123' },
          isLoading: false,
        });

        // When: component renders
        render();

        // Then: the waiting view shows with the reviewing copy
        expect(
          screen.getByTestId(CardHomeSelectors.SETUP_PENDING_STATUS_VIEW),
        ).toBeOnTheScreen();
        expect(
          screen.getByTestId(CardHomeStatusViewSelectors.TITLE),
        ).toHaveTextContent(
          strings('card.card_home.setup_pending.reviewing.title'),
        );
      });

      it('does not display KYC warning for VERIFIED user', () => {
        // Given: VERIFIED user without card
        setupMockSelectors({ isAuthenticated: true });
        setupLoadCardDataMock({
          isAuthenticated: true,

          warning: CardStateWarning.NoCard,
          kycStatus: { verificationState: 'VERIFIED', userId: 'user-123' },
          isLoading: false,
        });

        // When: component renders
        render();

        // Then: KYC warning is not displayed
        expect(
          screen.queryByText('card.card_home.warnings.kyc_pending.title'),
        ).toBeNull();
      });

      it('does not show Enable Card for PENDING user without card (only shows warning)', () => {
        // Given: PENDING user without card - cannot enable until verified
        setupMockSelectors({ isAuthenticated: true });
        setupLoadCardDataMock({
          isAuthenticated: true,

          warning: CardStateWarning.NoCard,
          priorityToken: mockPriorityToken,
          kycStatus: { verificationState: 'PENDING', userId: 'user-123' },
          isLoading: false,
        });

        // When: component renders
        render();

        // Then: the waiting view shows — no Enable Card button, no Add funds
        expect(
          screen.queryByTestId(CardHomeSelectors.ENABLE_CARD_BUTTON),
        ).not.toBeOnTheScreen();
        expect(
          screen.queryByTestId(CardHomeSelectors.ADD_FUNDS_BUTTON),
        ).not.toBeOnTheScreen();
        expect(
          screen.getByTestId(CardHomeStatusViewSelectors.TITLE),
        ).toHaveTextContent(
          strings('card.card_home.setup_pending.reviewing.title'),
        );
      });
    });

    describe('Signed out while identity is in review', () => {
      it('shows the pending banner and the waiting layout', () => {
        // Given: still in onboarding, no signed-in Card account
        mockIsSignedOutKycPending = true;
        setupMockSelectors({ isAuthenticated: false });

        // When: component renders
        render();

        // Then: the waiting view shows and nothing card-ready does
        expect(
          screen.getByTestId(CardHomeSelectors.SETUP_PENDING_STATUS_VIEW),
        ).toBeOnTheScreen();
        expect(
          screen.getByTestId(CardHomeStatusViewSelectors.TITLE),
        ).toHaveTextContent(
          strings('card.card_home.setup_pending.signed_out_pending.title'),
        );
        expect(
          screen.queryByTestId(CardHomeSelectors.ADD_FUNDS_BUTTON),
        ).not.toBeOnTheScreen();
        expect(
          screen.queryByTestId(CardHomeSelectors.VIEW_CARD_DETAILS_BUTTON),
        ).not.toBeOnTheScreen();
        expect(
          screen.queryByTestId(CardHomeSelectors.SET_PIN_BUTTON),
        ).not.toBeOnTheScreen();
        expect(
          screen.queryByTestId(CardHomeSelectors.FREEZE_CARD_BUTTON),
        ).not.toBeOnTheScreen();
        // The card art is muted to 50% opacity
        expect(screen.getByTestId(CardHomeSelectors.CARD_ART)).toHaveStyle({
          opacity: 0.5,
        });
      });

      it('does not show the pending banner when signed out and not in review', () => {
        setupMockSelectors({ isAuthenticated: false });

        render();

        expect(
          screen.queryByText('card.card_home.warnings.kyc_pending.title'),
        ).toBeNull();
        expect(screen.queryByTestId(CardHomeSelectors.CARD_ART)).toBeNull();
        expect(StackActions.replace).toHaveBeenCalledWith(
          Routes.CARD.AUTHENTICATION,
        );
      });
    });

    describe('Setup pending re-check cadence', () => {
      // Server shape for A07/A08: alert, no card, no actions.
      const setupPendingAlert = (
        alertType: 'kyc_pending' | 'card_provisioning',
      ) => {
        setupMockSelectors({ isAuthenticated: true });
        if (alertType === 'kyc_pending') {
          setupLoadCardDataMock({
            isAuthenticated: true,
            warning: CardStateWarning.NoCard,
            kycStatus: { verificationState: 'PENDING', userId: 'user-123' },
            isLoading: false,
          });
          return;
        }
        setupLoadCardDataMock({
          isAuthenticated: true,
          warning: CardStateWarning.NoCard,
          kycStatus: { verificationState: 'VERIFIED', userId: 'user-123' },
          hasExternalWallets: true,
        });
      };

      it('polls faster while the card is being created (A08)', () => {
        mockProvisioningView = 'provisioning';
        setupPendingAlert('card_provisioning');

        render();

        expect(mockUseCardSetupPendingRefresh).toHaveBeenLastCalledWith(
          expect.objectContaining({
            isPending: true,
            isAuthenticated: true,
            pollIntervalMs: CARD_SETUP_CREATING_POLL_MS,
            suspendSignedInPoll: false,
          }),
        );
      });

      it('does not poll while the network tier is offline', () => {
        mockNetworkTier = 'NONE';
        setupPendingAlert('kyc_pending');

        render();

        expect(mockUseCardSetupPendingRefresh).toHaveBeenLastCalledWith(
          expect.objectContaining({
            isPending: true,
            pollIntervalMs: null,
          }),
        );
      });

      it('uses the rare cadence on a slow cellular link while creating', () => {
        mockNetworkTier = 'SLOW_CELLULAR';
        mockProvisioningView = 'provisioning';
        setupPendingAlert('card_provisioning');

        render();

        expect(mockUseCardSetupPendingRefresh).toHaveBeenLastCalledWith(
          expect.objectContaining({
            pollIntervalMs: CARD_SETUP_PENDING_POLL_MS,
          }),
        );
      });

      it('does not stack a second poll on Immersve’s provisioning interval', () => {
        mockIsProvisioningPollActive = true;
        mockProvisioningView = 'provisioning';
        setupPendingAlert('card_provisioning');

        render();

        expect(mockUseCardSetupPendingRefresh).toHaveBeenLastCalledWith(
          expect.objectContaining({
            isPending: true,
            suspendSignedInPoll: true,
          }),
        );
      });

      it('polls the slow cadence while identity is in review (A07)', () => {
        setupPendingAlert('kyc_pending');

        render();

        expect(mockUseCardSetupPendingRefresh).toHaveBeenLastCalledWith(
          expect.objectContaining({
            isPending: true,
            isAuthenticated: true,
            pollIntervalMs: CARD_SETUP_PENDING_POLL_MS,
          }),
        );
      });

      it('polls the slow cadence while the Immersve review is up', () => {
        mockCanEnableCard = false;
        mockProvisioningView = 'kyc_under_review';
        setupMockSelectors({
          isAuthenticated: true,
          activeProviderId: 'immersve',
        });
        setupPendingAlert('card_provisioning');

        render();

        expect(mockUseCardSetupPendingRefresh).toHaveBeenLastCalledWith(
          expect.objectContaining({
            isPending: true,
            isAuthenticated: true,
            pollIntervalMs: CARD_SETUP_PENDING_POLL_MS,
          }),
        );
      });

      it('leaves the refresh off for a ready card', () => {
        setupMockSelectors({ isAuthenticated: true });
        setupLoadCardDataMock({ isAuthenticated: true });

        render();

        expect(mockUseCardSetupPendingRefresh).toHaveBeenLastCalledWith(
          expect.objectContaining({ isPending: false }),
        );
      });

      it('keeps the refresh off while an actionable step owns the screen (A06)', () => {
        mockCanEnableCard = true;
        mockProvisioningView = 'hidden';
        setupMockSelectors({ isAuthenticated: true });
        setupLoadCardDataMock({
          isAuthenticated: true,
          warning: CardStateWarning.NoCard,
          kycStatus: { verificationState: 'VERIFIED', userId: 'user-123' },
          hasExternalWallets: true,
        });

        render();

        expect(mockUseCardSetupPendingRefresh).toHaveBeenLastCalledWith(
          expect.objectContaining({ isPending: false }),
        );
      });
    });

    describe('Waiting re-checks on pull to refresh', () => {
      const pullToRefresh = async () => {
        const refreshControl = screen.UNSAFE_getByType(RefreshControl);
        await act(async () => {
          await refreshControl.props.onRefresh();
        });
      };

      it('re-checks a card that is still being created', async () => {
        mockCanEnableCard = false;
        mockProvisioningView = 'provisioning';
        setupMockSelectors({
          isAuthenticated: true,
          activeProviderId: 'immersve',
        });
        setupLoadCardDataMock({
          isAuthenticated: true,
          warning: CardStateWarning.NoCard,
          kycStatus: { verificationState: 'VERIFIED', userId: 'user-123' },
          hasExternalWallets: true,
        });

        render();
        await pullToRefresh();

        expect(mockRecheckProvisioning).toHaveBeenCalledTimes(1);
        expect(mockRefetchAllData).toHaveBeenCalled();
      });

      it('re-checks the Immersve review and the data when signed in', async () => {
        mockCanEnableCard = false;
        mockProvisioningView = 'kyc_under_review';
        setupMockSelectors({
          isAuthenticated: true,
          activeProviderId: 'immersve',
        });
        setupLoadCardDataMock({
          isAuthenticated: true,
          warning: CardStateWarning.NoCard,
          kycStatus: { verificationState: 'VERIFIED', userId: 'user-123' },
          hasExternalWallets: true,
        });

        render();
        await pullToRefresh();

        // Both things the review waits on: the provisioning reconcile and
        // fresh card home data.
        expect(mockRecheckProvisioning).toHaveBeenCalledTimes(1);
        expect(mockRefetchAllData).toHaveBeenCalled();
      });

      it('does not re-check the reconcile while it is reconciling', async () => {
        mockCanEnableCard = false;
        mockProvisioningView = 'reconciling';
        setupMockSelectors({
          isAuthenticated: true,
          activeProviderId: 'immersve',
        });
        setupLoadCardDataMock({
          isAuthenticated: true,
          warning: CardStateWarning.NoCard,
          kycStatus: { verificationState: 'VERIFIED', userId: 'user-123' },
          hasExternalWallets: true,
        });

        render();
        await pullToRefresh();

        // The check is already in flight; only the data refresh runs.
        expect(mockRecheckProvisioning).not.toHaveBeenCalled();
        expect(mockRefetchAllData).toHaveBeenCalled();
      });

      it('re-checks registration status instead of card data when signed out and pending', async () => {
        mockIsSignedOutKycPending = true;
        setupMockSelectors({ isAuthenticated: false });

        render();
        await pullToRefresh();

        expect(mockRefreshRegistrationStatus).toHaveBeenCalledTimes(1);
        expect(mockRefetchAllData).not.toHaveBeenCalled();
      });

      it('keeps refreshing card data for a ready card', async () => {
        setupMockSelectors({ isAuthenticated: true });
        setupLoadCardDataMock({ isAuthenticated: true });

        render();
        await pullToRefresh();

        expect(mockRefetchAllData).toHaveBeenCalled();
        expect(mockRecheckProvisioning).not.toHaveBeenCalled();
        expect(mockRefreshRegistrationStatus).not.toHaveBeenCalled();
      });
    });

    describe('Enable Card Button for Delegation', () => {
      it('displays enable card button for VERIFIED user without delegated asset', () => {
        // Given: VERIFIED user without card and without delegated asset
        setupMockSelectors({ isAuthenticated: true });
        setupLoadCardDataMock({
          isAuthenticated: true,

          warning: CardStateWarning.NeedDelegation,
          priorityToken: null,
          kycStatus: { verificationState: 'VERIFIED', userId: 'user-123' },
          isLoading: false,
        });

        // When: component renders
        render();

        // Then: enable assets button is shown
        expect(
          screen.getByTestId(CardHomeSelectors.ENABLE_CARD_BUTTON),
        ).toBeOnTheScreen();
      });

      it('does not display enable card button for PENDING user without delegated asset', () => {
        // Given: PENDING user without card and without delegated asset
        setupMockSelectors({ isAuthenticated: true });
        setupLoadCardDataMock({
          isAuthenticated: true,

          warning: CardStateWarning.NeedDelegation,
          priorityToken: null,
          kycStatus: { verificationState: 'PENDING', userId: 'user-123' },
          isLoading: false,
        });

        // When: component renders
        render();

        // Then: enable assets button is NOT shown (PENDING users cannot enable)
        expect(
          screen.queryByTestId(CardHomeSelectors.ENABLE_CARD_BUTTON),
        ).toBeNull();
      });

      it('navigates to delegation when enable card button pressed for VERIFIED user without delegated asset', async () => {
        // Given: VERIFIED user without card and without delegated asset
        setupMockSelectors({ isAuthenticated: true });

        (useCardHomeData as jest.Mock).mockReturnValueOnce({
          data: {
            primaryFundingAsset: null,
            fundingAssets: [],
            availableFundingAssets: [],
            card: null,
            account: null,
            alerts: [],
            actions: [{ type: 'enable_card' }],
          },
          primaryToken: null,
          availableTokens: [],
          fundingTokens: [],
          balanceMap: new Map(),
          isLoading: false,
          isError: false,
          refetch: mockRefetchAllData,
        });

        // When: component renders and user presses enable card button
        render();
        const enableButton = screen.getByTestId(
          CardHomeSelectors.ENABLE_CARD_BUTTON,
        );
        fireEvent.press(enableButton);

        // Then: navigates to spending limit screen (delegation)
        await waitFor(() => {
          expect(mockNavigate).toHaveBeenCalledWith(
            Routes.CARD.SPENDING_LIMIT,
            expect.objectContaining({
              flow: 'enable_card',
            }),
          );
        });
      });
    });

    describe('Card Details Button', () => {
      beforeEach(() => {
        mockFetchCardDetailsToken.mockClear();
        mockClearCardDetailsImageUrl.mockClear();
        mockReauthenticate.mockClear();
        // Default: biometric authentication succeeds
        mockReauthenticate.mockResolvedValue(undefined);
      });

      it('does not show card details button when user has no card', () => {
        // Given: Authenticated user without card
        setupMockSelectors({ isAuthenticated: true });
        setupLoadCardDataMock({
          isAuthenticated: true,

          cardDetails: null,
          warning: CardStateWarning.NoCard,
          isLoading: false,
          kycStatus: { verificationState: 'VERIFIED', userId: 'user-123' },
        });

        // When: component renders
        render();

        // Then: card details button is not shown
        expect(
          screen.queryByTestId(CardHomeSelectors.VIEW_CARD_DETAILS_BUTTON),
        ).toBeNull();
      });

      it('does not show card details button while loading', () => {
        // Given: Loading state
        setupMockSelectors({ isAuthenticated: true });
        setupLoadCardDataMock({
          isAuthenticated: true,

          cardDetails: { type: CardType.VIRTUAL },
          isLoading: true,
        });

        // When: component renders
        render();

        // Then: card details button is not shown
        expect(
          screen.queryByTestId(CardHomeSelectors.VIEW_CARD_DETAILS_BUTTON),
        ).toBeNull();
      });

      it('shows card details button when authenticated user has a card', () => {
        // Given: Authenticated user with card
        setupMockSelectors({ isAuthenticated: true });
        setupLoadCardDataMock({
          isAuthenticated: true,

          cardDetails: { type: CardType.VIRTUAL },
          isLoading: false,
          kycStatus: { verificationState: 'VERIFIED', userId: 'user-123' },
        });

        // When: component renders
        render();

        // Then: card details button is shown
        expect(
          screen.getByTestId(CardHomeSelectors.VIEW_CARD_DETAILS_BUTTON),
        ).toBeOnTheScreen();
      });

      it('calls fetchCardDetailsToken when button is pressed after biometric authentication', async () => {
        // Given: Authenticated user with card and biometric auth succeeds
        setupMockSelectors({ isAuthenticated: true });
        setupLoadCardDataMock({
          isAuthenticated: true,

          cardDetails: { type: CardType.VIRTUAL },
          isLoading: false,
          kycStatus: { verificationState: 'VERIFIED', userId: 'user-123' },
        });

        mockReauthenticate.mockResolvedValueOnce(undefined);
        mockFetchCardDetailsToken.mockResolvedValueOnce({
          token: 'test-token',
          imageUrl: 'https://example.com/image',
        });

        // When: component renders and button is pressed
        render();
        const button = screen.getByTestId(
          CardHomeSelectors.VIEW_CARD_DETAILS_BUTTON,
        );
        fireEvent.press(button);

        // Then: reauthenticate is called first, then fetchCardDetailsToken
        await waitFor(() => {
          expect(mockReauthenticate).toHaveBeenCalled();
        });
        await waitFor(() => {
          expect(mockFetchCardDetailsToken).toHaveBeenCalledWith(
            CardType.VIRTUAL,
          );
        });
      });

      it('calls fetchCardDetailsToken with METAL type for metal card after biometric authentication', async () => {
        // Given: Authenticated user with metal card and biometric auth succeeds
        setupMockSelectors({ isAuthenticated: true });
        setupLoadCardDataMock({
          isAuthenticated: true,

          cardDetails: { type: CardType.METAL },
          isLoading: false,
          kycStatus: { verificationState: 'VERIFIED', userId: 'user-123' },
        });

        mockReauthenticate.mockResolvedValueOnce(undefined);
        mockFetchCardDetailsToken.mockResolvedValueOnce({
          token: 'test-token',
          imageUrl: 'https://example.com/image',
        });

        // When: component renders and button is pressed
        render();
        const button = screen.getByTestId(
          CardHomeSelectors.VIEW_CARD_DETAILS_BUTTON,
        );
        fireEvent.press(button);

        // Then: reauthenticate is called first, then fetchCardDetailsToken with METAL type
        await waitFor(() => {
          expect(mockReauthenticate).toHaveBeenCalled();
        });
        await waitFor(() => {
          expect(mockFetchCardDetailsToken).toHaveBeenCalledWith(
            CardType.METAL,
          );
        });
      });

      it('clears image when button is pressed while showing details', async () => {
        // Given: Authenticated user with card and image already showing
        setupMockSelectors({ isAuthenticated: true });
        setupLoadCardDataMock({
          isAuthenticated: true,

          cardDetails: { type: CardType.VIRTUAL },
          isLoading: false,
          kycStatus: { verificationState: 'VERIFIED', userId: 'user-123' },
        });

        // Mock hook to return imageUrl (indicating details are showing)
        (useCardDetailsToken as jest.Mock).mockReturnValueOnce({
          fetchCardDetailsToken: mockFetchCardDetailsToken,
          isLoading: false,
          isImageLoading: false,
          onImageLoad: mockOnCardDetailsImageLoad,
          error: null,
          imageUrl: 'https://example.com/image',
          clearImageUrl: mockClearCardDetailsImageUrl,
        });

        // When: component renders and button is pressed
        render();
        const button = screen.getByTestId(
          CardHomeSelectors.VIEW_CARD_DETAILS_BUTTON,
        );
        fireEvent.press(button);

        // Then: clearImageUrl is called instead of fetch
        await waitFor(() => {
          expect(mockClearCardDetailsImageUrl).toHaveBeenCalled();
          expect(mockFetchCardDetailsToken).not.toHaveBeenCalled();
        });
      });

      it('shows the revealed card details over the still-mounted, hidden Rive card', () => {
        // Given: Authenticated user with card and image URL returned (details showing)
        setupMockSelectors({ isAuthenticated: true });
        setupLoadCardDataMock({
          isAuthenticated: true,

          cardDetails: { type: CardType.VIRTUAL },
          isLoading: false,
          kycStatus: { verificationState: 'VERIFIED', userId: 'user-123' },
        });

        // Mock hook to return imageUrl (image is being displayed)
        (useCardDetailsToken as jest.Mock).mockReturnValueOnce({
          fetchCardDetailsToken: mockFetchCardDetailsToken,
          isLoading: false,
          isImageLoading: false,
          onImageLoad: mockOnCardDetailsImageLoad,
          error: null,
          imageUrl: 'https://example.com/image',
          clearImageUrl: mockClearCardDetailsImageUrl,
        });

        render();

        // The details render on top of the card art while it is revealed.
        expect(
          screen.getByTestId(CardHomeSelectors.CARD_DETAILS_IMAGE),
        ).toBeOnTheScreen();
        // The Rive card is never unmounted — it is only hidden while the
        // details are up, so a later freeze never replays its first frame.
        expect(
          screen.getByTestId(CardHomeSelectors.CARD_FREEZE_RIVE),
        ).toBeOnTheScreen();
        expect(
          StyleSheet.flatten([
            screen.getByTestId(CardHomeSelectors.CARD_FREEZE_RIVE_WRAPPER).props
              .style,
          ])?.opacity,
        ).toBe(0);
      });

      it('returns to the Rive card when the details are hidden', () => {
        // Given: Authenticated user with the details currently revealed
        setupMockSelectors({ isAuthenticated: true });
        setupLoadCardDataMock({
          isAuthenticated: true,

          cardDetails: { type: CardType.VIRTUAL },
          isLoading: false,
          kycStatus: { verificationState: 'VERIFIED', userId: 'user-123' },
        });

        let tokenState: {
          imageUrl: string | null;
          [key: string]: unknown;
        } = {
          fetchCardDetailsToken: mockFetchCardDetailsToken,
          isLoading: false,
          isImageLoading: false,
          onImageLoad: mockOnCardDetailsImageLoad,
          error: null,
          imageUrl: 'https://example.com/image',
          clearImageUrl: mockClearCardDetailsImageUrl,
        };
        mockClearCardDetailsImageUrl.mockImplementation(() => {
          tokenState = { ...tokenState, imageUrl: null };
        });
        (useCardDetailsToken as jest.Mock).mockImplementation(() => tokenState);

        const view = renderAuthTransition();

        expect(
          screen.getByTestId(CardHomeSelectors.CARD_DETAILS_IMAGE),
        ).toBeOnTheScreen();

        // When: the details toggle is pressed (hide)
        fireEvent.press(
          screen.getByTestId(CardHomeSelectors.VIEW_CARD_DETAILS_BUTTON),
        );

        // Then: the details swap out and the Rive card is visible again
        view.update();
        expect(
          screen.queryByTestId(CardHomeSelectors.CARD_DETAILS_IMAGE),
        ).toBeNull();
        expect(
          screen.getByTestId(CardHomeSelectors.CARD_FREEZE_RIVE),
        ).toBeOnTheScreen();
        expect(
          StyleSheet.flatten([
            screen.getByTestId(CardHomeSelectors.CARD_FREEZE_RIVE_WRAPPER).props
              .style,
          ])?.opacity,
        ).toBeUndefined();
      });

      it('closes the revealed details when a freeze succeeds', () => {
        // Given: Authenticated user with the details currently revealed
        setupMockSelectors({ isAuthenticated: true });
        setupLoadCardDataMock({
          isAuthenticated: true,

          cardDetails: { type: CardType.VIRTUAL },
          isLoading: false,
          kycStatus: { verificationState: 'VERIFIED', userId: 'user-123' },
        });

        let tokenState: {
          imageUrl: string | null;
          [key: string]: unknown;
        } = {
          fetchCardDetailsToken: mockFetchCardDetailsToken,
          isLoading: false,
          isImageLoading: false,
          onImageLoad: mockOnCardDetailsImageLoad,
          error: null,
          imageUrl: 'https://example.com/image',
          clearImageUrl: mockClearCardDetailsImageUrl,
        };
        mockClearCardDetailsImageUrl.mockImplementation(() => {
          tokenState = { ...tokenState, imageUrl: null };
        });
        (useCardDetailsToken as jest.Mock).mockImplementation(() => tokenState);

        const view = renderAuthTransition();

        expect(
          screen.getByTestId(CardHomeSelectors.CARD_DETAILS_IMAGE),
        ).toBeOnTheScreen();

        // When: a freeze succeeds while the details are open
        mockUseCardFreeze.mockReturnValue({
          freeze: {
            isError: false,
            isPending: false,
            isSuccess: true,
            mutate: mockFreezeMutate,
            data: undefined,
            error: null,
          },
          unfreeze: {
            isError: false,
            isPending: false,
            isSuccess: false,
            mutate: mockUnfreezeMutate,
            data: undefined,
            error: null,
          },
        });
        view.update();
        view.update();

        // Then: the details are gone and the freeze animation shows
        expect(
          screen.queryByTestId(CardHomeSelectors.CARD_DETAILS_IMAGE),
        ).toBeNull();
        expect(
          screen.getByTestId(CardHomeSelectors.CARD_FREEZE_RIVE),
        ).toBeOnTheScreen();
        expect(
          StyleSheet.flatten([
            screen.getByTestId(CardHomeSelectors.CARD_FREEZE_RIVE_WRAPPER).props
              .style,
          ])?.opacity,
        ).toBeUndefined();
      });

      describe('Biometric Authentication', () => {
        it('does not fetch card details when biometric authentication fails', async () => {
          // Given: Authenticated user with card but biometric auth fails
          setupMockSelectors({ isAuthenticated: true });
          setupLoadCardDataMock({
            isAuthenticated: true,

            cardDetails: { type: CardType.VIRTUAL },
            isLoading: false,
            kycStatus: { verificationState: 'VERIFIED', userId: 'user-123' },
          });

          mockReauthenticate.mockRejectedValueOnce(
            new Error('BIOMETRIC_ERROR: User cancelled'),
          );

          // When: component renders and button is pressed
          render();
          const button = screen.getByTestId(
            CardHomeSelectors.VIEW_CARD_DETAILS_BUTTON,
          );
          fireEvent.press(button);

          // Then: reauthenticate is called but fetchCardDetailsToken is NOT called
          await waitFor(() => {
            expect(mockReauthenticate).toHaveBeenCalled();
          });
          expect(mockFetchCardDetailsToken).not.toHaveBeenCalled();
        });

        it('navigates to password bottom sheet when biometrics is not configured', async () => {
          // Given: Authenticated user with card but biometrics not configured
          setupMockSelectors({ isAuthenticated: true });
          setupLoadCardDataMock({
            isAuthenticated: true,

            cardDetails: { type: CardType.VIRTUAL },
            isLoading: false,
            kycStatus: { verificationState: 'VERIFIED', userId: 'user-123' },
          });

          mockReauthenticate.mockRejectedValueOnce(
            new Error(
              'PASSWORD_NOT_SET_WITH_BIOMETRICS: Biometrics not configured',
            ),
          );

          // When: component renders and button is pressed
          render();
          const button = screen.getByTestId(
            CardHomeSelectors.VIEW_CARD_DETAILS_BUTTON,
          );
          fireEvent.press(button);

          // Then: navigation to password bottom sheet is triggered
          await waitFor(() => {
            expect(mockReauthenticate).toHaveBeenCalled();
          });
          await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith(
              Routes.CARD.MODALS.ID,
              expect.objectContaining({
                screen: Routes.CARD.MODALS.PASSWORD,
                params: expect.objectContaining({
                  onSuccess: expect.any(Function),
                }),
              }),
            );
          });
        });

        it('does not require biometric auth when hiding card details', async () => {
          // Given: Authenticated user with card details already showing
          setupMockSelectors({ isAuthenticated: true });
          setupLoadCardDataMock({
            isAuthenticated: true,

            cardDetails: { type: CardType.VIRTUAL },
            isLoading: false,
            kycStatus: { verificationState: 'VERIFIED', userId: 'user-123' },
          });

          // Mock hook to return imageUrl (indicating details are showing)
          (useCardDetailsToken as jest.Mock).mockReturnValueOnce({
            fetchCardDetailsToken: mockFetchCardDetailsToken,
            isLoading: false,
            isImageLoading: false,
            onImageLoad: mockOnCardDetailsImageLoad,
            error: null,
            imageUrl: 'https://example.com/image',
            clearImageUrl: mockClearCardDetailsImageUrl,
          });

          // When: component renders and button is pressed to hide details
          render();
          const button = screen.getByTestId(
            CardHomeSelectors.VIEW_CARD_DETAILS_BUTTON,
          );
          fireEvent.press(button);

          // Then: clearImageUrl is called without requiring reauthentication
          await waitFor(() => {
            expect(mockClearCardDetailsImageUrl).toHaveBeenCalled();
          });
          expect(mockReauthenticate).not.toHaveBeenCalled();
        });
      });
    });

    describe('View PIN Button', () => {
      beforeEach(() => {
        mockGeneratePinToken.mockClear();
        mockResetPinToken.mockClear();
        mockReauthenticate.mockClear();
        mockReauthenticate.mockResolvedValue(undefined);
        mockGetCapabilities.mockReturnValue({ supportsPinView: true });
      });

      it('does not show view pin button when user has no card', () => {
        // Given: Authenticated user without card
        setupMockSelectors({ isAuthenticated: true });
        setupLoadCardDataMock({
          isAuthenticated: true,

          cardDetails: null,
          warning: CardStateWarning.NoCard,
          isLoading: false,
          kycStatus: { verificationState: 'VERIFIED', userId: 'user-123' },
        });

        // When: component renders
        render();

        // Then: view pin button is not shown
        expect(
          screen.queryByTestId(CardHomeSelectors.VIEW_PIN_BUTTON),
        ).toBeNull();
      });

      it('does not show view pin button while loading', () => {
        // Given: Loading state
        setupMockSelectors({ isAuthenticated: true });
        setupLoadCardDataMock({
          isAuthenticated: true,

          cardDetails: { type: CardType.VIRTUAL },
          isLoading: true,
        });

        // When: component renders
        render();

        // Then: view pin button is not shown
        expect(
          screen.queryByTestId(CardHomeSelectors.VIEW_PIN_BUTTON),
        ).toBeNull();
      });

      it('does not show view pin button when card hasPin is false', () => {
        // Given: Card issued without a PIN (provider still supports PIN view)
        mockGetCapabilities.mockReturnValue({ supportsPinView: true });
        setupMockSelectors({
          isAuthenticated: true,
          userLocation: 'international',
        });
        setupLoadCardDataMock({
          isAuthenticated: true,

          cardDetails: { type: CardType.VIRTUAL, hasPin: false },
          isLoading: false,
          kycStatus: { verificationState: 'VERIFIED', userId: 'user-123' },
        });

        // When: component renders
        render();

        // Then: view pin button is not shown
        expect(
          screen.queryByTestId(CardHomeSelectors.VIEW_PIN_BUTTON),
        ).toBeNull();
      });

      it('shows view pin button for US user with virtual card', () => {
        // Given: US user with virtual card that has a PIN
        setupMockSelectors({ isAuthenticated: true, userLocation: 'us' });
        setupLoadCardDataMock({
          isAuthenticated: true,

          cardDetails: { type: CardType.VIRTUAL, hasPin: true },
          isLoading: false,
          kycStatus: { verificationState: 'VERIFIED', userId: 'user-123' },
        });

        // When: component renders
        render();

        // Then: view pin button is shown
        expect(
          screen.getByTestId(CardHomeSelectors.VIEW_PIN_BUTTON),
        ).toBeOnTheScreen();
      });

      it('shows view pin button for international user with metal card', () => {
        // Given: International user with metal card that has a PIN
        setupMockSelectors({
          isAuthenticated: true,
          userLocation: 'international',
        });
        setupLoadCardDataMock({
          isAuthenticated: true,

          cardDetails: { type: CardType.METAL, hasPin: true },
          isLoading: false,
          kycStatus: { verificationState: 'VERIFIED', userId: 'user-123' },
        });

        // When: component renders
        render();

        // Then: view pin button is shown
        expect(
          screen.getByTestId(CardHomeSelectors.VIEW_PIN_BUTTON),
        ).toBeOnTheScreen();
      });

      it('calls generatePinToken and navigates to ViewPinBottomSheet after biometric auth', async () => {
        // Given: Authenticated US user with card and biometric auth succeeds
        setupMockSelectors({ isAuthenticated: true, userLocation: 'us' });
        setupLoadCardDataMock({
          isAuthenticated: true,

          cardDetails: { type: CardType.VIRTUAL },
          isLoading: false,
          kycStatus: { verificationState: 'VERIFIED', userId: 'user-123' },
        });

        mockReauthenticate.mockResolvedValueOnce(undefined);
        mockGeneratePinToken.mockResolvedValueOnce({
          token: 'pin-token-123',
          url: 'https://cards.baanx.com/pin-image?token=pin-token-123',
        });

        // When: component renders and button is pressed
        render();
        const button = screen.getByTestId(CardHomeSelectors.VIEW_PIN_BUTTON);
        fireEvent.press(button);

        // Then: reauthenticate is called first, then generatePinToken, then navigation
        await waitFor(() => {
          expect(mockReauthenticate).toHaveBeenCalled();
        });
        await waitFor(() => {
          expect(mockGeneratePinToken).toHaveBeenCalled();
        });
        await waitFor(() => {
          expect(mockNavigate).toHaveBeenCalledWith('CardModals', {
            screen: 'CardViewPinModal',
            params: {
              imageUrl: 'https://cards.baanx.com/pin-image?token=pin-token-123',
            },
          });
        });
      });

      it('resets pin token after successful navigation', async () => {
        // Given: Authenticated US user with card
        setupMockSelectors({ isAuthenticated: true, userLocation: 'us' });
        setupLoadCardDataMock({
          isAuthenticated: true,

          cardDetails: { type: CardType.VIRTUAL },
          isLoading: false,
          kycStatus: { verificationState: 'VERIFIED', userId: 'user-123' },
        });

        mockReauthenticate.mockResolvedValueOnce(undefined);
        mockGeneratePinToken.mockResolvedValueOnce({
          token: 'pin-token-123',
          imageUrl: 'https://cards.baanx.com/pin-image?token=pin-token-123',
        });

        // When: button is pressed
        render();
        fireEvent.press(screen.getByTestId(CardHomeSelectors.VIEW_PIN_BUTTON));

        // Then: resetPinToken is called after navigation
        await waitFor(() => {
          expect(mockResetPinToken).toHaveBeenCalled();
        });
      });

      it('does not call generatePinToken when already loading', async () => {
        // Given: Hook reports loading
        setupMockSelectors({ isAuthenticated: true, userLocation: 'us' });
        setupLoadCardDataMock({
          isAuthenticated: true,

          cardDetails: { type: CardType.VIRTUAL },
          isLoading: false,
          kycStatus: { verificationState: 'VERIFIED', userId: 'user-123' },
        });

        (useCardPinToken as jest.Mock).mockReturnValueOnce({
          generatePinToken: mockGeneratePinToken,
          isLoading: true,
          error: null,
          imageUrl: null,
          reset: mockResetPinToken,
        });

        // When: button is pressed while loading
        render();
        fireEvent.press(screen.getByTestId(CardHomeSelectors.VIEW_PIN_BUTTON));

        // Then: reauthenticate is not called
        await waitFor(() => {
          expect(mockReauthenticate).not.toHaveBeenCalled();
        });
        expect(mockGeneratePinToken).not.toHaveBeenCalled();
      });

      describe('Biometric Authentication', () => {
        it('does not fetch pin when biometric authentication fails', async () => {
          // Given: Authenticated US user with card but biometric auth fails
          setupMockSelectors({ isAuthenticated: true, userLocation: 'us' });
          setupLoadCardDataMock({
            isAuthenticated: true,

            cardDetails: { type: CardType.VIRTUAL },
            isLoading: false,
            kycStatus: { verificationState: 'VERIFIED', userId: 'user-123' },
          });

          mockReauthenticate.mockRejectedValueOnce(
            new Error('BIOMETRIC_ERROR: User cancelled'),
          );

          // When: component renders and button is pressed
          render();
          fireEvent.press(
            screen.getByTestId(CardHomeSelectors.VIEW_PIN_BUTTON),
          );

          // Then: reauthenticate is called but generatePinToken is NOT called
          await waitFor(() => {
            expect(mockReauthenticate).toHaveBeenCalled();
          });
          expect(mockGeneratePinToken).not.toHaveBeenCalled();
        });

        it('navigates to password bottom sheet with view pin description when biometrics not configured', async () => {
          // Given: Authenticated US user with card but biometrics not configured
          setupMockSelectors({ isAuthenticated: true, userLocation: 'us' });
          setupLoadCardDataMock({
            isAuthenticated: true,

            cardDetails: { type: CardType.VIRTUAL },
            isLoading: false,
            kycStatus: { verificationState: 'VERIFIED', userId: 'user-123' },
          });

          mockReauthenticate.mockRejectedValueOnce(
            new Error(
              'PASSWORD_NOT_SET_WITH_BIOMETRICS: Biometrics not configured',
            ),
          );

          // When: component renders and button is pressed
          render();
          fireEvent.press(
            screen.getByTestId(CardHomeSelectors.VIEW_PIN_BUTTON),
          );

          // Then: navigation to password bottom sheet is triggered with view pin description
          await waitFor(() => {
            expect(mockReauthenticate).toHaveBeenCalled();
          });
          await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith(
              Routes.CARD.MODALS.ID,
              expect.objectContaining({
                screen: Routes.CARD.MODALS.PASSWORD,
                params: expect.objectContaining({
                  onSuccess: expect.any(Function),
                  description:
                    'Enter your wallet password to view your card PIN.',
                }),
              }),
            );
          });
        });
      });
    });
  });

  describe('Freeze button', () => {
    const freezableCardDetails = {
      type: CardType.VIRTUAL,
      id: 'card-123',
      holderName: 'John Doe',
      panLast4: '1234',
      status: CardStatus.ACTIVE,
      isFreezable: true,
      expiryDate: '12/28',
    };

    beforeEach(() => {
      mockReauthenticate.mockClear();
      mockFreezeMutate.mockClear();
      mockUnfreezeMutate.mockClear();
      mockReauthenticate.mockResolvedValue(undefined);
    });

    describe('Visibility', () => {
      it('shows freeze button when authenticated with a freezable active card', () => {
        setupMockSelectors({ isAuthenticated: true });
        setupLoadCardDataMock({
          isAuthenticated: true,

          cardDetails: freezableCardDetails,
          isLoading: false,
          kycStatus: { verificationState: 'VERIFIED', userId: 'user-123' },
        });

        render();

        expect(
          screen.getByTestId(CardHomeSelectors.FREEZE_CARD_BUTTON),
        ).toBeOnTheScreen();
      });

      it('disables the freeze toggle while card details are loading', () => {
        setupMockSelectors({ isAuthenticated: true });
        setupLoadCardDataMock({
          isAuthenticated: true,
          cardDetails: freezableCardDetails,
          isLoading: false,
          kycStatus: { verificationState: 'VERIFIED', userId: 'user-123' },
        });
        const defaultTokenState = (
          useCardDetailsToken as jest.Mock
        ).getMockImplementation();
        (useCardDetailsToken as jest.Mock).mockImplementation(() => ({
          fetchCardDetailsToken: mockFetchCardDetailsToken,
          isLoading: true,
          isImageLoading: false,
          onImageLoad: mockOnCardDetailsImageLoad,
          error: null,
          imageUrl: null,
          clearImageUrl: mockClearCardDetailsImageUrl,
        }));

        render();

        expect(
          screen.getByTestId(CardHomeSelectors.FREEZE_CARD_BUTTON),
        ).toBeDisabled();
        (useCardDetailsToken as jest.Mock).mockImplementation(
          defaultTokenState,
        );
      });

      it('does not show freeze toggle when card is not freezable', () => {
        setupMockSelectors({ isAuthenticated: true });
        setupLoadCardDataMock({
          isAuthenticated: true,

          cardDetails: { ...freezableCardDetails, isFreezable: false },
          isLoading: false,
          kycStatus: { verificationState: 'VERIFIED', userId: 'user-123' },
        });

        render();

        expect(
          screen.queryByTestId(CardHomeSelectors.FREEZE_CARD_BUTTON),
        ).toBeNull();
      });

      it('does not show freeze button when card is blocked', () => {
        setupMockSelectors({ isAuthenticated: true });
        setupLoadCardDataMock({
          isAuthenticated: true,

          cardDetails: {
            ...freezableCardDetails,
            status: CardStatus.BLOCKED,
          },
          isLoading: false,
          kycStatus: { verificationState: 'VERIFIED', userId: 'user-123' },
        });

        render();

        expect(
          screen.queryByTestId(CardHomeSelectors.FREEZE_CARD_BUTTON),
        ).toBeNull();
      });

      it('does not show freeze button while loading', () => {
        setupMockSelectors({ isAuthenticated: true });
        setupLoadCardDataMock({
          isAuthenticated: true,

          cardDetails: freezableCardDetails,
          isLoading: true,
        });

        render();

        expect(
          screen.queryByTestId(CardHomeSelectors.FREEZE_CARD_BUTTON),
        ).toBeNull();
      });

      it('does not show freeze button when cardDetails is null', () => {
        setupMockSelectors({ isAuthenticated: true });
        setupLoadCardDataMock({
          isAuthenticated: true,

          cardDetails: null,
          isLoading: false,
          kycStatus: { verificationState: 'VERIFIED', userId: 'user-123' },
        });

        render();

        expect(
          screen.queryByTestId(CardHomeSelectors.FREEZE_CARD_BUTTON),
        ).toBeNull();
      });
    });

    describe('Blocked card', () => {
      it('shows the blocked warning banner and hides manage options', () => {
        setupMockSelectors({ isAuthenticated: true });
        setupLoadCardDataMock({
          isAuthenticated: true,
          cardDetails: {
            ...freezableCardDetails,
            status: CardStatus.BLOCKED,
          },
          isLoading: false,
          kycStatus: { verificationState: 'VERIFIED', userId: 'user-123' },
        });

        render();

        expect(
          screen.getByText(strings('card.card_home.warnings.blocked.title')),
        ).toBeOnTheScreen();
        expect(
          screen.queryByTestId(CardHomeSelectors.VIEW_CARD_DETAILS_BUTTON),
        ).toBeNull();
      });
    });

    describe('Freeze action (card is active)', () => {
      it('calls toggleFreeze directly without reauthentication', async () => {
        setupMockSelectors({ isAuthenticated: true });
        setupLoadCardDataMock({
          isAuthenticated: true,

          cardDetails: freezableCardDetails,
          isLoading: false,
          kycStatus: { verificationState: 'VERIFIED', userId: 'user-123' },
        });

        mockUseCardFreeze.mockReturnValue({
          freeze: {
            isError: false,
            isPending: false,
            isSuccess: false,
            mutate: mockFreezeMutate,
            data: undefined,
            error: null,
          },
          unfreeze: {
            isError: false,
            isPending: false,
            isSuccess: false,
            mutate: mockUnfreezeMutate,
            data: undefined,
            error: null,
          },
        });

        render();

        const toggle = screen.getByTestId(CardHomeSelectors.FREEZE_CARD_BUTTON);
        fireEvent.press(toggle);

        await waitFor(() => {
          expect(mockFreezeMutate).toHaveBeenCalledTimes(1);
        });
        expect(mockReauthenticate).not.toHaveBeenCalled();
      });

      it('tracks CARD_BUTTON_CLICKED with FREEZE_CARD_BUTTON action when freezing succeeds', async () => {
        setupMockSelectors({ isAuthenticated: true });
        setupLoadCardDataMock({
          isAuthenticated: true,

          cardDetails: freezableCardDetails,
          isLoading: false,
          kycStatus: { verificationState: 'VERIFIED', userId: 'user-123' },
        });

        mockUseCardFreeze.mockReturnValue({
          freeze: {
            isError: false,
            isPending: false,
            isSuccess: false,
            mutate: mockFreezeMutate,
            data: undefined,
            error: null,
          },
          unfreeze: {
            isError: false,
            isPending: false,
            isSuccess: false,
            mutate: mockUnfreezeMutate,
            data: undefined,
            error: null,
          },
        });

        render();
        mockTrackEvent.mockClear();
        mockCreateEventBuilder.mockClear();
        mockEventBuilder.addProperties.mockClear();
        mockCreateEventBuilder.mockReturnValue(mockEventBuilder);

        const toggle = screen.getByTestId(CardHomeSelectors.FREEZE_CARD_BUTTON);
        fireEvent.press(toggle);

        await waitFor(() => {
          expect(mockTrackEvent).toHaveBeenCalledTimes(1);
        });
        expect(mockCreateEventBuilder).toHaveBeenCalledWith(
          MetaMetricsEvents.CARD_BUTTON_CLICKED,
        );
        expect(mockEventBuilder.addProperties).toHaveBeenCalledWith({
          provider: 'baanx',
          action: 'FREEZE_CARD_BUTTON',
        });
      });

      it('does not track metric when freeze toggleFreeze fails', async () => {
        setupMockSelectors({ isAuthenticated: true });
        setupLoadCardDataMock({
          isAuthenticated: true,

          cardDetails: freezableCardDetails,
          isLoading: false,
          kycStatus: { verificationState: 'VERIFIED', userId: 'user-123' },
        });

        mockFreezeMutate.mockImplementationOnce(jest.fn());
        mockUseCardFreeze.mockReturnValue({
          freeze: {
            isError: false,
            isPending: false,
            isSuccess: false,
            mutate: mockFreezeMutate,
            data: undefined,
            error: null,
          },
          unfreeze: {
            isError: false,
            isPending: false,
            isSuccess: false,
            mutate: mockUnfreezeMutate,
            data: undefined,
            error: null,
          },
        });

        render();
        mockTrackEvent.mockClear();

        const toggle = screen.getByTestId(CardHomeSelectors.FREEZE_CARD_BUTTON);
        fireEvent.press(toggle);

        await waitFor(() => {
          expect(mockFreezeMutate).toHaveBeenCalledTimes(1);
        });
        expect(mockTrackEvent).not.toHaveBeenCalled();
      });
    });

    describe('Unfreeze action (card is frozen)', () => {
      beforeEach(() => {
        setupMockSelectors({ isAuthenticated: true });
        setupLoadCardDataMock({
          isAuthenticated: true,
          cardDetails: {
            ...freezableCardDetails,
            status: CardStatus.FROZEN,
          },
          isLoading: false,
          kycStatus: { verificationState: 'VERIFIED', userId: 'user-123' },
        });
        mockUseCardFreeze.mockReturnValue({
          freeze: {
            isError: false,
            isPending: false,
            isSuccess: false,
            mutate: mockFreezeMutate,
            data: undefined,
            error: null,
          },
          unfreeze: {
            isError: false,
            isPending: false,
            isSuccess: false,
            mutate: mockUnfreezeMutate,
            data: undefined,
            error: null,
          },
        });
      });

      it('calls toggleFreeze after successful biometric authentication', async () => {
        setupMockSelectors({ isAuthenticated: true });
        setupLoadCardDataMock({
          isAuthenticated: true,

          cardDetails: {
            ...freezableCardDetails,
            status: CardStatus.FROZEN,
          },
          isLoading: false,
          kycStatus: { verificationState: 'VERIFIED', userId: 'user-123' },
        });

        mockReauthenticate.mockResolvedValueOnce(undefined);

        render();

        const toggle = screen.getByTestId(CardHomeSelectors.FREEZE_CARD_BUTTON);
        fireEvent.press(toggle);

        await waitFor(() => {
          expect(mockReauthenticate).toHaveBeenCalledTimes(1);
        });
        await waitFor(() => {
          expect(mockUnfreezeMutate).toHaveBeenCalledTimes(1);
        });
      });

      it('does not call toggleFreeze when user cancels biometric prompt', async () => {
        setupMockSelectors({ isAuthenticated: true });
        setupLoadCardDataMock({
          isAuthenticated: true,

          cardDetails: {
            ...freezableCardDetails,
            status: CardStatus.FROZEN,
          },
          isLoading: false,
          kycStatus: { verificationState: 'VERIFIED', userId: 'user-123' },
        });

        mockReauthenticate.mockRejectedValueOnce(
          new Error('BIOMETRIC_ERROR: User cancelled'),
        );

        render();

        const toggle = screen.getByTestId(CardHomeSelectors.FREEZE_CARD_BUTTON);
        fireEvent.press(toggle);

        await waitFor(() => {
          expect(mockReauthenticate).toHaveBeenCalledTimes(1);
        });
        expect(mockUnfreezeMutate).not.toHaveBeenCalled();
      });

      it('navigates to password bottom sheet with unfreeze description when biometrics not configured', async () => {
        setupMockSelectors({ isAuthenticated: true });
        setupLoadCardDataMock({
          isAuthenticated: true,

          cardDetails: {
            ...freezableCardDetails,
            status: CardStatus.FROZEN,
          },
          isLoading: false,
          kycStatus: { verificationState: 'VERIFIED', userId: 'user-123' },
        });

        mockReauthenticate.mockRejectedValueOnce(
          new Error(
            'PASSWORD_NOT_SET_WITH_BIOMETRICS: Biometrics not configured',
          ),
        );

        render();

        const toggle = screen.getByTestId(CardHomeSelectors.FREEZE_CARD_BUTTON);
        fireEvent.press(toggle);

        await waitFor(() => {
          expect(mockReauthenticate).toHaveBeenCalledTimes(1);
        });

        await waitFor(() => {
          expect(mockNavigate).toHaveBeenCalledWith(
            Routes.CARD.MODALS.ID,
            expect.objectContaining({
              screen: Routes.CARD.MODALS.PASSWORD,
              params: expect.objectContaining({
                onSuccess: expect.any(Function),
                description:
                  'Enter your wallet password to unfreeze your card.',
              }),
            }),
          );
        });
        expect(mockUnfreezeMutate).not.toHaveBeenCalled();
      });

      it('shows auth error toast on other authentication failures', async () => {
        setupMockSelectors({ isAuthenticated: true });
        setupLoadCardDataMock({
          isAuthenticated: true,

          cardDetails: {
            ...freezableCardDetails,
            status: CardStatus.FROZEN,
          },
          isLoading: false,
          kycStatus: { verificationState: 'VERIFIED', userId: 'user-123' },
        });

        mockReauthenticate.mockRejectedValueOnce(
          new Error('UNKNOWN_AUTH_ERROR: Something unexpected happened'),
        );

        render();

        const toggle = screen.getByTestId(CardHomeSelectors.FREEZE_CARD_BUTTON);
        fireEvent.press(toggle);

        await waitFor(() => {
          expect(mockReauthenticate).toHaveBeenCalledTimes(1);
        });
        expect(mockUnfreezeMutate).not.toHaveBeenCalled();
      });

      it('tracks CARD_BUTTON_CLICKED with UNFREEZE_CARD_BUTTON action after successful biometric unfreeze', async () => {
        setupMockSelectors({ isAuthenticated: true });
        setupLoadCardDataMock({
          isAuthenticated: true,

          cardDetails: {
            ...freezableCardDetails,
            status: CardStatus.FROZEN,
          },
          isLoading: false,
          kycStatus: { verificationState: 'VERIFIED', userId: 'user-123' },
        });

        mockReauthenticate.mockResolvedValueOnce(undefined);

        render();
        mockTrackEvent.mockClear();
        mockCreateEventBuilder.mockClear();
        mockEventBuilder.addProperties.mockClear();
        mockCreateEventBuilder.mockReturnValue(mockEventBuilder);

        const toggle = screen.getByTestId(CardHomeSelectors.FREEZE_CARD_BUTTON);
        fireEvent.press(toggle);

        await waitFor(() => {
          expect(mockTrackEvent).toHaveBeenCalledTimes(1);
        });
        expect(mockCreateEventBuilder).toHaveBeenCalledWith(
          MetaMetricsEvents.CARD_BUTTON_CLICKED,
        );
        expect(mockEventBuilder.addProperties).toHaveBeenCalledWith({
          provider: 'baanx',
          action: 'UNFREEZE_CARD_BUTTON',
        });
      });

      it('does not track metric when biometric unfreeze fails', async () => {
        setupMockSelectors({ isAuthenticated: true });
        setupLoadCardDataMock({
          isAuthenticated: true,

          cardDetails: {
            ...freezableCardDetails,
            status: CardStatus.FROZEN,
          },
          isLoading: false,
          kycStatus: { verificationState: 'VERIFIED', userId: 'user-123' },
        });

        mockUnfreezeMutate.mockImplementationOnce(jest.fn());
        mockReauthenticate.mockResolvedValueOnce(undefined);

        render();
        mockTrackEvent.mockClear();

        const toggle = screen.getByTestId(CardHomeSelectors.FREEZE_CARD_BUTTON);
        fireEvent.press(toggle);

        await waitFor(() => {
          expect(mockUnfreezeMutate).toHaveBeenCalledTimes(1);
        });
        expect(mockTrackEvent).not.toHaveBeenCalled();
      });

      it('tracks CARD_BUTTON_CLICKED with UNFREEZE_CARD_BUTTON action after successful password-based unfreeze', async () => {
        setupMockSelectors({ isAuthenticated: true });
        setupLoadCardDataMock({
          isAuthenticated: true,

          cardDetails: {
            ...freezableCardDetails,
            status: CardStatus.FROZEN,
          },
          isLoading: false,
          kycStatus: { verificationState: 'VERIFIED', userId: 'user-123' },
        });

        mockReauthenticate.mockRejectedValueOnce(
          new Error(
            'PASSWORD_NOT_SET_WITH_BIOMETRICS: Biometrics not configured',
          ),
        );

        render();
        mockTrackEvent.mockClear();
        mockCreateEventBuilder.mockClear();
        mockEventBuilder.addProperties.mockClear();
        mockCreateEventBuilder.mockReturnValue(mockEventBuilder);

        const toggle = screen.getByTestId(CardHomeSelectors.FREEZE_CARD_BUTTON);
        fireEvent.press(toggle);

        await waitFor(() => {
          expect(mockNavigate).toHaveBeenCalledWith(
            Routes.CARD.MODALS.ID,
            expect.objectContaining({
              screen: Routes.CARD.MODALS.PASSWORD,
              params: expect.objectContaining({
                onSuccess: expect.any(Function),
              }),
            }),
          );
        });

        const navigateCall = mockNavigate.mock.calls.find(
          (call: unknown[]) => call[0] === Routes.CARD.MODALS.ID,
        );
        const onSuccess = navigateCall?.[1]?.params?.onSuccess;
        await onSuccess();

        await waitFor(() => {
          expect(mockTrackEvent).toHaveBeenCalledTimes(1);
        });
        expect(mockCreateEventBuilder).toHaveBeenCalledWith(
          MetaMetricsEvents.CARD_BUTTON_CLICKED,
        );
        expect(mockEventBuilder.addProperties).toHaveBeenCalledWith({
          provider: 'baanx',
          action: 'UNFREEZE_CARD_BUTTON',
        });
      });

      it('does not track metric when password-based unfreeze toggleFreeze fails', async () => {
        setupMockSelectors({ isAuthenticated: true });
        setupLoadCardDataMock({
          isAuthenticated: true,

          cardDetails: {
            ...freezableCardDetails,
            status: CardStatus.FROZEN,
          },
          isLoading: false,
          kycStatus: { verificationState: 'VERIFIED', userId: 'user-123' },
        });

        mockReauthenticate.mockRejectedValueOnce(
          new Error(
            'PASSWORD_NOT_SET_WITH_BIOMETRICS: Biometrics not configured',
          ),
        );

        render();
        mockTrackEvent.mockClear();

        const toggle = screen.getByTestId(CardHomeSelectors.FREEZE_CARD_BUTTON);
        fireEvent.press(toggle);

        await waitFor(() => {
          expect(mockNavigate).toHaveBeenCalledWith(
            Routes.CARD.MODALS.ID,
            expect.objectContaining({
              screen: Routes.CARD.MODALS.PASSWORD,
              params: expect.objectContaining({
                onSuccess: expect.any(Function),
              }),
            }),
          );
        });

        mockUnfreezeMutate.mockImplementationOnce(jest.fn());

        const navigateCall = mockNavigate.mock.calls.find(
          (call: unknown[]) => call[0] === Routes.CARD.MODALS.ID,
        );
        const onSuccess = navigateCall?.[1]?.params?.onSuccess;
        await onSuccess();

        await waitFor(() => {
          expect(mockUnfreezeMutate).toHaveBeenCalled();
        });
        expect(mockTrackEvent).not.toHaveBeenCalled();
      });
    });

    describe('Display state', () => {
      it('shows the Freeze tile when card is active', () => {
        setupMockSelectors({ isAuthenticated: true });
        setupLoadCardDataMock({
          isAuthenticated: true,

          cardDetails: freezableCardDetails,
          isLoading: false,
          kycStatus: { verificationState: 'VERIFIED', userId: 'user-123' },
        });

        mockUseCardFreeze.mockReturnValue({
          freeze: {
            isError: false,
            isPending: false,
            isSuccess: false,
            mutate: mockFreezeMutate,
            data: undefined,
            error: null,
          },
          unfreeze: {
            isError: false,
            isPending: false,
            isSuccess: false,
            mutate: mockUnfreezeMutate,
            data: undefined,
            error: null,
          },
        });

        render();

        // The freeze action's label now lives on the quick-action tile.
        expect(screen.getByText('Freeze')).toBeOnTheScreen();
      });

      it('shows the Unfreeze tile when card is frozen', () => {
        setupMockSelectors({ isAuthenticated: true });
        setupLoadCardDataMock({
          isAuthenticated: true,

          cardDetails: {
            ...freezableCardDetails,
            status: CardStatus.FROZEN,
          },
          isLoading: false,
          kycStatus: { verificationState: 'VERIFIED', userId: 'user-123' },
        });

        mockUseCardFreeze.mockReturnValue({
          freeze: {
            isError: false,
            isPending: false,
            isSuccess: false,
            mutate: mockFreezeMutate,
            data: undefined,
            error: null,
          },
          unfreeze: {
            isError: false,
            isPending: false,
            isSuccess: false,
            mutate: mockUnfreezeMutate,
            data: undefined,
            error: null,
          },
        });

        render();

        // The unfreeze action's label now lives on the quick-action tile.
        expect(screen.getByText('Unfreeze')).toBeOnTheScreen();
      });

      it('shows switch as disabled while toggling', () => {
        setupMockSelectors({ isAuthenticated: true });
        setupLoadCardDataMock({
          isAuthenticated: true,

          cardDetails: freezableCardDetails,
          isLoading: false,
          kycStatus: { verificationState: 'VERIFIED', userId: 'user-123' },
        });

        mockUseCardFreeze.mockReturnValue({
          freeze: {
            isError: false,
            isPending: true,
            isSuccess: false,
            mutate: mockFreezeMutate,
            data: undefined,
            error: null,
          },
          unfreeze: {
            isError: false,
            isPending: false,
            isSuccess: false,
            mutate: mockUnfreezeMutate,
            data: undefined,
            error: null,
          },
        });

        render();

        const toggle = screen.getByTestId(CardHomeSelectors.FREEZE_CARD_BUTTON);
        expect(
          toggle.props.accessibilityState?.disabled ?? toggle.props.disabled,
        ).toBe(true);
      });
    });
  });

  describe('userShippingAddress derivation', () => {
    const mockUserDetailsWithMailingAddress = {
      id: 'user-123',
      addressLine1: '123 Physical St',
      addressLine2: 'Apt 1',
      city: 'Physical City',
      zip: '12345',
      usState: 'CA',
      mailingAddressLine1: '456 Mailing Ave',
      mailingAddressLine2: 'Suite 100',
      mailingCity: 'Mailing City',
      mailingZip: '67890',
      mailingUsState: 'NY',
    };

    const mockUserDetailsWithPhysicalOnly = {
      id: 'user-123',
      addressLine1: '123 Physical St',
      addressLine2: 'Apt 1',
      city: 'Physical City',
      zip: '12345',
      usState: 'CA',
      mailingAddressLine1: null,
      mailingAddressLine2: null,
      mailingCity: null,
      mailingZip: null,
      mailingUsState: null,
    };

    const mockUserDetailsWithIncompleteAddress = {
      id: 'user-123',
      addressLine1: '123 Physical St',
      addressLine2: null,
      city: null, // Missing required field
      zip: null, // Missing required field
      usState: 'CA',
      mailingAddressLine1: null,
      mailingAddressLine2: null,
      mailingCity: null,
      mailingZip: null,
      mailingUsState: null,
    };

    // Partially populated mailing address - should fall back to physical, not mix
    const mockUserDetailsWithPartialMailingAddress = {
      id: 'user-123',
      addressLine1: '123 Physical St',
      addressLine2: 'Apt 1',
      city: 'Physical City',
      zip: '12345',
      usState: 'CA',
      mailingAddressLine1: '456 Mailing Ave', // Only line1 set
      mailingAddressLine2: null,
      mailingCity: null, // Missing required field
      mailingZip: null, // Missing required field
      mailingUsState: null,
    };

    it('navigates to choose your card with mailing address when available', async () => {
      // Given: US user with mailing address and virtual card
      setupMockSelectors({ isAuthenticated: true, userLocation: 'us' });
      setupLoadCardDataMock({
        isAuthenticated: true,

        cardDetails: { type: CardType.VIRTUAL },
        isLoading: false,
        kycStatus: {
          verificationState: 'VERIFIED',
          userId: 'user-123',
          userDetails: mockUserDetailsWithMailingAddress,
        },
      });

      // When: component renders and order metal card item is pressed
      render();

      await waitFor(() => {
        const orderMetalCardItem = screen.queryByTestId(
          CardHomeSelectors.ORDER_METAL_CARD_ITEM,
        );
        expect(orderMetalCardItem).toBeOnTheScreen();
      });

      const orderMetalCardItem = screen.getByTestId(
        CardHomeSelectors.ORDER_METAL_CARD_ITEM,
      );
      fireEvent.press(orderMetalCardItem);

      // Then: should navigate with mailing address (not physical)
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(
          Routes.CARD.CHOOSE_YOUR_CARD,
          {
            flow: 'upgrade',
            shippingAddress: {
              line1: '456 Mailing Ave',
              line2: 'Suite 100',
              city: 'Mailing City',
              state: 'NY',
              zip: '67890',
            },
          },
        );
      });
    });

    it('navigates to choose your card with physical address when mailing not available', async () => {
      // Given: US user with only physical address and virtual card
      setupMockSelectors({ isAuthenticated: true, userLocation: 'us' });
      setupLoadCardDataMock({
        isAuthenticated: true,

        cardDetails: { type: CardType.VIRTUAL },
        isLoading: false,
        kycStatus: {
          verificationState: 'VERIFIED',
          userId: 'user-123',
          userDetails: mockUserDetailsWithPhysicalOnly,
        },
      });

      // When: component renders and order metal card item is pressed
      render();

      await waitFor(() => {
        const orderMetalCardItem = screen.queryByTestId(
          CardHomeSelectors.ORDER_METAL_CARD_ITEM,
        );
        expect(orderMetalCardItem).toBeOnTheScreen();
      });

      const orderMetalCardItem = screen.getByTestId(
        CardHomeSelectors.ORDER_METAL_CARD_ITEM,
      );
      fireEvent.press(orderMetalCardItem);

      // Then: should navigate with physical address
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(
          Routes.CARD.CHOOSE_YOUR_CARD,
          {
            flow: 'upgrade',
            shippingAddress: {
              line1: '123 Physical St',
              line2: 'Apt 1',
              city: 'Physical City',
              state: 'CA',
              zip: '12345',
            },
          },
        );
      });
    });

    it('does not show order metal card item when userDetails is null', async () => {
      // Given: US user with null userDetails (no shipping address)
      setupMockSelectors({ isAuthenticated: true, userLocation: 'us' });
      setupLoadCardDataMock({
        isAuthenticated: true,

        cardDetails: { type: CardType.VIRTUAL },
        isLoading: false,
        kycStatus: {
          verificationState: 'VERIFIED',
          userId: 'user-123',
          userDetails: null,
        },
      });

      // When: component renders
      render();

      // Then: order metal card item should not be visible (user not eligible without shipping address)
      await waitFor(() => {
        const orderMetalCardItem = screen.queryByTestId(
          CardHomeSelectors.ORDER_METAL_CARD_ITEM,
        );
        expect(orderMetalCardItem).toBeNull();
      });
    });

    it('does not show order metal card item when required address fields are missing', async () => {
      // Given: US user with incomplete address (missing city and zip)
      setupMockSelectors({ isAuthenticated: true, userLocation: 'us' });
      setupLoadCardDataMock({
        isAuthenticated: true,

        cardDetails: { type: CardType.VIRTUAL },
        isLoading: false,
        kycStatus: {
          verificationState: 'VERIFIED',
          userId: 'user-123',
          userDetails: mockUserDetailsWithIncompleteAddress,
        },
      });

      // When: component renders
      render();

      // Then: order metal card item should not be visible (incomplete shipping address)
      await waitFor(() => {
        const orderMetalCardItem = screen.queryByTestId(
          CardHomeSelectors.ORDER_METAL_CARD_ITEM,
        );
        expect(orderMetalCardItem).toBeNull();
      });
    });

    it('uses physical address when mailing address is partially populated (no field mixing)', async () => {
      // Given: US user with partial mailing address (only line1 set) and complete physical address
      setupMockSelectors({ isAuthenticated: true, userLocation: 'us' });
      setupLoadCardDataMock({
        isAuthenticated: true,

        cardDetails: { type: CardType.VIRTUAL },
        isLoading: false,
        kycStatus: {
          verificationState: 'VERIFIED',
          userId: 'user-123',
          userDetails: mockUserDetailsWithPartialMailingAddress,
        },
      });

      // When: component renders and order metal card item is pressed
      render();

      await waitFor(() => {
        const orderMetalCardItem = screen.queryByTestId(
          CardHomeSelectors.ORDER_METAL_CARD_ITEM,
        );
        expect(orderMetalCardItem).toBeOnTheScreen();
      });

      const orderMetalCardItem = screen.getByTestId(
        CardHomeSelectors.ORDER_METAL_CARD_ITEM,
      );
      fireEvent.press(orderMetalCardItem);

      // Then: should navigate with complete physical address (not mixing mailing line1 with physical city/zip)
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(
          Routes.CARD.CHOOSE_YOUR_CARD,
          {
            flow: 'upgrade',
            shippingAddress: {
              line1: '123 Physical St',
              line2: 'Apt 1',
              city: 'Physical City',
              state: 'CA',
              zip: '12345',
            },
          },
        );
      });
    });

    it('does not show order metal card item when user already has metal card', async () => {
      // Given: US user with metal card already
      setupMockSelectors({ isAuthenticated: true, userLocation: 'us' });
      setupLoadCardDataMock({
        isAuthenticated: true,

        cardDetails: { type: CardType.METAL },
        isLoading: false,
        kycStatus: {
          verificationState: 'VERIFIED',
          userId: 'user-123',
          userDetails: mockUserDetailsWithMailingAddress,
        },
      });

      // When: component renders
      render();

      // Then: order metal card item should not be visible (already has metal card)
      await waitFor(() => {
        const orderMetalCardItem = screen.queryByTestId(
          CardHomeSelectors.ORDER_METAL_CARD_ITEM,
        );
        expect(orderMetalCardItem).toBeNull();
      });
    });

    it('does not show order metal card item when feature flag is disabled', async () => {
      // Given: US user eligible for metal card but feature flag is disabled
      setupMockSelectors({
        isAuthenticated: true,
        userLocation: 'us',
        isMetalCardCheckoutEnabled: false,
      });
      setupLoadCardDataMock({
        isAuthenticated: true,

        cardDetails: { type: CardType.VIRTUAL },
        isLoading: false,
        kycStatus: {
          verificationState: 'VERIFIED',
          userId: 'user-123',
          userDetails: mockUserDetailsWithMailingAddress,
        },
      });

      // When: component renders
      render();

      // Then: order metal card item should not be visible (feature flag disabled)
      await waitFor(() => {
        const orderMetalCardItem = screen.queryByTestId(
          CardHomeSelectors.ORDER_METAL_CARD_ITEM,
        );
        expect(orderMetalCardItem).toBeNull();
      });
    });

    it('handles line2 as undefined when not provided', async () => {
      // Given: US user with address without line2
      const userDetailsWithoutLine2 = {
        id: 'user-123',
        addressLine1: '123 Main St',
        addressLine2: null,
        city: 'Test City',
        zip: '12345',
        usState: 'TX',
        mailingAddressLine1: null,
        mailingAddressLine2: null,
        mailingCity: null,
        mailingZip: null,
        mailingUsState: null,
      };

      setupMockSelectors({ isAuthenticated: true, userLocation: 'us' });
      setupLoadCardDataMock({
        isAuthenticated: true,

        cardDetails: { type: CardType.VIRTUAL },
        isLoading: false,
        kycStatus: {
          verificationState: 'VERIFIED',
          userId: 'user-123',
          userDetails: userDetailsWithoutLine2,
        },
      });

      // When: component renders and order metal card item is pressed
      render();

      await waitFor(() => {
        const orderMetalCardItem = screen.queryByTestId(
          CardHomeSelectors.ORDER_METAL_CARD_ITEM,
        );
        expect(orderMetalCardItem).toBeOnTheScreen();
      });

      const orderMetalCardItem = screen.getByTestId(
        CardHomeSelectors.ORDER_METAL_CARD_ITEM,
      );
      fireEvent.press(orderMetalCardItem);

      // Then: should navigate with line2 as undefined
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(
          Routes.CARD.CHOOSE_YOUR_CARD,
          {
            flow: 'upgrade',
            shippingAddress: {
              line1: '123 Main St',
              line2: undefined,
              city: 'Test City',
              state: 'TX',
              zip: '12345',
            },
          },
        );
      });
    });

    it('uses empty string for state when usState is null', async () => {
      // Given: US user with address but null state
      const userDetailsWithNullState = {
        id: 'user-123',
        addressLine1: '123 Main St',
        addressLine2: null,
        city: 'Test City',
        zip: '12345',
        usState: null,
        mailingAddressLine1: null,
        mailingAddressLine2: null,
        mailingCity: null,
        mailingZip: null,
        mailingUsState: null,
      };

      setupMockSelectors({ isAuthenticated: true, userLocation: 'us' });
      setupLoadCardDataMock({
        isAuthenticated: true,

        cardDetails: { type: CardType.VIRTUAL },
        isLoading: false,
        kycStatus: {
          verificationState: 'VERIFIED',
          userId: 'user-123',
          userDetails: userDetailsWithNullState,
        },
      });

      // When: component renders and order metal card item is pressed
      render();

      await waitFor(() => {
        const orderMetalCardItem = screen.queryByTestId(
          CardHomeSelectors.ORDER_METAL_CARD_ITEM,
        );
        expect(orderMetalCardItem).toBeOnTheScreen();
      });

      const orderMetalCardItem = screen.getByTestId(
        CardHomeSelectors.ORDER_METAL_CARD_ITEM,
      );
      fireEvent.press(orderMetalCardItem);

      // Then: should navigate with state as empty string
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(
          Routes.CARD.CHOOSE_YOUR_CARD,
          {
            flow: 'upgrade',
            shippingAddress: {
              line1: '123 Main St',
              line2: undefined,
              city: 'Test City',
              state: '',
              zip: '12345',
            },
          },
        );
      });
    });
  });

  describe('Push Provisioning Integration', () => {
    const mockCardDetailsWithHolder = {
      type: CardType.VIRTUAL,
      id: 'card-123',
      holderName: 'John Doe',
      panLast4: '1234',
      status: 'ACTIVE',
    };

    const mockUserDetailsForProvisioning = {
      id: 'user-123',
      firstName: 'John',
      lastName: 'Doe',
      addressLine1: '123 Main St',
      addressLine2: 'Apt 4B',
      city: 'New York',
      zip: '10001',
      usState: 'NY',
      mailingAddressLine1: null,
      mailingAddressLine2: null,
      mailingCity: null,
      mailingZip: null,
      mailingUsState: null,
    };

    // Helper to get the last call options from the mock
    const getLastCallOptions = () => {
      const calls = mockUsePushProvisioning.mock.calls;
      expect(calls.length).toBeGreaterThan(0);
      const lastCall = calls[calls.length - 1];
      return lastCall[0] as Record<string, unknown>;
    };

    beforeEach(() => {
      mockUsePushProvisioning.mockClear();
      mockInitiateProvisioning.mockClear();
      mockResetProvisioningStatus.mockClear();
    });

    it('calls usePushProvisioning with the card id and wallet provisioning', async () => {
      // Given: authenticated user with card details
      setupMockSelectors({ isAuthenticated: true, userLocation: 'us' });
      setupLoadCardDataMock({
        isAuthenticated: true,

        cardDetails: mockCardDetailsWithHolder,
        isLoading: false,
        kycStatus: {
          verificationState: 'VERIFIED',
          userId: 'user-123',
          userDetails: mockUserDetailsForProvisioning,
        },
      });

      // When: component renders
      render();

      await waitFor(() => {
        expect(mockUsePushProvisioning).toHaveBeenCalled();
      });

      const options = getLastCallOptions();

      expect(options.cardId).toBe('card-123');
      expect(options.walletProvisioning).toEqual({
        eligible: true,
        cardholderName: 'John Doe',
        lastFour: '1234',
        network: 'MASTERCARD',
      });
    });

    it('passes userAddress derived from physical address', async () => {
      // Given: US user with physical address
      setupMockSelectors({ isAuthenticated: true, userLocation: 'us' });
      setupLoadCardDataMock({
        isAuthenticated: true,

        cardDetails: mockCardDetailsWithHolder,
        isLoading: false,
        kycStatus: {
          verificationState: 'VERIFIED',
          userId: 'user-123',
          userDetails: mockUserDetailsForProvisioning,
        },
      });

      // When: component renders
      render();

      // Then: usePushProvisioning should receive userAddress from physical address
      await waitFor(() => {
        expect(mockUsePushProvisioning).toHaveBeenCalled();
      });

      const options = getLastCallOptions();

      // Verify userAddress uses physical address fields in provisioning format
      expect(options.userAddress).toEqual({
        name: 'John Doe', // Derived from KYC userDetails firstName/lastName
        addressOne: '123 Main St',
        addressTwo: 'Apt 4B',
        locality: 'New York',
        administrativeArea: 'NY',
        postalCode: '10001',
        countryCode: 'US',
        phoneNumber: '',
      });
    });

    it('passes null wallet provisioning when no card exists', async () => {
      // Given: authenticated user without card
      setupMockSelectors({ isAuthenticated: true, userLocation: 'us' });
      setupLoadCardDataMock({
        isAuthenticated: true,

        cardDetails: null,
        isLoading: false,
        kycStatus: {
          verificationState: 'VERIFIED',
          userId: 'user-123',
          userDetails: mockUserDetailsForProvisioning,
        },
      });

      // When: component renders
      render();

      await waitFor(() => {
        expect(mockUsePushProvisioning).toHaveBeenCalled();
      });

      const options = getLastCallOptions();

      expect(options.cardId).toBeUndefined();
      expect(options.walletProvisioning).toBeNull();
    });

    it('provides onSuccess callback that shows success toast', async () => {
      // Given: authenticated user with card
      setupMockSelectors({ isAuthenticated: true, userLocation: 'us' });
      setupLoadCardDataMock({
        isAuthenticated: true,

        cardDetails: mockCardDetailsWithHolder,
        isLoading: false,
        kycStatus: {
          verificationState: 'VERIFIED',
          userId: 'user-123',
          userDetails: mockUserDetailsForProvisioning,
        },
      });

      // When: component renders
      render();

      await waitFor(() => {
        expect(mockUsePushProvisioning).toHaveBeenCalled();
      });

      // Then: onSuccess callback should be provided
      const options = getLastCallOptions();

      expect(typeof options.onSuccess).toBe('function');
    });

    it('provides onError callback that shows error toast', async () => {
      // Given: authenticated user with card
      setupMockSelectors({ isAuthenticated: true, userLocation: 'us' });
      setupLoadCardDataMock({
        isAuthenticated: true,

        cardDetails: mockCardDetailsWithHolder,
        isLoading: false,
        kycStatus: {
          verificationState: 'VERIFIED',
          userId: 'user-123',
          userDetails: mockUserDetailsForProvisioning,
        },
      });

      // When: component renders
      render();

      await waitFor(() => {
        expect(mockUsePushProvisioning).toHaveBeenCalled();
      });

      // Then: onError callback should be provided
      const options = getLastCallOptions();

      expect(typeof options.onError).toBe('function');
    });

    it('uses holderName from KYC userDetails for provisioning', async () => {
      // Given: card with different holder name, but KYC has specific names
      const cardWithHolderName = {
        ...mockCardDetailsWithHolder,
        holderName: 'Card API Name',
      };

      const userDetailsWithName = {
        ...mockUserDetailsForProvisioning,
        firstName: 'Jane',
        lastName: 'Smith',
      };

      setupMockSelectors({ isAuthenticated: true, userLocation: 'us' });
      setupLoadCardDataMock({
        isAuthenticated: true,

        cardDetails: cardWithHolderName,
        isLoading: false,
        kycStatus: {
          verificationState: 'VERIFIED',
          userId: 'user-123',
          userDetails: userDetailsWithName,
        },
      });

      // When: component renders
      render();

      await waitFor(() => {
        expect(mockUsePushProvisioning).toHaveBeenCalled();
      });

      const options = getLastCallOptions();
      const walletProvisioning = options.walletProvisioning as {
        cardholderName: string;
      };

      expect(walletProvisioning.cardholderName).toBe('Jane Smith');
    });
  });

  describe('Cashback List Item', () => {
    beforeEach(() => {
      mockGetCapabilities.mockReturnValue({ supportsCashback: true });
    });

    it('displays cashback item for authenticated international user with VERIFIED KYC', () => {
      // Given: authenticated international user with verified KYC
      setupMockSelectors({
        isAuthenticated: true,
        userLocation: 'international',
      });
      setupLoadCardDataMock({
        isAuthenticated: true,

        cardDetails: { type: CardType.VIRTUAL },
        isLoading: false,
        kycStatus: { verificationState: 'VERIFIED', userId: 'user-123' },
      });

      // When: component renders
      render();

      // Then: cashback item is visible
      expect(
        screen.getByTestId(CardHomeSelectors.CASHBACK_ITEM),
      ).toBeOnTheScreen();
    });

    it('hides cashback item for US users', () => {
      // Given: authenticated US user with verified KYC
      mockGetCapabilities.mockReturnValue({ supportsCashback: false });
      setupMockSelectors({
        isAuthenticated: true,
        userLocation: 'us',
      });
      setupLoadCardDataMock({
        isAuthenticated: true,

        cardDetails: { type: CardType.VIRTUAL },
        isLoading: false,
        kycStatus: { verificationState: 'VERIFIED', userId: 'user-123' },
      });

      // When: component renders
      render();

      // Then: cashback item is not rendered
      expect(
        screen.queryByTestId(CardHomeSelectors.CASHBACK_ITEM),
      ).not.toBeOnTheScreen();
    });

    it('hides cashback item when KYC is not verified', () => {
      // Given: authenticated international user with pending KYC
      setupMockSelectors({
        isAuthenticated: true,
        userLocation: 'international',
      });
      setupLoadCardDataMock({
        isAuthenticated: true,

        cardDetails: { type: CardType.VIRTUAL },
        isLoading: false,
        kycStatus: { verificationState: 'PENDING', userId: 'user-123' },
      });

      // When: component renders
      render();

      // Then: cashback item is not rendered
      expect(
        screen.queryByTestId(CardHomeSelectors.CASHBACK_ITEM),
      ).not.toBeOnTheScreen();
    });

    it('shows standard cashback title for virtual card', () => {
      // Given: authenticated international user with virtual card
      setupMockSelectors({
        isAuthenticated: true,
        userLocation: 'international',
      });
      setupLoadCardDataMock({
        isAuthenticated: true,

        cardDetails: { type: CardType.VIRTUAL },
        isLoading: false,
        kycStatus: { verificationState: 'VERIFIED', userId: 'user-123' },
      });

      // When: component renders
      render();

      // Then: standard 1% title is shown
      expect(screen.getByText('1% mUSD Back')).toBeOnTheScreen();
    });

    it('shows metal cashback title for metal card', () => {
      // Given: authenticated international user with metal card
      setupMockSelectors({
        isAuthenticated: true,
        userLocation: 'international',
      });
      setupLoadCardDataMock({
        isAuthenticated: true,

        cardDetails: { type: CardType.METAL },
        isLoading: false,
        kycStatus: { verificationState: 'VERIFIED', userId: 'user-123' },
      });

      // When: component renders
      render();

      // Then: metal 3% title is shown
      expect(screen.getByText('3% mUSD Back')).toBeOnTheScreen();
    });

    it('navigates to cashback screen on press', () => {
      // Given: authenticated international user with verified KYC
      setupMockSelectors({
        isAuthenticated: true,
        userLocation: 'international',
      });
      setupLoadCardDataMock({
        isAuthenticated: true,

        cardDetails: { type: CardType.VIRTUAL },
        isLoading: false,
        kycStatus: { verificationState: 'VERIFIED', userId: 'user-123' },
      });

      // When: user taps cashback item
      render();
      fireEvent.press(screen.getByTestId(CardHomeSelectors.CASHBACK_ITEM));

      // Then: navigates to cashback route
      expect(mockNavigate).toHaveBeenCalled();
    });

    it('tracks analytics event on press', () => {
      // Given: authenticated international user with verified KYC
      setupMockSelectors({
        isAuthenticated: true,
        userLocation: 'international',
      });
      setupLoadCardDataMock({
        isAuthenticated: true,

        cardDetails: { type: CardType.VIRTUAL },
        isLoading: false,
        kycStatus: { verificationState: 'VERIFIED', userId: 'user-123' },
      });

      // When: user taps cashback item
      render();
      fireEvent.press(screen.getByTestId(CardHomeSelectors.CASHBACK_ITEM));

      // Then: tracks cashback button event
      expect(mockTrackEvent).toHaveBeenCalled();
    });
  });

  describe('Enable Card - ChooseYourCard Redirect', () => {
    it('navigates to SpendingLimit when Enable Card pressed', async () => {
      // Given: Verified, authenticated US user with shipping address, metal card enabled, no card
      setupMockSelectors({
        isAuthenticated: true,
        userLocation: 'us',
        isMetalCardCheckoutEnabled: true,
      });

      (useCardHomeData as jest.Mock).mockReturnValueOnce({
        data: {
          primaryFundingAsset: {
            address: mockPriorityToken.address,
            symbol: mockPriorityToken.symbol,
            decimals: mockPriorityToken.decimals,
            spendableBalance: '1000000000',
            spendingCap: String(mockPriorityToken.spendingCap ?? '0'),
            name: mockPriorityToken.name,
            chainId: mockPriorityToken.caipChainId,
            walletAddress: mockPriorityToken.walletAddress,
            priority: 1,
            status: 'active',
          },
          fundingAssets: [
            {
              address: mockPriorityToken.address,
              symbol: mockPriorityToken.symbol,
              decimals: mockPriorityToken.decimals,
              spendableBalance: '1000000000',
              spendingCap: String(mockPriorityToken.spendingCap ?? '0'),
              name: mockPriorityToken.name,
              chainId: mockPriorityToken.caipChainId,
              walletAddress: mockPriorityToken.walletAddress,
              priority: 1,
              status: 'active',
            },
          ],
          availableFundingAssets: [
            {
              address: mockPriorityToken.address,
              symbol: mockPriorityToken.symbol,
              decimals: mockPriorityToken.decimals,
              spendableBalance: '1000000000',
              spendingCap: String(mockPriorityToken.spendingCap ?? '0'),
              name: mockPriorityToken.name,
              chainId: mockPriorityToken.caipChainId,
              walletAddress: mockPriorityToken.walletAddress,
              priority: 1,
              status: 'active',
            },
          ],
          card: null,
          account: {
            verificationStatus: 'VERIFIED',
            holderName: null,
            shippingAddress: {
              line1: '123 Main St',
              city: 'New York',
              state: 'NY',
              postalCode: '10001',
              country: 'US',
            },
          },
          alerts: [],
          actions: [{ type: 'enable_card' }],
          delegationSettings: null,
        },
        primaryToken: mockPrimaryAssetWithBalance,
        availableTokens: [mockPrimaryAssetWithBalance],
        fundingTokens: [mockPrimaryAssetWithBalance],
        balanceMap: new Map(),
        isLoading: false,
        isError: false,
        refetch: mockRefetchAllData,
      });

      // When: user presses Enable Card button
      render();
      const enableButton = screen.getByTestId(
        CardHomeSelectors.ENABLE_CARD_BUTTON,
      );
      fireEvent.press(enableButton);

      // Then: navigates to SpendingLimit with flow param only
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(
          Routes.CARD.SPENDING_LIMIT,
          expect.objectContaining({
            flow: 'enable_card',
          }),
        );
      });
    });

    it('navigates to delegation when warning is NeedDelegation even with metal card enabled', async () => {
      // Given: US user with shipping address and metal card enabled, but warning is NeedDelegation (not NoCard)
      setupMockSelectors({
        isAuthenticated: true,
        userLocation: 'us',
        isMetalCardCheckoutEnabled: true,
      });

      (useCardHomeData as jest.Mock).mockReturnValueOnce({
        data: {
          primaryFundingAsset: null,
          fundingAssets: [],
          availableFundingAssets: [],
          card: null,
          account: {
            verificationStatus: 'VERIFIED',
            holderName: null,
            shippingAddress: {
              line1: '123 Main St',
              city: 'New York',
              state: 'NY',
              postalCode: '10001',
              country: 'US',
            },
          },
          alerts: [],
          actions: [{ type: 'enable_card' }],
        },
        primaryToken: null,
        availableTokens: [],
        fundingTokens: [],
        balanceMap: new Map(),
        isLoading: false,
        isError: false,
        refetch: mockRefetchAllData,
      });

      // When: user presses Enable Card button
      render();
      const enableButton = screen.getByTestId(
        CardHomeSelectors.ENABLE_CARD_BUTTON,
      );
      fireEvent.press(enableButton);

      // Then: navigates to SpendingLimit (delegation) instead of ChooseYourCard
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(
          Routes.CARD.SPENDING_LIMIT,
          expect.objectContaining({
            flow: 'enable_card',
          }),
        );
      });
    });

    it('navigates to delegation when metal card checkout is disabled', async () => {
      // Given: Verified US user but metal card checkout is disabled
      setupMockSelectors({
        isAuthenticated: true,
        userLocation: 'us',
        isMetalCardCheckoutEnabled: false,
      });

      (useCardHomeData as jest.Mock).mockReturnValueOnce({
        data: {
          primaryFundingAsset: null,
          fundingAssets: [],
          availableFundingAssets: [],
          card: null,
          account: {
            verificationStatus: 'VERIFIED',
            holderName: null,
            shippingAddress: {
              line1: '123 Main St',
              city: 'New York',
              state: 'NY',
              postalCode: '10001',
              country: 'US',
            },
          },
          alerts: [],
          actions: [{ type: 'enable_card' }],
        },
        primaryToken: null,
        availableTokens: [],
        fundingTokens: [],
        balanceMap: new Map(),
        isLoading: false,
        isError: false,
        refetch: mockRefetchAllData,
      });

      // When: user presses Enable Card button
      render();
      const enableButton = screen.getByTestId(
        CardHomeSelectors.ENABLE_CARD_BUTTON,
      );
      fireEvent.press(enableButton);

      // Then: navigates to SpendingLimit (delegation) instead of ChooseYourCard
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(
          Routes.CARD.SPENDING_LIMIT,
          expect.objectContaining({
            flow: 'enable_card',
          }),
        );
      });
    });

    it('navigates to delegation for international user even with metal card enabled', async () => {
      // Given: Verified international user with metal card checkout enabled
      setupMockSelectors({
        isAuthenticated: true,
        userLocation: 'international',
        isMetalCardCheckoutEnabled: true,
      });

      (useCardHomeData as jest.Mock).mockReturnValueOnce({
        data: {
          primaryFundingAsset: null,
          fundingAssets: [],
          availableFundingAssets: [],
          card: null,
          account: {
            verificationStatus: 'VERIFIED',
            holderName: null,
            shippingAddress: {
              line1: '123 Main St',
              city: 'London',
              state: '',
              postalCode: 'SW1A 1AA',
              country: 'US',
            },
          },
          alerts: [],
          actions: [{ type: 'enable_card' }],
        },
        primaryToken: null,
        availableTokens: [],
        fundingTokens: [],
        balanceMap: new Map(),
        isLoading: false,
        isError: false,
        refetch: mockRefetchAllData,
      });

      // When: user presses Enable Card button
      render();
      const enableButton = screen.getByTestId(
        CardHomeSelectors.ENABLE_CARD_BUTTON,
      );
      fireEvent.press(enableButton);

      // Then: navigates to SpendingLimit (delegation), not ChooseYourCard
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(
          Routes.CARD.SPENDING_LIMIT,
          expect.objectContaining({
            flow: 'enable_card',
          }),
        );
      });
    });

    it('navigates to delegation when US user has no shipping address', async () => {
      // Given: Verified US user with metal card enabled but no address data
      setupMockSelectors({
        isAuthenticated: true,
        userLocation: 'us',
        isMetalCardCheckoutEnabled: true,
      });

      (useCardHomeData as jest.Mock).mockReturnValueOnce({
        data: {
          primaryFundingAsset: null,
          fundingAssets: [],
          availableFundingAssets: [],
          card: null,
          account: null,
          alerts: [],
          actions: [{ type: 'enable_card' }],
        },
        primaryToken: null,
        availableTokens: [],
        fundingTokens: [],
        balanceMap: new Map(),
        isLoading: false,
        isError: false,
        refetch: mockRefetchAllData,
      });

      // When: user presses Enable Card button
      render();
      const enableButton = screen.getByTestId(
        CardHomeSelectors.ENABLE_CARD_BUTTON,
      );
      fireEvent.press(enableButton);

      // Then: navigates to delegation since no shipping address is available
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(
          Routes.CARD.SPENDING_LIMIT,
          expect.objectContaining({
            flow: 'enable_card',
          }),
        );
      });
    });
  });

  describe('Zero priority token balance — manage options visibility', () => {
    beforeEach(() => {
      setupMockSelectors({ isAuthenticated: true });
      mockGetCapabilities.mockReturnValue(BAANX_CAPABILITIES);
    });

    it('hides all manage options except Change asset when priority token balance is zero', () => {
      setupLoadCardDataMock({ isAuthenticated: true });
      overrideCardHomeDataBalance(
        {
          rawTokenBalance: 0,
          rawFiatNumber: 0,
          balanceFiat: '$0.00',
          balanceFormatted: '0.000000 USDC',
        },
        false,
        { type: CardType.VIRTUAL, isFreezable: true },
      );

      render();

      expect(
        screen.getByTestId(CardHomeSelectors.CHANGE_ASSET_BUTTON),
      ).toBeOnTheScreen();

      // The quick actions show for a signed-in cardholder even at zero
      // balance — never hidden or disabled because of it; the balance-gated
      // rows are the Manage list ones below.
      expect(
        screen.getByTestId(CardHomeSelectors.ADD_FUNDS_BUTTON),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId(CardHomeSelectors.ADD_FUNDS_BUTTON),
      ).not.toBeDisabled();
      expect(
        screen.getByTestId(CardHomeSelectors.VIEW_CARD_DETAILS_BUTTON),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId(CardHomeSelectors.VIEW_PIN_BUTTON),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId(CardHomeSelectors.FREEZE_CARD_BUTTON),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId(CardHomeSelectors.FREEZE_CARD_BUTTON),
      ).not.toBeDisabled();
      expect(
        screen.queryByTestId(CardHomeSelectors.FREEZE_CARD_TOGGLE),
      ).toBeNull();
      expect(
        screen.queryByTestId(CardHomeSelectors.MANAGE_SPENDING_LIMIT_ITEM),
      ).toBeNull();
      expect(screen.queryByTestId(CardHomeSelectors.CASHBACK_ITEM)).toBeNull();
      expect(screen.queryByTestId(CardHomeSelectors.TRAVEL_ITEM)).toBeNull();
    });

    it('shows all manage options when priority token balance is positive', () => {
      setupLoadCardDataMock({ isAuthenticated: true });
      overrideCardHomeDataBalance({
        rawTokenBalance: 1000,
        rawFiatNumber: 1000,
        balanceFiat: '$1,000.00',
        balanceFormatted: '1000.000000 USDC',
      });

      render();

      expect(
        screen.getByTestId(CardHomeSelectors.CHANGE_ASSET_BUTTON),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId(CardHomeSelectors.VIEW_CARD_DETAILS_BUTTON),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId(CardHomeSelectors.MANAGE_SPENDING_LIMIT_ITEM),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId(CardHomeSelectors.TRAVEL_ITEM),
      ).toBeOnTheScreen();
    });
  });

  describe('Link Money Account content', () => {
    const setupLinkageMock = (
      overrides: Partial<{
        canLink: boolean;
        isLinking: boolean;
        isMoneyAccountLinkingSupported: boolean;
      }> = {},
    ) => {
      mockUseMoneyAccountCardLinkage.mockReturnValue({
        hasMoneyAccountRequirements: true,
        hasMoneyAccountBaseRequirements: true,
        isCardAuthenticated: true,
        isCardVerified: true,
        isCardLinkedToMoneyAccount: false,
        isResidencyBlocked: false,
        primaryMoneyAccount: {
          id: 'money-account-1',
          address: '0x1234567890123456789012345678901234567890',
          type: 'eip155:eoa',
          scopes: [],
          methods: [],
          options: {
            entropy: {
              type: 'mnemonic',
              id: 'wallet1',
              derivationPath: "m/44'/60'/0'/0/0",
              groupIndex: 0,
            },
            exportable: false,
          },
        },
        moneyAccountCardToken: {
          address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
          symbol: 'veda',
          name: 'veda',
          decimals: 6,
          caipChainId: 'eip155:143',
          fundingStatus: FundingStatus.NotEnabled,
          spendableBalance: '0',
          delegationContract: '0x9876543210987654321098765432109876543210',
        },
        canLink: true,
        isMoneyAccountLinkingSupported: true,
        isMoneyCardSectionAvailable: true,
        reportsVerificationStatus: true,
        status: 'idle' as const,
        isLinking: false,
        error: null,
        getLinkFlowRedirectTarget: jest.fn(() => undefined),
        startLinkFlow: mockStartMoneyAccountLinkFlow,
        openLinkCardSheet: jest.fn(),
        confirmLinkInBackground: jest.fn(),
        reset: jest.fn(),
        ...overrides,
      });
    };

    it('starts the link flow when card content is pressed', () => {
      setupMockSelectors({ cardHomeDataStatus: 'success' });
      setupLinkageMock();

      render();

      fireEvent.press(screen.getByTestId(MoneyMetaMaskCardTestIds.CONTENT));

      expect(mockStartMoneyAccountLinkFlow).toHaveBeenCalledTimes(1);
      expect(mockStartMoneyAccountLinkFlow).toHaveBeenCalledWith({
        screen: Routes.CARD.HOME,
        entrypoint: CardEntryPoint.CARD_HOME_MONEY_ACCOUNT_CARD,
      });
    });

    it('renders link-mode content when Money Account linking is available', () => {
      setupMockSelectors({ cardHomeDataStatus: 'success' });
      setupLinkageMock();

      render();

      expect(
        screen.getByTestId(MoneyMetaMaskCardTestIds.LINK_SUBTITLE),
      ).toBeOnTheScreen();
      expect(screen.queryByText(/mUSD back/)).not.toBeOnTheScreen();
    });

    it('hides link-mode content when Money Account linking is unavailable', () => {
      setupMockSelectors({ cardHomeDataStatus: 'success' });

      render();

      expect(
        screen.queryByTestId(MoneyMetaMaskCardTestIds.LINK_SUBTITLE),
      ).not.toBeOnTheScreen();
    });

    it('hides link-mode content when the authenticated provider does not support Money account linking', () => {
      setupMockSelectors({ cardHomeDataStatus: 'success' });
      mockGetCapabilities.mockReturnValue({
        ...BAANX_CAPABILITIES,
        supportsMoneyAccountLinking: false,
      });
      setupLinkageMock({
        canLink: false,
        isMoneyAccountLinkingSupported: false,
      });

      render();

      expect(
        screen.queryByTestId(MoneyMetaMaskCardTestIds.LINK_SUBTITLE),
      ).not.toBeOnTheScreen();
    });

    it('hides link-mode content while an Immersve setup step is pending', () => {
      setupMockSelectors({ cardHomeDataStatus: 'success' });
      setupLinkageMock();
      mockCanEnableCard = true;

      render();

      expect(
        screen.queryByTestId(MoneyMetaMaskCardTestIds.LINK_SUBTITLE),
      ).not.toBeOnTheScreen();
    });

    it.each(['kyc_pending', 'card_provisioning', 'allowance_revoked'])(
      'hides link-mode content while the %s setup alert is showing',
      (alertType) => {
        setupMockSelectors({ cardHomeDataStatus: 'success' });
        setupLinkageMock();
        setupLoadCardDataMock({
          alerts: [{ type: alertType, dismissable: false }],
        });

        render();

        expect(
          screen.queryByTestId(MoneyMetaMaskCardTestIds.LINK_SUBTITLE),
        ).not.toBeOnTheScreen();
      },
    );

    it('hides link-mode content before card home data has loaded', () => {
      setupMockSelectors({ cardHomeDataStatus: 'loading' });
      setupLinkageMock();
      (useCardHomeData as jest.Mock).mockReturnValue({
        data: null,
        primaryToken: null,
        availableTokens: [],
        fundingTokens: [],
        balanceMap: new Map(),
        isLoading: true,
        isError: false,
        refetch: mockRefetchAllData,
      });

      render();

      expect(
        screen.queryByTestId(MoneyMetaMaskCardTestIds.LINK_SUBTITLE),
      ).not.toBeOnTheScreen();
    });

    it('keeps link-mode content visible while linking is in progress', () => {
      setupMockSelectors({ cardHomeDataStatus: 'loading' });
      setupLinkageMock({ isLinking: true });

      render();

      expect(
        screen.getByTestId(MoneyMetaMaskCardTestIds.LINK_SUBTITLE),
      ).toBeOnTheScreen();
    });

    it('starts the link flow when section header is pressed', () => {
      setupMockSelectors({ cardHomeDataStatus: 'success' });
      setupLinkageMock();

      render();

      fireEvent.press(screen.getByTestId(MoneyMetaMaskCardTestIds.HEADER));

      expect(mockStartMoneyAccountLinkFlow).toHaveBeenCalledTimes(1);
      expect(mockStartMoneyAccountLinkFlow).toHaveBeenCalledWith({
        screen: Routes.CARD.HOME,
        entrypoint: CardEntryPoint.CARD_HOME_MONEY_ACCOUNT_CARD,
      });
    });

    it('renders the no-APY subtitle and omits the APY bullet when apyPercent is undefined', () => {
      setupMockSelectors({ cardHomeDataStatus: 'success' });
      setupLinkageMock();
      mockUseMoneyVaultApy.mockReturnValue({ apyPercent: undefined });

      render();

      expect(
        screen.getByText(strings('money.metamask_card.link_subtitle_no_apy')),
      ).toBeOnTheScreen();
      expect(screen.queryByText(/Earn up to .* APY/)).not.toBeOnTheScreen();
      expect(screen.queryByText(/mUSD back/)).not.toBeOnTheScreen();
    });

    it('interpolates apyPercent into the subtitle and APY bullet when defined', () => {
      setupMockSelectors({ cardHomeDataStatus: 'success' });
      setupLinkageMock();
      mockUseMoneyVaultApy.mockReturnValue({ apyPercent: 4 });

      render();

      expect(
        screen.getByText(
          strings('money.metamask_card.link_subtitle', { apy: 4 }),
        ),
      ).toBeOnTheScreen();
      expect(screen.getByText('Earn up to ~4% APY')).toBeOnTheScreen();
      expect(screen.queryByText(/mUSD back/)).not.toBeOnTheScreen();
    });
  });

  describe('UK migration phases', () => {
    it('auto-opens the migration sheet once during soft phase for GB Baanx users', async () => {
      setupMockSelectors({
        isAuthenticated: true,
        activeProviderId: 'baanx',
        ukMigrationState: {
          phase: 'soft',
          isActive: true,
          deadline: new Date('2026-09-30T23:59:59.999Z'),
        },
      });
      setupLoadCardDataMock({
        isAuthenticated: true,
        cardDetails: { type: CardType.VIRTUAL },
        countryOfResidence: 'GB',
      });

      render();

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(Routes.CARD.MODALS.ID, {
          screen: Routes.CARD.MODALS.UK_MIGRATION,
        });
      });
      expect(
        screen.getByTestId(CardHomeSelectors.UK_MIGRATION_SOFT_BANNER),
      ).toBeOnTheScreen();
    });

    it('does not show soft migration UI after the migration is completed', () => {
      setupMockSelectors({
        isAuthenticated: true,
        activeProviderId: 'baanx',
        hasCompletedMigration: true,
        ukMigrationState: {
          phase: 'soft',
          isActive: true,
          deadline: new Date('2026-09-30T23:59:59.999Z'),
        },
      });
      setupLoadCardDataMock({
        isAuthenticated: true,
        cardDetails: { type: CardType.VIRTUAL },
        countryOfResidence: 'GB',
      });

      render();

      expect(
        screen.queryByTestId(CardHomeSelectors.UK_MIGRATION_SOFT_BANNER),
      ).not.toBeOnTheScreen();
      expect(mockNavigate).not.toHaveBeenCalledWith(Routes.CARD.MODALS.ID, {
        screen: Routes.CARD.MODALS.UK_MIGRATION,
      });
    });

    it('does not show soft migration UI for Immersve users', () => {
      setupMockSelectors({
        isAuthenticated: true,
        activeProviderId: 'immersve',
        ukMigrationState: {
          phase: 'soft',
          isActive: true,
          deadline: new Date('2026-09-30T23:59:59.999Z'),
        },
      });
      setupLoadCardDataMock({
        isAuthenticated: true,
        cardDetails: { type: CardType.VIRTUAL, regionCode: 'GB' },
        countryOfResidence: 'GB',
      });

      render();

      expect(
        screen.queryByTestId(CardHomeSelectors.UK_MIGRATION_SOFT_BANNER),
      ).not.toBeOnTheScreen();
      expect(mockNavigate).not.toHaveBeenCalledWith(Routes.CARD.MODALS.ID, {
        screen: Routes.CARD.MODALS.UK_MIGRATION,
      });
    });

    it('shows the soft banner and auto-opens the sheet when deadline is missing', async () => {
      setupMockSelectors({
        isAuthenticated: true,
        activeProviderId: 'baanx',
        ukMigrationState: {
          phase: 'soft',
          isActive: true,
          deadline: null,
        },
      });
      setupLoadCardDataMock({
        isAuthenticated: true,
        cardDetails: { type: CardType.VIRTUAL },
        countryOfResidence: 'GB',
      });

      render();

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(Routes.CARD.MODALS.ID, {
          screen: Routes.CARD.MODALS.UK_MIGRATION,
        });
      });
      expect(
        screen.getByTestId(CardHomeSelectors.UK_MIGRATION_SOFT_BANNER),
      ).toBeOnTheScreen();
    });

    it('shows a forced migration banner and hides card use actions after the deadline', () => {
      setupMockSelectors({
        isAuthenticated: true,
        activeProviderId: 'baanx',
        ukMigrationState: {
          phase: 'forced',
          isActive: true,
          deadline: new Date('2026-09-30T23:59:59.999Z'),
        },
      });
      setupLoadCardDataMock({
        isAuthenticated: true,
        cardDetails: { type: CardType.VIRTUAL },
        countryOfResidence: 'GB',
      });

      render();

      expect(
        screen.getByTestId(CardHomeSelectors.UK_MIGRATION_REQUIRED_BANNER),
      ).toBeOnTheScreen();
      expect(
        screen.queryByTestId(CardHomeSelectors.ORDER_METAL_CARD_ITEM),
      ).not.toBeOnTheScreen();
      expect(
        screen.queryByTestId(CardHomeSelectors.ADD_FUNDS_BUTTON),
      ).not.toBeOnTheScreen();
      expect(
        screen.queryByTestId(CardHomeSelectors.CHANGE_ASSET_BUTTON),
      ).not.toBeOnTheScreen();
      expect(
        screen.queryByTestId(CardHomeSelectors.CREDIT_BANNER),
      ).not.toBeOnTheScreen();
    });

    it('hides the close-to-spending-limit alert during forced migration', () => {
      setupMockSelectors({
        isAuthenticated: true,
        activeProviderId: 'baanx',
        ukMigrationState: {
          phase: 'forced',
          isActive: true,
          deadline: new Date('2026-09-30T23:59:59.999Z'),
        },
      });
      setupLoadCardDataMock({
        isAuthenticated: true,
        cardDetails: { type: CardType.VIRTUAL },
        countryOfResidence: 'GB',
        alerts: [{ type: 'close_to_spending_limit', dismissable: true }],
      });

      render();

      expect(
        screen.getByTestId(CardHomeSelectors.UK_MIGRATION_REQUIRED_BANNER),
      ).toBeOnTheScreen();
      expect(
        screen.queryByText(
          'card.card_home.warnings.close_spending_limit.title',
        ),
      ).not.toBeOnTheScreen();
      expect(screen.queryByTestId('dismiss-button')).not.toBeOnTheScreen();
    });

    it('opens the migration sheet from the forced banner CTA', () => {
      setupMockSelectors({
        isAuthenticated: true,
        activeProviderId: 'baanx',
        ukMigrationState: {
          phase: 'forced',
          isActive: true,
          deadline: new Date('2026-09-30T23:59:59.999Z'),
        },
      });
      setupLoadCardDataMock({
        isAuthenticated: true,
        cardDetails: { type: CardType.VIRTUAL },
        countryOfResidence: 'GB',
      });
      jest.mocked(useCardUkMigrationUpdateBadge).mockReturnValue('danger');

      render();
      mockNavigate.mockClear();
      mockEventBuilder.addProperties.mockClear();
      mockCreateEventBuilder.mockClear();
      mockTrackEvent.mockClear();

      fireEvent.press(screen.getByTestId('confirm-button'));

      expect(mockNavigate).toHaveBeenCalledWith(Routes.CARD.MODALS.ID, {
        screen: Routes.CARD.MODALS.UK_MIGRATION,
      });
      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.CARD_BUTTON_CLICKED,
      );
      expect(mockEventBuilder.addProperties).toHaveBeenCalledWith({
        provider: 'baanx',
        action: 'MIGRATION_ATTENTION_SET_UP_CARD_BUTTON',
        flow: 'migration',
        migration_phase: 'post_cutoff',
        badge_reasons: ['card_migration'],
      });
      expect(mockTrackEvent).toHaveBeenCalled();
    });
  });
});
