import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { WaysToEarn, WayToEarnType } from './WaysToEarn';
import Routes from '../../../../../../../constants/navigation/Routes';
import { ModalType } from '../../../../components/RewardsBottomSheetModal';
import { SwapBridgeNavigationLocation } from '../../../../../Bridge/hooks/useSwapBridgeNavigation';
import { selectIsFirstTimePerpsUser } from '../../../../../Perps/selectors/perpsController';
import {
  selectRewardsCardSpendFeatureFlags,
  selectRewardsMusdDepositEnabledFlag,
} from '../../../../../../../selectors/featureFlagController/rewards';
import {
  useFeatureFlag,
  FeatureFlagNames,
} from '../../../../../../../components/hooks/useFeatureFlag';
import { MetaMetricsEvents } from '../../../../../../hooks/useMetrics';
import { RewardsMetricsButtons } from '../../../../utils';
import { useRampNavigation } from '../../../../../Ramp/hooks/useRampNavigation';
import { toCaipAssetType } from '@metamask/utils';
import { getDecimalChainId } from '../../../../../../../util/networks';

// Mock navigation
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockGoToSwaps = jest.fn();
const mockGoToBuy = jest.fn();
const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn();
let mockIsFirstTimePerpsUser = false;
let mockIsCardSpendEnabled = false;
let mockIsPredictEnabled = false;
let mockIsMusdDepositEnabled = false;
let mockIsMusdHoldingEnabled = false;

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

// Mock useSwapBridgeNavigation hook
// Note: jest.mock is hoisted, but the factory function runs at module load time
// when the variables below are already defined, so they should be accessible
jest.mock('../../../../../Bridge/hooks/useSwapBridgeNavigation', () =>
  // We need to reference the mocks, but they're defined below
  // So we'll create the factory function that will access them at runtime
  ({
    SwapBridgeNavigationLocation: {
      Rewards: 'rewards',
    },
    useSwapBridgeNavigation: jest.fn(),
  }),
);

// Mock useRampNavigation hook
jest.mock('../../../../../Ramp/hooks/useRampNavigation', () => ({
  useRampNavigation: jest.fn(),
}));

// Mock @metamask/utils
jest.mock('@metamask/utils', () => ({
  ...jest.requireActual('@metamask/utils'),
  toCaipAssetType: jest.fn(),
}));

// Mock network utilities
jest.mock('../../../../../../../util/networks', () => ({
  ...jest.requireActual('../../../../../../../util/networks'),
  getDecimalChainId: jest.fn(),
}));

// Mock NETWORKS_CHAIN_ID constant
jest.mock('../../../../../../../constants/network', () => ({
  ...jest.requireActual('../../../../../../../constants/network'),
  NETWORKS_CHAIN_ID: {
    LINEA_MAINNET: '0xe708',
  },
}));

// Mock react-redux
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

// Mock useMetrics hook
jest.mock('../../../../../../hooks/useMetrics', () => ({
  useMetrics: jest.fn(() => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  })),
  MetaMetricsEvents: {
    REWARDS_WAYS_TO_EARN_CTA_CLICKED: 'rewards_ways_to_earn_cta_clicked',
    REWARDS_PAGE_BUTTON_CLICKED: 'rewards_page_button_clicked',
  },
}));

// Mock useFeatureFlag hook
jest.mock('../../../../../../../components/hooks/useFeatureFlag', () => {
  const actual = jest.requireActual(
    '../../../../../../../components/hooks/useFeatureFlag',
  );
  return {
    useFeatureFlag: jest.fn(),
    FeatureFlagNames: actual.FeatureFlagNames,
  };
});

// Mock getNativeAssetForChainId
jest.mock('@metamask/bridge-controller', () => ({
  getNativeAssetForChainId: jest.fn(() => ({
    address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
    symbol: 'ETH',
    decimals: 18,
  })),
}));

const mockUseNavigation = useNavigation as jest.MockedFunction<
  typeof useNavigation
>;

const mockUseFeatureFlag = useFeatureFlag as jest.MockedFunction<
  typeof useFeatureFlag
>;

const mockUseRampNavigation = useRampNavigation as jest.MockedFunction<
  typeof useRampNavigation
>;

const mockToCaipAssetType = toCaipAssetType as jest.MockedFunction<
  typeof toCaipAssetType
>;

const mockGetDecimalChainId = getDecimalChainId as jest.MockedFunction<
  typeof getDecimalChainId
>;

// Mock i18n strings
jest.mock('../../../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const mockStrings: Record<string, string> = {
      'rewards.ways_to_earn.title': 'Ways to earn',
      'rewards.ways_to_earn.swap.title': 'Swap',
      'rewards.ways_to_earn.swap.description': '80 points per $100',
      'rewards.ways_to_earn.swap.sheet.title': 'Swap tokens',
      'rewards.ways_to_earn.swap.sheet.points': '80 points per $100',
      'rewards.ways_to_earn.swap.sheet.description':
        'Swap tokens on supported networks to earn points for every dollar you trade.',
      'rewards.ways_to_earn.swap.sheet.cta_label': 'Start a swap',
      'rewards.ways_to_earn.perps.title': 'Perps',
      'rewards.ways_to_earn.perps.description': '10 points per $100',
      'rewards.ways_to_earn.perps.sheet.title': 'Trade perps',
      'rewards.ways_to_earn.perps.sheet.points': '10 points per $100',
      'rewards.ways_to_earn.perps.sheet.description':
        'Earn points on every trade, including opens and closes, stop loss and take profit orders, and margin adjustments.',
      'rewards.ways_to_earn.perps.sheet.cta_label': 'Start a trade',
      'rewards.ways_to_earn.referrals.title': 'Refer friends',
      'rewards.ways_to_earn.referrals.description':
        '10 points per 50 from friends',
      'rewards.ways_to_earn.loyalty.title': 'Loyalty bonus',
      'rewards.ways_to_earn.loyalty.description':
        'Earn points from past trades',
      'rewards.ways_to_earn.loyalty.sheet.title': 'Loyalty bonus',
      'rewards.ways_to_earn.loyalty.sheet.points': '250 points per $1250',
      'rewards.ways_to_earn.loyalty.sheet.description':
        'Add accounts with past swaps or bridges in MetaMask to earn loyalty bonuses. Each eligible account unlocks points in increments of 250, up to a total of 50,000. Bonuses appear shortly after you add an account.',
      'rewards.ways_to_earn.loyalty.sheet.cta_label': 'Add accounts',
      // Predict strings
      'rewards.ways_to_earn.predict.title': 'Prediction markets',
      'rewards.ways_to_earn.predict.description':
        '20 points per $10 prediction',
      'rewards.ways_to_earn.predict.sheet.title': 'Prediction markets',
      'rewards.ways_to_earn.predict.sheet.points': '20 points per $10',
      'rewards.ways_to_earn.predict.sheet.description':
        'Earn points on every $10 you trade.',
      'rewards.ways_to_earn.predict.sheet.cta_label': 'Browse markets',
      // Card strings
      'rewards.ways_to_earn.card.title': 'MetaMask Card',
      'rewards.ways_to_earn.card.description': '1 point per $1 spent',
      'rewards.ways_to_earn.card.sheet.title': 'MetaMask Card',
      'rewards.ways_to_earn.card.sheet.points': '1 point per $1 spent',
      'rewards.ways_to_earn.card.sheet.description':
        'Earn points every time you use your MetaMask Card for purchases, plus 1% cash back (3% for Metal cardholders).',
      'rewards.ways_to_earn.card.sheet.cta_label': 'Manage Card',
      // Deposit MUSD strings
      'rewards.ways_to_earn.deposit_musd.title': 'Deposit mUSD',
      'rewards.ways_to_earn.deposit_musd.description':
        '2 points per $100 deposited',
      'rewards.ways_to_earn.deposit_musd.sheet.title': 'Deposit mUSD',
      'rewards.ways_to_earn.deposit_musd.sheet.points': '2 points per $100',
      'rewards.ways_to_earn.deposit_musd.sheet.description':
        'Earn points on every $100 mUSD you deposit.',
      'rewards.ways_to_earn.deposit_musd.sheet.cta_label': 'Deposit mUSD',
      // Hold MUSD strings
      'rewards.ways_to_earn.hold_musd.title': 'Hold mUSD',
      'rewards.ways_to_earn.hold_musd.description':
        '10 points per $100 deposited',
      'rewards.ways_to_earn.hold_musd.sheet.title': 'Hold mUSD',
      'rewards.ways_to_earn.hold_musd.sheet.points': '10 points per $100',
      'rewards.ways_to_earn.hold_musd.sheet.description':
        'Earn points on every $100 mUSD you hold.',
      'rewards.ways_to_earn.hold_musd.sheet.cta_label': 'Hold mUSD',
    };
    return mockStrings[key] || key;
  }),
}));

// Mock the SwapSupportedNetworksSection component
jest.mock('./SwapSupportedNetworksSection', () => ({
  SwapSupportedNetworksSection: () => {
    const ReactActual = jest.requireActual('react');
    const { Text } = jest.requireActual('react-native');
    return ReactActual.createElement(
      Text,
      { testID: 'swap-supported-networks' },
      'Supported Networks',
    );
  },
}));

// Mock useTailwind hook
jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => {
    const mockTw = jest.fn(() => ({}));
    // Add the style method to the mock function
    Object.assign(mockTw, {
      style: jest.fn(() => ({})),
    });
    return mockTw;
  },
}));

// Mock SVG component
jest.mock(
  '../../../../../../../images/rewards/metamask-rewards-points.svg',
  () => ({
    __esModule: true,
    default: () => {
      const ReactActual = jest.requireActual('react');
      const { Text } = jest.requireActual('react-native');
      return ReactActual.createElement(
        Text,
        { testID: 'metamask-rewards-points' },
        'Points Icon',
      );
    },
  }),
);

describe('WaysToEarn', () => {
  let openURLSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    openURLSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    mockIsFirstTimePerpsUser = false;
    mockIsCardSpendEnabled = false;
    mockIsPredictEnabled = false;
    mockIsMusdDepositEnabled = false;
    mockIsMusdHoldingEnabled = false;

    mockUseNavigation.mockReturnValue({
      navigate: mockNavigate,
      goBack: mockGoBack,
    } as unknown as ReturnType<typeof useNavigation>);

    // Mock createEventBuilder to return a builder object
    mockCreateEventBuilder.mockImplementation(() => ({
      addProperties: jest.fn().mockReturnThis(),
      addSensitiveProperties: jest.fn().mockReturnThis(),
      build: jest.fn().mockReturnValue({}),
    }));

    // Assign useSelector implementation here so we can safely reference imported selectors
    const mockUseSelector = jest.requireMock('react-redux')
      .useSelector as jest.Mock;
    mockUseSelector.mockImplementation((selector: unknown) => {
      if (selector === selectIsFirstTimePerpsUser) {
        return mockIsFirstTimePerpsUser;
      }
      if (selector === selectRewardsCardSpendFeatureFlags) {
        return mockIsCardSpendEnabled;
      }
      if (selector === selectRewardsMusdDepositEnabledFlag) {
        return mockIsMusdDepositEnabled;
      }
      return undefined;
    });
    // Mock useFeatureFlag to return different values based on flag name
    mockUseFeatureFlag.mockImplementation((flagName) => {
      if (flagName === FeatureFlagNames.predictTradingEnabled) {
        return mockIsPredictEnabled;
      }
      if (flagName === FeatureFlagNames.rewardsEnableMusdHolding) {
        return mockIsMusdHoldingEnabled;
      }
      return false;
    });

    // Configure useSwapBridgeNavigation mock implementation
    const { useSwapBridgeNavigation } = jest.requireMock(
      '../../../../../Bridge/hooks/useSwapBridgeNavigation',
    );
    (useSwapBridgeNavigation as jest.Mock).mockImplementation(() => ({
      goToSwaps: mockGoToSwaps,
    }));

    // Configure useRampNavigation mock implementation
    mockUseRampNavigation.mockReturnValue({
      goToBuy: mockGoToBuy,
      goToAggregator: jest.fn(),
      goToSell: jest.fn(),
      goToDeposit: jest.fn(),
    } as ReturnType<typeof useRampNavigation>);

    // Configure toCaipAssetType mock
    mockToCaipAssetType.mockImplementation(
      (chainNamespace, chainId, assetNamespace, assetReference) =>
        `${chainNamespace}:${chainId}/${assetNamespace}:${assetReference}`,
    );

    // Configure getDecimalChainId mock
    mockGetDecimalChainId.mockImplementation((chainId) =>
      // Convert hex to decimal for LINEA_MAINNET (0xe708 = 59144)
      chainId === '0xe708' ? '59144' : chainId,
    );
  });

  it('renders the component title', () => {
    // Arrange & Act
    const { getByText } = render(<WaysToEarn />);

    // Assert
    expect(getByText('Ways to earn')).toBeOnTheScreen();
  });

  it('renders all earning ways', () => {
    // Arrange & Act
    const { getByText, queryByText } = render(<WaysToEarn />);

    // Assert
    expect(getByText('Swap')).toBeOnTheScreen();
    expect(getByText('Perps')).toBeOnTheScreen();
    expect(getByText('Refer friends')).toBeOnTheScreen();
    expect(getByText('Loyalty bonus')).toBeOnTheScreen();
    // Predict hidden when flag disabled
    expect(queryByText('Prediction markets')).not.toBeOnTheScreen();
    // MM Card Spend hidden when flag disabled
    expect(queryByText('MetaMask Card')).not.toBeOnTheScreen();
    // Deposit mUSD hidden when flag disabled
    expect(queryByText('Deposit mUSD')).not.toBeOnTheScreen();
    // Hold mUSD hidden when flag disabled
    expect(queryByText('Hold mUSD')).not.toBeOnTheScreen();
  });

  it('displays correct descriptions for each earning way', () => {
    // Arrange & Act
    const { getByText, queryByText } = render(<WaysToEarn />);

    // Assert
    expect(getByText('80 points per $100')).toBeOnTheScreen();
    expect(getByText('10 points per $100')).toBeOnTheScreen();
    expect(getByText('10 points per 50 from friends')).toBeOnTheScreen();
    expect(getByText('Earn points from past trades')).toBeOnTheScreen();
    expect(queryByText('20 points per $10 prediction')).not.toBeOnTheScreen();
    expect(queryByText('1 point per $1 spent')).not.toBeOnTheScreen();
    expect(queryByText('2 points per $100 deposited')).not.toBeOnTheScreen();
    expect(queryByText('10 points per $100 deposited')).not.toBeOnTheScreen();
  });

  it('opens referral bottom sheet modal when referral item is pressed', () => {
    // Arrange
    const { getByText } = render(<WaysToEarn />);
    const referralButton = getByText('Refer friends');

    // Act
    fireEvent.press(referralButton);

    // Assert
    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.MODAL.REWARDS_REFERRAL_BOTTOM_SHEET_MODAL,
    );
    expect(mockTrackEvent).toHaveBeenCalled();
    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.REWARDS_PAGE_BUTTON_CLICKED,
    );
  });

  it('opens modal for swap earning way when pressed', () => {
    // Arrange
    const { getByText } = render(<WaysToEarn />);
    const swapButton = getByText('Swap');

    // Act
    fireEvent.press(swapButton);

    // Assert
    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.MODAL.REWARDS_BOTTOM_SHEET_MODAL,
      expect.objectContaining({
        type: ModalType.Confirmation,
        showIcon: false,
        showCancelButton: false,
        confirmAction: expect.objectContaining({
          label: 'Start a swap',
          variant: 'Primary',
        }),
      }),
    );
    expect(mockTrackEvent).toHaveBeenCalled();
    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.REWARDS_PAGE_BUTTON_CLICKED,
    );
  });

  it('opens modal for perps earning way when pressed', () => {
    // Arrange
    const { getByText } = render(<WaysToEarn />);
    const perpsButton = getByText('Perps');

    // Act
    fireEvent.press(perpsButton);

    // Assert
    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.MODAL.REWARDS_BOTTOM_SHEET_MODAL,
      expect.objectContaining({
        type: ModalType.Confirmation,
        showIcon: false,
        showCancelButton: false,
        confirmAction: expect.objectContaining({
          label: 'Start a trade',
          variant: 'Primary',
        }),
      }),
    );
  });

  it('navigates to swaps route when swap CTA is pressed', () => {
    // Arrange
    const { getByText } = render(<WaysToEarn />);
    const swapButton = getByText('Swap');

    // Act
    fireEvent.press(swapButton);

    // Get the onPress handler from the modal navigation call
    const modalCall = mockNavigate.mock.calls.find(
      (call) => call[0] === Routes.MODAL.REWARDS_BOTTOM_SHEET_MODAL,
    );
    const confirmAction = modalCall?.[1]?.confirmAction;

    // Execute the CTA action
    confirmAction?.onPress();

    // Assert
    expect(mockGoBack).toHaveBeenCalled();
    expect(mockGoToSwaps).toHaveBeenCalled();
    expect(mockTrackEvent).toHaveBeenCalled();
    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.REWARDS_WAYS_TO_EARN_CTA_CLICKED,
    );
  });

  it('navigates to perps tutorial for first-time users', () => {
    // Arrange
    mockIsFirstTimePerpsUser = true;
    const { getByText } = render(<WaysToEarn />);
    const perpsButton = getByText('Perps');

    // Act
    fireEvent.press(perpsButton);

    // Get the onPress handler from the modal navigation call
    const modalCall = mockNavigate.mock.calls.find(
      (call) => call[0] === Routes.MODAL.REWARDS_BOTTOM_SHEET_MODAL,
    );
    const confirmAction = modalCall?.[1]?.confirmAction;

    // Execute the CTA action
    confirmAction?.onPress();

    // Assert
    expect(mockGoBack).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.TUTORIAL);
  });

  it('navigates to perps markets for returning users', () => {
    // Arrange
    mockIsFirstTimePerpsUser = false;
    const { getByText } = render(<WaysToEarn />);
    const perpsButton = getByText('Perps');

    // Act
    fireEvent.press(perpsButton);

    // Get the onPress handler from the modal navigation call
    const modalCall = mockNavigate.mock.calls.find(
      (call) => call[0] === Routes.MODAL.REWARDS_BOTTOM_SHEET_MODAL,
    );
    const confirmAction = modalCall?.[1]?.confirmAction;

    // Execute the CTA action
    confirmAction?.onPress();

    // Assert
    expect(mockGoBack).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ROOT, {
      screen: Routes.PERPS.PERPS_HOME,
    });
  });

  it('opens modal for loyalty earning way when pressed', () => {
    // Arrange
    const { getByText } = render(<WaysToEarn />);
    const loyaltyButton = getByText('Loyalty bonus');

    // Act
    fireEvent.press(loyaltyButton);

    // Assert
    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.MODAL.REWARDS_BOTTOM_SHEET_MODAL,
      expect.objectContaining({
        type: ModalType.Confirmation,
        showIcon: false,
        showCancelButton: false,
        confirmAction: expect.objectContaining({
          label: 'Add accounts',
          variant: 'Primary',
        }),
      }),
    );
  });

  it('navigates to rewards settings when loyalty CTA is pressed', () => {
    // Arrange
    const { getByText } = render(<WaysToEarn />);
    const loyaltyButton = getByText('Loyalty bonus');

    // Act
    fireEvent.press(loyaltyButton);

    // Get the onPress handler from the modal navigation call
    const modalCall = mockNavigate.mock.calls.find(
      (call) => call[0] === Routes.MODAL.REWARDS_BOTTOM_SHEET_MODAL,
    );
    const confirmAction = modalCall?.[1]?.confirmAction;

    // Execute the CTA action
    confirmAction?.onPress();

    // Assert
    expect(mockGoBack).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith(Routes.REWARDS_SETTINGS_VIEW);
  });

  it('displays loyalty bonus modal with correct title and description', () => {
    // Arrange
    const { getByText } = render(<WaysToEarn />);
    const loyaltyButton = getByText('Loyalty bonus');

    // Act
    fireEvent.press(loyaltyButton);

    // Get the modal navigation call
    const modalCall = mockNavigate.mock.calls.find(
      (call) => call[0] === Routes.MODAL.REWARDS_BOTTOM_SHEET_MODAL,
    );

    // Assert
    expect(modalCall).toBeTruthy();
    expect(modalCall?.[1]?.title).toBeTruthy();
    expect(modalCall?.[1]?.description).toBeTruthy();
  });

  it('includes supported networks section in swap modal description', () => {
    // Arrange
    const { getByText } = render(<WaysToEarn />);
    const swapButton = getByText('Swap');

    // Act
    fireEvent.press(swapButton);

    // Get the modal navigation call
    const modalCall = mockNavigate.mock.calls.find(
      (call) => call[0] === Routes.MODAL.REWARDS_BOTTOM_SHEET_MODAL,
    );

    // Assert
    expect(modalCall).toBeTruthy();
    expect(modalCall?.[1]?.description).toBeTruthy();
  });

  describe('WayToEarnType enum', () => {
    it('has correct values', () => {
      // Assert
      expect(WayToEarnType.SWAPS).toBe('swaps');
      expect(WayToEarnType.PERPS).toBe('perps');
      expect(WayToEarnType.REFERRALS).toBe('referrals');
      expect(WayToEarnType.LOYALTY).toBe('loyalty');
      expect(WayToEarnType.PREDICT).toBe('predict');
      expect(WayToEarnType.CARD).toBe('card');
      expect(WayToEarnType.DEPOSIT_MUSD).toBe('deposit_musd');
      expect(WayToEarnType.HOLD_MUSD).toBe('hold_musd');
    });
  });

  describe('Predict', () => {
    it('shows Predict earning way only when feature flag is enabled', () => {
      // Arrange
      const { queryByText, rerender } = render(<WaysToEarn />);

      // Assert hidden by default
      expect(queryByText('Prediction markets')).not.toBeOnTheScreen();

      // Enable flag
      mockIsPredictEnabled = true;
      rerender(<WaysToEarn />);

      // Assert visible now
      expect(queryByText('Prediction markets')).toBeOnTheScreen();
      expect(queryByText('20 points per $10 prediction')).toBeOnTheScreen();
    });

    it('opens modal for predict earning way when pressed', () => {
      // Arrange
      mockIsPredictEnabled = true;
      const { getByText } = render(<WaysToEarn />);
      const predictButton = getByText('Prediction markets');

      // Act
      fireEvent.press(predictButton);

      // Assert
      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.MODAL.REWARDS_BOTTOM_SHEET_MODAL,
        expect.objectContaining({
          type: ModalType.Confirmation,
          showIcon: false,
          showCancelButton: false,
          confirmAction: expect.objectContaining({
            label: 'Browse markets',
            variant: 'Primary',
          }),
        }),
      );
      expect(mockTrackEvent).toHaveBeenCalled();
      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.REWARDS_PAGE_BUTTON_CLICKED,
      );
    });

    it('navigates to predict market list when predict CTA is pressed', () => {
      // Arrange
      mockIsPredictEnabled = true;
      const { getByText } = render(<WaysToEarn />);
      const predictButton = getByText('Prediction markets');

      // Act
      fireEvent.press(predictButton);

      // Get the onPress handler from the modal navigation call
      const modalCall = mockNavigate.mock.calls.find(
        (call) => call[0] === Routes.MODAL.REWARDS_BOTTOM_SHEET_MODAL,
      );
      const confirmAction = modalCall?.[1]?.confirmAction;

      // Execute the CTA action
      confirmAction?.onPress();

      // Assert
      expect(mockGoBack).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.ROOT, {
        screen: Routes.PREDICT.MARKET_LIST,
        params: {
          entryPoint: expect.any(String),
        },
      });
      expect(mockTrackEvent).toHaveBeenCalled();
      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.REWARDS_WAYS_TO_EARN_CTA_CLICKED,
      );
    });
  });

  describe('Card spend', () => {
    it('shows Card earning way only when feature flag is enabled', () => {
      // Arrange
      const { queryByText, rerender } = render(<WaysToEarn />);

      // Assert hidden by default
      expect(queryByText('MetaMask Card')).not.toBeOnTheScreen();

      // Enable flag
      mockIsCardSpendEnabled = true;
      rerender(<WaysToEarn />);

      // Assert visible now
      expect(queryByText('MetaMask Card')).toBeOnTheScreen();
      expect(queryByText('1 point per $1 spent')).toBeOnTheScreen();
    });

    it('opens modal and navigates to Card root on CTA', () => {
      // Arrange
      mockIsCardSpendEnabled = true;
      const { getByText } = render(<WaysToEarn />);

      // Open card info modal
      fireEvent.press(getByText('MetaMask Card'));

      // Extract confirm action
      const modalCall = mockNavigate.mock.calls.find(
        (call) => call[0] === Routes.MODAL.REWARDS_BOTTOM_SHEET_MODAL,
      );
      const confirmAction = modalCall?.[1]?.confirmAction;

      // Act
      confirmAction?.onPress();

      // Assert
      expect(mockGoBack).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith(Routes.CARD.ROOT);
    });
  });

  describe('Deposit mUSD', () => {
    it('shows Deposit mUSD earning way only when feature flag is enabled', () => {
      // Arrange
      const { queryByText, rerender } = render(<WaysToEarn />);

      // Assert hidden by default
      expect(queryByText('Deposit mUSD')).not.toBeOnTheScreen();

      // Enable flag
      mockIsMusdDepositEnabled = true;
      rerender(<WaysToEarn />);

      // Assert visible now
      expect(queryByText('Deposit mUSD')).toBeOnTheScreen();
      expect(queryByText('2 points per $100 deposited')).toBeOnTheScreen();
    });

    it('opens modal for deposit mUSD earning way when pressed', () => {
      // Arrange
      mockIsMusdDepositEnabled = true;
      const { getByText } = render(<WaysToEarn />);
      const depositMusdButton = getByText('Deposit mUSD');

      // Act
      fireEvent.press(depositMusdButton);

      // Assert
      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.MODAL.REWARDS_BOTTOM_SHEET_MODAL,
        expect.objectContaining({
          type: ModalType.Confirmation,
          showIcon: false,
          showCancelButton: false,
          confirmAction: expect.objectContaining({
            label: 'Deposit mUSD',
            variant: 'Primary',
          }),
        }),
      );
      expect(mockTrackEvent).toHaveBeenCalled();
      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.REWARDS_PAGE_BUTTON_CLICKED,
      );
    });

    it('opens URL when deposit mUSD CTA is pressed', () => {
      // Arrange
      mockIsMusdDepositEnabled = true;
      const { getByText } = render(<WaysToEarn />);
      const depositMusdButton = getByText('Deposit mUSD');

      // Act
      fireEvent.press(depositMusdButton);

      // Get the onPress handler from the modal navigation call
      const modalCall = mockNavigate.mock.calls.find(
        (call) => call[0] === Routes.MODAL.REWARDS_BOTTOM_SHEET_MODAL,
      );
      const confirmAction = modalCall?.[1]?.confirmAction;

      // Execute the CTA action
      confirmAction?.onPress();

      // Assert
      expect(mockGoBack).toHaveBeenCalled();
      expect(openURLSpy).toHaveBeenCalledWith(
        'https://go.metamask.io/turtle-musd',
      );
      expect(mockTrackEvent).toHaveBeenCalled();
      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.REWARDS_WAYS_TO_EARN_CTA_CLICKED,
      );
    });
  });

  describe('Hold mUSD', () => {
    it('shows Hold mUSD earning way only when feature flag is enabled', () => {
      // Arrange
      const { queryByText, rerender } = render(<WaysToEarn />);

      // Assert hidden by default
      expect(queryByText('Hold mUSD')).not.toBeOnTheScreen();

      // Enable flag
      mockIsMusdHoldingEnabled = true;
      rerender(<WaysToEarn />);

      // Assert visible now
      expect(queryByText('Hold mUSD')).toBeOnTheScreen();
      expect(queryByText('10 points per $100 deposited')).toBeOnTheScreen();
    });

    it('opens modal for hold mUSD earning way when pressed', () => {
      // Arrange
      mockIsMusdHoldingEnabled = true;
      const { getByText } = render(<WaysToEarn />);
      const holdMusdButton = getByText('Hold mUSD');

      // Act
      fireEvent.press(holdMusdButton);

      // Assert
      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.MODAL.REWARDS_BOTTOM_SHEET_MODAL,
        expect.objectContaining({
          type: ModalType.Confirmation,
          showIcon: false,
          showCancelButton: false,
          confirmAction: expect.objectContaining({
            label: 'Hold mUSD',
            variant: 'Primary',
          }),
        }),
      );
      expect(mockTrackEvent).toHaveBeenCalled();
      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.REWARDS_PAGE_BUTTON_CLICKED,
      );
    });

    it('calls goToBuy with correct assetId when hold mUSD CTA is pressed', () => {
      // Arrange
      mockIsMusdHoldingEnabled = true;
      const { getByText } = render(<WaysToEarn />);
      const holdMusdButton = getByText('Hold mUSD');

      // Act
      fireEvent.press(holdMusdButton);

      // Get the onPress handler from the modal navigation call
      const modalCall = mockNavigate.mock.calls.find(
        (call) => call[0] === Routes.MODAL.REWARDS_BOTTOM_SHEET_MODAL,
      );
      const confirmAction = modalCall?.[1]?.confirmAction;

      // Execute the CTA action
      confirmAction?.onPress();

      // Assert
      expect(mockGoBack).toHaveBeenCalled();
      expect(mockGoToBuy).toHaveBeenCalledWith({
        assetId:
          'eip155:59144/erc20:0xaca92e438df0b2401ff60da7e4337b687a2435da',
      });
      expect(mockTrackEvent).toHaveBeenCalled();
      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.REWARDS_WAYS_TO_EARN_CTA_CLICKED,
      );
    });
  });

  describe('useSwapBridgeNavigation integration', () => {
    it('configures the hook with correct parameters for regular swaps', () => {
      // Get the mock from jest.requireMock
      const { useSwapBridgeNavigation } = jest.requireMock(
        '../../../../../Bridge/hooks/useSwapBridgeNavigation',
      );

      // Render the component to trigger the hook
      render(<WaysToEarn />);

      // Assert the hook was called with correct parameters for regular swaps
      expect(useSwapBridgeNavigation).toHaveBeenCalledWith({
        location: SwapBridgeNavigationLocation.Rewards,
        sourcePage: 'rewards_overview',
      });
    });
  });

  describe('useRampNavigation integration', () => {
    it('creates correct mUSD assetId using toCaipAssetType and getDecimalChainId', () => {
      // Arrange
      mockIsMusdHoldingEnabled = true;

      // Act
      render(<WaysToEarn />);

      // Assert
      expect(mockGetDecimalChainId).toHaveBeenCalledWith('0xe708');
      expect(mockToCaipAssetType).toHaveBeenCalledWith(
        'eip155',
        '59144',
        'erc20',
        '0xaca92e438df0b2401ff60da7e4337b687a2435da',
      );
      expect(mockUseRampNavigation).toHaveBeenCalled();
    });
  });

  describe('Metrics tracking', () => {
    it('tracks button click event with correct properties when earning way is pressed', () => {
      // Arrange
      const { getByText } = render(<WaysToEarn />);
      const swapButton = getByText('Swap');

      // Act
      fireEvent.press(swapButton);

      // Assert
      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.REWARDS_PAGE_BUTTON_CLICKED,
      );
      const builder = mockCreateEventBuilder.mock.results[0].value;
      expect(builder.addProperties).toHaveBeenCalledWith({
        button_type: RewardsMetricsButtons.WAYS_TO_EARN,
        ways_to_earn_type: WayToEarnType.SWAPS,
      });
      expect(mockTrackEvent).toHaveBeenCalled();
    });

    it('tracks CTA click event with correct properties when CTA is pressed', () => {
      // Arrange
      const { getByText } = render(<WaysToEarn />);
      const swapButton = getByText('Swap');

      // Act
      fireEvent.press(swapButton);

      // Get the onPress handler from the modal navigation call
      const modalCall = mockNavigate.mock.calls.find(
        (call) => call[0] === Routes.MODAL.REWARDS_BOTTOM_SHEET_MODAL,
      );
      const confirmAction = modalCall?.[1]?.confirmAction;

      // Clear previous calls to track only CTA event
      mockCreateEventBuilder.mockClear();
      mockTrackEvent.mockClear();

      // Execute the CTA action
      confirmAction?.onPress();

      // Assert
      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.REWARDS_WAYS_TO_EARN_CTA_CLICKED,
      );
      const ctaBuilder = mockCreateEventBuilder.mock.results[0]?.value;
      expect(ctaBuilder).toBeTruthy();
      expect(ctaBuilder.addProperties).toHaveBeenCalledWith({
        ways_to_earn_type: WayToEarnType.SWAPS,
      });
      expect(mockTrackEvent).toHaveBeenCalled();
    });
  });
});
