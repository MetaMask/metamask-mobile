import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import CardHomeContent from './CardHomeContent';
import { renderScreen } from '../../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../../util/test/initial-root-state';
import { CardHomeSelectors } from '../CardHome.testIds';
import type {
  CardHomeState,
  CardHomeViewState,
  CardHomeFeatures,
  CardAssetBalance,
  CardDetailsTokenState,
} from '../CardHome.types';
import {
  AllowanceState,
  CardStatus,
  CardType,
  type CardTokenAllowance,
  type CardDetailsResponse,
} from '../../../types';

// Mock i18n
jest.mock('../../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const mockStrings: Record<string, string> = {
      'card.card_home.title': 'MetaMask Card',
      'card.card_home.add_funds': 'Add Funds',
      'card.card_home.change_asset': 'Change Asset',
      'card.card_home.enable_card_button_label': 'Enable Card',
      'card.card_home.available_balance': 'Available Balance',
      'card.card_home.limited_spending_warning': 'Limited spending allowance',
      'card.card_home.manage_card_options.manage_spending_limit':
        'Manage Spending Limit',
    };
    return mockStrings[key] || key;
  }),
}));

// Mock sub-components
jest.mock('./CardBalanceSection', () => {
  const { View, Text } = jest.requireActual('react-native');
  return function MockCardBalanceSection({
    isLoading,
    needsSetup,
    isKYCPending,
  }: {
    isLoading: boolean;
    needsSetup: boolean;
    isKYCPending: boolean;
  }) {
    return (
      <View testID="card-balance-section">
        <Text testID="card-balance-section-loading">{String(isLoading)}</Text>
        <Text testID="card-balance-section-needs-setup">
          {String(needsSetup)}
        </Text>
        <Text testID="card-balance-section-kyc-pending">
          {String(isKYCPending)}
        </Text>
      </View>
    );
  };
});

jest.mock('./CardActionsSection', () => {
  const { View, Text, TouchableOpacity } = jest.requireActual('react-native');
  return function MockCardActionsSection({
    viewState,
    isLoading,
    onEnableCard,
  }: {
    viewState: CardHomeViewState;
    isLoading: boolean;
    onEnableCard: () => void;
  }) {
    return (
      <View testID="card-actions-section">
        <Text testID="card-actions-section-status">{viewState.status}</Text>
        <Text testID="card-actions-section-loading">{String(isLoading)}</Text>
        <TouchableOpacity
          testID="mock-enable-card-button"
          onPress={onEnableCard}
        >
          <Text>Enable</Text>
        </TouchableOpacity>
      </View>
    );
  };
});

jest.mock('./CardManageSection', () => {
  const { View, Text, TouchableOpacity } = jest.requireActual('react-native');
  return function MockCardManageSection({
    needsSetup,
    isKYCPending,
    onLogout,
    onNavigateToCardTosPage,
  }: {
    needsSetup: boolean;
    isKYCPending: boolean;
    onLogout: () => void;
    onNavigateToCardTosPage: () => void;
  }) {
    return (
      <View testID="card-manage-section">
        <Text testID="card-manage-section-needs-setup">
          {String(needsSetup)}
        </Text>
        <Text testID="card-manage-section-kyc-pending">
          {String(isKYCPending)}
        </Text>
        <TouchableOpacity testID="mock-logout-button" onPress={onLogout}>
          <Text>Logout</Text>
        </TouchableOpacity>
        <TouchableOpacity
          testID="mock-tos-button"
          onPress={onNavigateToCardTosPage}
        >
          <Text>ToS</Text>
        </TouchableOpacity>
      </View>
    );
  };
});

jest.mock('../../../components/CardImage', () => {
  const { View, Text } = jest.requireActual('react-native');
  return function MockCardImage({
    type,
    status,
  }: {
    type: CardType;
    status: CardStatus;
  }) {
    return (
      <View testID="card-image">
        <Text testID="card-image-type">{type}</Text>
        <Text testID="card-image-status">{status}</Text>
      </View>
    );
  };
});

jest.mock('../../../components/CardMessageBox/CardMessageBox', () => {
  const { View, Text } = jest.requireActual('react-native');
  return function MockCardMessageBox({ messageType }: { messageType: string }) {
    return (
      <View testID="card-message-box">
        <Text testID="card-message-box-type">{messageType}</Text>
      </View>
    );
  };
});

jest.mock(
  '../../../components/SpendingLimitProgressBar/SpendingLimitProgressBar',
  () => {
    const { View, Text } = jest.requireActual('react-native');
    return function MockSpendingLimitProgressBar({
      symbol,
      totalAllowance,
      remainingAllowance,
    }: {
      symbol: string;
      totalAllowance: string;
      remainingAllowance: string;
    }) {
      return (
        <View testID="spending-limit-progress-bar">
          <Text testID="spending-limit-symbol">{symbol}</Text>
          <Text testID="spending-limit-total">{totalAllowance}</Text>
          <Text testID="spending-limit-remaining">{remainingAllowance}</Text>
        </View>
      );
    };
  },
);

function renderWithProvider(component: React.ComponentType) {
  return renderScreen(
    component,
    {
      name: 'CardHomeContent',
    },
    {
      state: {
        engine: {
          backgroundState,
        },
      },
    },
  );
}

// Helper to create mock CardDetailsTokenState
const createCardDetailsTokenState = (
  overrides: Partial<CardDetailsTokenState> = {},
): CardDetailsTokenState => ({
  isLoading: false,
  isImageLoading: false,
  imageUrl: null,
  onImageLoad: jest.fn(),
  onImageError: jest.fn(),
  fetchCardDetailsToken: jest.fn(),
  clearImageUrl: jest.fn(),
  ...overrides,
});

// Helper to create mock CardHomeFeatures
const createFeatures = (
  overrides: Partial<CardHomeFeatures> = {},
): CardHomeFeatures => ({
  isAuthenticated: true,
  isBaanxLoginEnabled: true,
  canViewCardDetails: true,
  canManageSpendingLimit: true,
  canChangeAsset: true,
  showSpendingLimitWarning: false,
  showSpendingLimitProgress: false,
  showAllowanceLimitedWarning: false,
  isSwapEnabled: true,
  ...overrides,
});

// Helper to create mock CardDetailsResponse
const createCardDetails = (
  overrides: Partial<CardDetailsResponse> = {},
): CardDetailsResponse => ({
  id: 'card-123',
  holderName: 'Test User',
  expiryDate: '12/25',
  panLast4: '1234',
  status: CardStatus.ACTIVE,
  type: CardType.VIRTUAL,
  orderedAt: '2024-01-01T00:00:00Z',
  ...overrides,
});

// Helper to create mock priorityToken
const createPriorityToken = (
  overrides: Partial<CardTokenAllowance> = {},
): CardTokenAllowance => ({
  address: '0x123',
  symbol: 'USDC',
  decimals: 6,
  allowance: '500000000',
  totalAllowance: '1000000000',
  name: 'USD Coin',
  caipChainId: 'eip155:1',
  walletAddress: '0x789',
  allowanceState: AllowanceState.Enabled,
  ...overrides,
});

// Helper to create mock CardAssetBalance
const createAssetBalance = (
  overrides: Partial<CardAssetBalance> = {},
): CardAssetBalance => ({
  asset: {
    address: '0x123',
    symbol: 'USDC',
    decimals: 6,
    name: 'USD Coin',
    image: '',
    aggregators: [],
    balance: '100000000',
    logo: undefined,
    isETH: false,
  },
  balanceFiat: '$100.00',
  balanceFormatted: '100 USDC',
  rawFiatNumber: 100,
  rawTokenBalance: 100,
  ...overrides,
});

// Helper to create base state
const createBaseState = (
  viewState: CardHomeViewState,
  overrides: Partial<CardHomeState> = {},
): CardHomeState => ({
  viewState,
  priorityToken: createPriorityToken(),
  cardDetails: createCardDetails(),
  assetBalance: createAssetBalance(),
  cardDetailsToken: createCardDetailsTokenState(),
  privacyMode: false,
  togglePrivacyMode: jest.fn(),
  fetchAllData: jest.fn(),
  handleRefresh: jest.fn(),
  isRefreshing: false,
  addFundsAction: jest.fn(),
  changeAssetAction: jest.fn(),
  manageSpendingLimitAction: jest.fn(),
  viewCardDetailsAction: jest.fn(),
  navigateToCardPage: jest.fn(),
  navigateToTravelPage: jest.fn(),
  navigateToCardTosPage: jest.fn(),
  logoutAction: jest.fn(),
  openOnboardingDelegationAction: jest.fn(),
  isSpendingLimitWarningDismissed: false,
  dismissSpendingLimitWarning: jest.fn(),
  isAuthenticated: true,
  ...overrides,
});

describe('CardHomeContent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders the title', () => {
      const state = createBaseState({
        status: 'ready',
        features: createFeatures(),
      });

      const { getByText } = renderWithProvider(() => (
        <CardHomeContent state={state} />
      ));

      expect(getByText('MetaMask Card')).toBeOnTheScreen();
    });

    it('renders CardBalanceSection with correct props', () => {
      const state = createBaseState({
        status: 'ready',
        features: createFeatures(),
      });

      const { getByTestId } = renderWithProvider(() => (
        <CardHomeContent state={state} />
      ));

      expect(getByTestId('card-balance-section')).toBeOnTheScreen();
      expect(getByTestId('card-balance-section-loading').children[0]).toBe(
        'false',
      );
      expect(getByTestId('card-balance-section-needs-setup').children[0]).toBe(
        'false',
      );
      expect(getByTestId('card-balance-section-kyc-pending').children[0]).toBe(
        'false',
      );
    });

    it('renders CardActionsSection with correct viewState', () => {
      const state = createBaseState({
        status: 'ready',
        features: createFeatures(),
      });

      const { getByTestId } = renderWithProvider(() => (
        <CardHomeContent state={state} />
      ));

      expect(getByTestId('card-actions-section')).toBeOnTheScreen();
      expect(getByTestId('card-actions-section-status').children[0]).toBe(
        'ready',
      );
    });

    it('renders CardManageSection', () => {
      const state = createBaseState({
        status: 'ready',
        features: createFeatures(),
      });

      const { getByTestId } = renderWithProvider(() => (
        <CardHomeContent state={state} />
      ));

      expect(getByTestId('card-manage-section')).toBeOnTheScreen();
    });
  });

  describe('loading state', () => {
    it('passes isLoading=true to child components when viewState is loading', () => {
      const state = createBaseState({ status: 'loading' });

      const { getByTestId } = renderWithProvider(() => (
        <CardHomeContent state={state} />
      ));

      expect(getByTestId('card-balance-section-loading').children[0]).toBe(
        'true',
      );
      expect(getByTestId('card-actions-section-loading').children[0]).toBe(
        'true',
      );
    });

    it('shows card image skeleton when loading', () => {
      const state = createBaseState({ status: 'loading' });

      const { queryByTestId } = renderWithProvider(() => (
        <CardHomeContent state={state} />
      ));

      // Card image should not be shown during loading
      expect(queryByTestId('card-image')).toBeNull();
    });
  });

  describe('KYC pending state', () => {
    it('displays KYC pending message box', () => {
      const state = createBaseState({ status: 'kyc_pending' });

      const { getByTestId } = renderWithProvider(() => (
        <CardHomeContent state={state} />
      ));

      expect(getByTestId('card-message-box')).toBeOnTheScreen();
      expect(getByTestId('card-message-box-type').children[0]).toBe(
        'kyc_pending',
      );
    });

    it('passes isKYCPending=true to child components', () => {
      const state = createBaseState({ status: 'kyc_pending' });

      const { getByTestId } = renderWithProvider(() => (
        <CardHomeContent state={state} />
      ));

      expect(getByTestId('card-balance-section-kyc-pending').children[0]).toBe(
        'true',
      );
      expect(getByTestId('card-manage-section-kyc-pending').children[0]).toBe(
        'true',
      );
    });

    it('does not show loading state for card image', () => {
      const state = createBaseState({ status: 'kyc_pending' });

      const { getByTestId } = renderWithProvider(() => (
        <CardHomeContent state={state} />
      ));

      // isLoading should be false (actual card image shown)
      expect(getByTestId('card-balance-section-loading').children[0]).toBe(
        'false',
      );
    });
  });

  describe('setup_required state', () => {
    it('passes needsSetup=true to child components', () => {
      const state = createBaseState({
        status: 'setup_required',
        canEnable: true,
        isProvisioning: false,
      });

      const { getByTestId } = renderWithProvider(() => (
        <CardHomeContent state={state} />
      ));

      expect(getByTestId('card-balance-section-needs-setup').children[0]).toBe(
        'true',
      );
      expect(getByTestId('card-manage-section-needs-setup').children[0]).toBe(
        'true',
      );
    });

    it('displays provisioning message box when isProvisioning is true', () => {
      const state = createBaseState({
        status: 'setup_required',
        canEnable: false,
        isProvisioning: true,
      });

      const { getByTestId } = renderWithProvider(() => (
        <CardHomeContent state={state} />
      ));

      expect(getByTestId('card-message-box')).toBeOnTheScreen();
      expect(getByTestId('card-message-box-type').children[0]).toBe(
        'card_provisioning',
      );
    });

    it('does not display message box when canEnable is true and not provisioning', () => {
      const state = createBaseState({
        status: 'setup_required',
        canEnable: true,
        isProvisioning: false,
      });

      const { queryByTestId } = renderWithProvider(() => (
        <CardHomeContent state={state} />
      ));

      expect(queryByTestId('card-message-box')).toBeNull();
    });
  });

  describe('ready state', () => {
    it('passes features to child components', () => {
      const state = createBaseState({
        status: 'ready',
        features: createFeatures({ isAuthenticated: true }),
      });

      const { getByTestId } = renderWithProvider(() => (
        <CardHomeContent state={state} />
      ));

      expect(getByTestId('card-balance-section-needs-setup').children[0]).toBe(
        'false',
      );
      expect(getByTestId('card-balance-section-kyc-pending').children[0]).toBe(
        'false',
      );
    });

    it('displays spending limit warning when showSpendingLimitWarning is true', () => {
      const state = createBaseState({
        status: 'ready',
        features: createFeatures({ showSpendingLimitWarning: true }),
      });

      const { getByTestId } = renderWithProvider(() => (
        <CardHomeContent state={state} />
      ));

      expect(getByTestId('card-message-box')).toBeOnTheScreen();
      expect(getByTestId('card-message-box-type').children[0]).toBe(
        'close_spending_limit',
      );
    });

    it('displays spending limit progress bar when showSpendingLimitProgress is true', () => {
      const state = createBaseState(
        {
          status: 'ready',
          features: createFeatures({ showSpendingLimitProgress: true }),
        },
        {
          priorityToken: createPriorityToken({
            allowanceState: AllowanceState.Limited,
            totalAllowance: '1000',
            allowance: '500',
            symbol: 'USDC',
          }),
        },
      );

      const { getByTestId } = renderWithProvider(() => (
        <CardHomeContent state={state} />
      ));

      expect(getByTestId('spending-limit-progress-bar')).toBeOnTheScreen();
      expect(getByTestId('spending-limit-symbol').children[0]).toBe('USDC');
    });

    it('does not display spending limit progress bar when allowanceState is not Limited', () => {
      const state = createBaseState(
        {
          status: 'ready',
          features: createFeatures({ showSpendingLimitProgress: true }),
        },
        {
          priorityToken: createPriorityToken({
            allowanceState: AllowanceState.Enabled,
          }),
        },
      );

      const { queryByTestId } = renderWithProvider(() => (
        <CardHomeContent state={state} />
      ));

      expect(queryByTestId('spending-limit-progress-bar')).toBeNull();
    });

    it('displays allowance limited warning when showAllowanceLimitedWarning is true', () => {
      const state = createBaseState({
        status: 'ready',
        features: createFeatures({ showAllowanceLimitedWarning: true }),
      });

      const { getByText } = renderWithProvider(() => (
        <CardHomeContent state={state} />
      ));

      expect(getByText('Limited spending allowance')).toBeOnTheScreen();
    });
  });

  describe('card image rendering', () => {
    it('shows CardImage when not loading and no card details image', () => {
      const state = createBaseState(
        {
          status: 'ready',
          features: createFeatures(),
        },
        {
          cardDetailsToken: createCardDetailsTokenState({ imageUrl: null }),
        },
      );

      const { getByTestId } = renderWithProvider(() => (
        <CardHomeContent state={state} />
      ));

      expect(getByTestId('card-image')).toBeOnTheScreen();
    });

    it('passes correct card type and status to CardImage', () => {
      const state = createBaseState(
        {
          status: 'ready',
          features: createFeatures(),
        },
        {
          cardDetails: createCardDetails({ type: CardType.METAL }),
        },
      );

      const { getByTestId } = renderWithProvider(() => (
        <CardHomeContent state={state} />
      ));

      expect(getByTestId('card-image-type').children[0]).toBe(CardType.METAL);
    });

    it('shows card details image when imageUrl is available', () => {
      const state = createBaseState(
        {
          status: 'ready',
          features: createFeatures(),
        },
        {
          cardDetailsToken: createCardDetailsTokenState({
            imageUrl: 'https://example.com/card.png',
          }),
        },
      );

      const { getByTestId, queryByTestId } = renderWithProvider(() => (
        <CardHomeContent state={state} />
      ));

      expect(
        getByTestId(CardHomeSelectors.CARD_DETAILS_IMAGE),
      ).toBeOnTheScreen();
      expect(queryByTestId('card-image')).toBeNull();
    });
  });

  describe('refresh control', () => {
    it('renders scroll view with refresh control', () => {
      const state = createBaseState({
        status: 'ready',
        features: createFeatures(),
      });

      const { getByTestId } = renderWithProvider(() => (
        <CardHomeContent state={state} />
      ));

      expect(getByTestId(CardHomeSelectors.CARD_VIEW_TITLE)).toBeOnTheScreen();
    });
  });

  describe('user interactions', () => {
    it('calls openOnboardingDelegationAction when enable card is pressed', () => {
      const mockOpenOnboarding = jest.fn();
      const state = createBaseState(
        {
          status: 'setup_required',
          canEnable: true,
          isProvisioning: false,
        },
        {
          openOnboardingDelegationAction: mockOpenOnboarding,
        },
      );

      const { getByTestId } = renderWithProvider(() => (
        <CardHomeContent state={state} />
      ));

      fireEvent.press(getByTestId('mock-enable-card-button'));
      expect(mockOpenOnboarding).toHaveBeenCalledTimes(1);
    });

    it('calls logoutAction when logout is pressed', () => {
      const mockLogout = jest.fn();
      const state = createBaseState(
        {
          status: 'ready',
          features: createFeatures({ isAuthenticated: true }),
        },
        {
          logoutAction: mockLogout,
        },
      );

      const { getByTestId } = renderWithProvider(() => (
        <CardHomeContent state={state} />
      ));

      fireEvent.press(getByTestId('mock-logout-button'));
      expect(mockLogout).toHaveBeenCalledTimes(1);
    });

    it('calls navigateToCardTosPage when ToS is pressed', () => {
      const mockNavigateToTos = jest.fn();
      const state = createBaseState(
        {
          status: 'ready',
          features: createFeatures(),
        },
        {
          navigateToCardTosPage: mockNavigateToTos,
        },
      );

      const { getByTestId } = renderWithProvider(() => (
        <CardHomeContent state={state} />
      ));

      fireEvent.press(getByTestId('mock-tos-button'));
      expect(mockNavigateToTos).toHaveBeenCalledTimes(1);
    });
  });

  describe('isAuthenticated for non-ready states', () => {
    it('uses isAuthenticated from state for loading state', () => {
      const state = createBaseState(
        { status: 'loading' },
        { isAuthenticated: true },
      );

      const { getByTestId } = renderWithProvider(() => (
        <CardHomeContent state={state} />
      ));

      // The manage section should receive features with isAuthenticated=true
      expect(getByTestId('card-manage-section')).toBeOnTheScreen();
    });

    it('uses isAuthenticated from state for kyc_pending state', () => {
      const state = createBaseState(
        { status: 'kyc_pending' },
        { isAuthenticated: true },
      );

      const { getByTestId } = renderWithProvider(() => (
        <CardHomeContent state={state} />
      ));

      expect(getByTestId('card-manage-section')).toBeOnTheScreen();
    });
  });

  describe('default card values', () => {
    it('defaults to VIRTUAL card type when cardDetails is null', () => {
      const state = createBaseState(
        {
          status: 'ready',
          features: createFeatures(),
        },
        {
          cardDetails: null,
        },
      );

      const { getByTestId } = renderWithProvider(() => (
        <CardHomeContent state={state} />
      ));

      expect(getByTestId('card-image-type').children[0]).toBe(CardType.VIRTUAL);
    });
  });
});
