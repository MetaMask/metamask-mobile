import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';
import { WaysToEarn, WayToEarnType } from './WaysToEarn';
import Routes from '../../../../../../../constants/navigation/Routes';
import { ModalType } from '../../../../components/RewardsBottomSheetModal';
import { SwapBridgeNavigationLocation } from '../../../../../Bridge/hooks/useSwapBridgeNavigation';

// Mock navigation
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockGoToSwaps = jest.fn();
let mockIsFirstTimePerpsUser = false;

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

// Mock useSwapBridgeNavigation hook
jest.mock('../../../../../Bridge/hooks/useSwapBridgeNavigation', () => ({
  SwapBridgeNavigationLocation: {
    Rewards: 'rewards',
  },
  useSwapBridgeNavigation: jest.fn(() => ({
    goToSwaps: mockGoToSwaps,
  })),
}));

// Mock react-redux
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(
    () =>
      // For the isFirstTimePerpsUser selector
      mockIsFirstTimePerpsUser,
  ),
}));

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
      const React = jest.requireActual('react');
      const { Text } = jest.requireActual('react-native');
      return React.createElement(
        Text,
        { testID: 'metamask-rewards-points' },
        'Points Icon',
      );
    },
  }),
);

describe('WaysToEarn', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsFirstTimePerpsUser = false;

    mockUseNavigation.mockReturnValue({
      navigate: mockNavigate,
      goBack: mockGoBack,
    } as unknown as ReturnType<typeof useNavigation>);
  });

  it('renders the component title', () => {
    // Arrange & Act
    const { getByText } = render(<WaysToEarn />);

    // Assert
    expect(getByText('Ways to earn')).toBeOnTheScreen();
  });

  it('renders all earning ways', () => {
    // Arrange & Act
    const { getByText } = render(<WaysToEarn />);

    // Assert
    expect(getByText('Swap')).toBeOnTheScreen();
    expect(getByText('Perps')).toBeOnTheScreen();
    expect(getByText('Refer friends')).toBeOnTheScreen();
    expect(getByText('Loyalty bonus')).toBeOnTheScreen();
  });

  it('displays correct descriptions for each earning way', () => {
    // Arrange & Act
    const { getByText } = render(<WaysToEarn />);

    // Assert
    expect(getByText('80 points per $100')).toBeOnTheScreen();
    expect(getByText('10 points per $100')).toBeOnTheScreen();
    expect(getByText('10 points per 50 from friends')).toBeOnTheScreen();
    expect(getByText('Earn points from past trades')).toBeOnTheScreen();
  });

  it('navigates to referrals when referral item is pressed', () => {
    // Arrange
    const { getByText } = render(<WaysToEarn />);
    const referralButton = getByText('Refer friends');

    // Act
    fireEvent.press(referralButton);

    // Assert
    expect(mockNavigate).toHaveBeenCalledWith(Routes.REFERRAL_REWARDS_VIEW);
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
      screen: Routes.PERPS.MARKETS,
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
    });
  });

  describe('useSwapBridgeNavigation integration', () => {
    it('configures the hook with correct parameters', () => {
      // Import the actual hook module to verify mock calls
      const { useSwapBridgeNavigation } = jest.requireMock(
        '../../../../../Bridge/hooks/useSwapBridgeNavigation',
      );

      // Render the component to trigger the hook
      render(<WaysToEarn />);

      // Assert the hook was called with correct parameters
      expect(useSwapBridgeNavigation).toHaveBeenCalledWith({
        location: SwapBridgeNavigationLocation.Rewards,
        sourcePage: 'rewards_overview',
      });
    });
  });
});
