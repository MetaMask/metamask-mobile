import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';
import { WaysToEarn, WayToEarnType } from './WaysToEarn';
import Routes from '../../../../../../../constants/navigation/Routes';
import { ModalType } from '../../../../components/RewardsBottomSheetModal';

// Mock navigation
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

const mockUseNavigation = useNavigation as jest.MockedFunction<
  typeof useNavigation
>;

// Mock i18n strings
jest.mock('../../../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const mockStrings: Record<string, string> = {
      'rewards.ways_to_earn.title': 'Ways to Earn',
      'rewards.ways_to_earn.swap.title': 'Swap',
      'rewards.ways_to_earn.swap.points': 'Earn 2+ points per swap',
      'rewards.ways_to_earn.swap.sheet_description':
        'Earn points when you swap tokens',
      'rewards.ways_to_earn.swap.cta_label': 'Start Swapping',
      'rewards.ways_to_earn.perps.title': 'Trade Perps',
      'rewards.ways_to_earn.perps.points': 'Earn 1+ point per trade',
      'rewards.ways_to_earn.perps.sheet_title': 'Trade Perps',
      'rewards.ways_to_earn.perps.sheet_description':
        'Earn points when you trade perpetuals',
      'rewards.ways_to_earn.perps.cta_label': 'Start Trading',
      'rewards.ways_to_earn.referrals.title': 'Refer Friends',
      'rewards.ways_to_earn.referrals.points': 'Earn 10+ points per referral',
    };
    return mockStrings[key] || key;
  }),
}));

// Mock the SwapSupportedNetworksSection component
jest.mock('./SwapSupportedNetworksSection', () => ({
  SwapSupportedNetworksSection: () => {
    const React = jest.requireActual('react');
    const { Text } = jest.requireActual('react-native');
    return React.createElement(
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
jest.mock('../../../../../../../images/metamask-rewards-points.svg', () => ({
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
}));

describe('WaysToEarn', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseNavigation.mockReturnValue({
      navigate: mockNavigate,
      goBack: mockGoBack,
    } as unknown as ReturnType<typeof useNavigation>);
  });

  it('renders the component title', () => {
    // Arrange & Act
    const { getByText } = render(<WaysToEarn />);

    // Assert
    expect(getByText('Ways to Earn')).toBeOnTheScreen();
  });

  it('renders all earning ways', () => {
    // Arrange & Act
    const { getByText } = render(<WaysToEarn />);

    // Assert
    expect(getByText('Swap')).toBeOnTheScreen();
    expect(getByText('Trade Perps')).toBeOnTheScreen();
    expect(getByText('Refer Friends')).toBeOnTheScreen();
  });

  it('displays correct descriptions for each earning way', () => {
    // Arrange & Act
    const { getByText } = render(<WaysToEarn />);

    // Assert
    expect(getByText('Earn 2+ points per swap')).toBeOnTheScreen();
    expect(getByText('Earn 1+ point per trade')).toBeOnTheScreen();
    expect(getByText('Earn 10+ points per referral')).toBeOnTheScreen();
  });

  it('navigates to referrals when referral item is pressed', () => {
    // Arrange
    const { getByText } = render(<WaysToEarn />);
    const referralButton = getByText('Refer Friends');

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
          label: 'Start Swapping',
          variant: 'Primary',
        }),
      }),
    );
  });

  it('opens modal for perps earning way when pressed', () => {
    // Arrange
    const { getByText } = render(<WaysToEarn />);
    const perpsButton = getByText('Trade Perps');

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
          label: 'Start Trading',
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
    expect(mockNavigate).toHaveBeenCalledWith(Routes.SWAPS);
  });

  it('navigates to perps route when perps CTA is pressed', () => {
    // Arrange
    const { getByText } = render(<WaysToEarn />);
    const perpsButton = getByText('Trade Perps');

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
    expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ROOT);
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
    });
  });
});
