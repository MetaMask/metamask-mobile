import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import CashGetMusdEmptyState from './CashGetMusdEmptyState';
import { CashGetMusdEmptyStateSelectors } from './CashGetMusdEmptyState.testIds';
import NavigationService from '../../../../../core/NavigationService';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { MUSD_EVENTS_CONSTANTS } from '../../../../UI/Earn/constants/events';
import { useMerklBonusClaim } from '../../../../UI/Earn/components/MerklRewards/hooks/useMerklBonusClaim';

jest.mock('../../../../../core/NavigationService', () => {
  const mockNavigate = jest.fn();
  return {
    __esModule: true,
    default: {
      navigation: { navigate: mockNavigate },
    },
  };
});

const mockGoToBuy = jest.fn();
jest.mock('../../../../UI/Ramp/hooks/useRampNavigation', () => ({
  useRampNavigation: () => ({ goToBuy: mockGoToBuy }),
}));

const mockTrackEvent = jest.fn();
const mockAddProperties = jest.fn().mockReturnThis();
const mockBuild = jest.fn();
const mockCreateEventBuilder = jest.fn(() => ({
  addProperties: mockAddProperties,
  build: mockBuild,
}));
jest.mock('../../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
}));

jest.mock('../../../../Views/confirmations/hooks/useNetworkName', () => ({
  useNetworkName: () => 'Ethereum Mainnet',
}));

jest.mock('../../../../UI/Earn/selectors/featureFlags', () => ({
  selectMusdQuickConvertEnabledFlag: jest.fn(() => false),
}));

const mockInitiateCustomConversion = jest.fn();
jest.mock('../../../../UI/Earn/hooks/useMusdConversion', () => ({
  useMusdConversion: () => ({
    initiateCustomConversion: mockInitiateCustomConversion,
    hasSeenConversionEducationScreen: true,
  }),
}));

const mockUseMusdConversionFlowData = {
  isEmptyWallet: false,
  hasConvertibleTokens: true,
  isMusdBuyableOnAnyChain: true,
  getPaymentTokenForSelectedNetwork: () => ({
    address: '0xabc' as `0x${string}`,
    chainId: '0x1' as `0x${string}`,
  }),
};
jest.mock('../../../../UI/Earn/hooks/useMusdConversionFlowData', () => ({
  useMusdConversionFlowData: () => mockUseMusdConversionFlowData,
}));

const mockClaimRewards = jest.fn();

jest.mock(
  '../../../../UI/Earn/components/MerklRewards/hooks/useMerklBonusClaim',
  () => ({
    useMerklBonusClaim: jest.fn(),
  }),
);

const mockUseMerklBonusClaim = jest.mocked(useMerklBonusClaim);

describe('CashGetMusdEmptyState', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseMusdConversionFlowData.isEmptyWallet = false;
    mockUseMusdConversionFlowData.hasConvertibleTokens = true;
    mockUseMusdConversionFlowData.isMusdBuyableOnAnyChain = true;
    mockUseMerklBonusClaim.mockReturnValue({
      claimableReward: null,
      lifetimeBonusClaimed: null,
      hasPendingClaim: false,
      isClaiming: false,
      error: null,
      claimRewards: mockClaimRewards,
      refetch: jest.fn(),
    });
  });

  it('renders container and Get mUSD button', () => {
    renderWithProvider(<CashGetMusdEmptyState />);

    expect(
      screen.getByTestId(CashGetMusdEmptyStateSelectors.CONTAINER),
    ).toBeOnTheScreen();
    expect(screen.getByText('Get mUSD')).toBeOnTheScreen();
    expect(screen.getByText('MetaMask USD')).toBeOnTheScreen();
    expect(screen.getByText('3% bonus')).toBeOnTheScreen();
  });

  it('navigates to Token Details (Asset) when token row is pressed', () => {
    renderWithProvider(<CashGetMusdEmptyState />);

    fireEvent.press(screen.getByTestId(CashGetMusdEmptyStateSelectors.ROW));

    const mockNavigate = jest.mocked(NavigationService.navigation.navigate);
    expect(mockNavigate).toHaveBeenCalledWith(
      'Asset',
      expect.objectContaining({
        symbol: 'mUSD',
        name: 'MetaMask USD',
        address: expect.any(String),
        chainId: '0x1',
        source: 'mobile-token-list-page',
      }),
    );
  });

  it('calls initiateCustomConversion when Get mUSD pressed and has convertible tokens', async () => {
    renderWithProvider(<CashGetMusdEmptyState />);

    fireEvent.press(screen.getByTestId(CashGetMusdEmptyStateSelectors.BUTTON));

    expect(mockInitiateCustomConversion).toHaveBeenCalled();
    expect(mockGoToBuy).not.toHaveBeenCalled();
  });

  it('calls goToBuy when Get mUSD pressed and mUSD buyable (no convertible tokens)', () => {
    mockUseMusdConversionFlowData.hasConvertibleTokens = false;

    renderWithProvider(<CashGetMusdEmptyState />);

    fireEvent.press(screen.getByTestId(CashGetMusdEmptyStateSelectors.BUTTON));

    expect(mockGoToBuy).toHaveBeenCalledWith(
      expect.objectContaining({
        assetId: expect.stringContaining('eip155:1/erc20:'),
      }),
    );
    expect(mockInitiateCustomConversion).not.toHaveBeenCalled();
  });

  it('tracks MUSD_CONVERSION_CTA_CLICKED with home_section when Get mUSD is pressed on homepage', () => {
    renderWithProvider(<CashGetMusdEmptyState />);

    fireEvent.press(screen.getByTestId(CashGetMusdEmptyStateSelectors.BUTTON));

    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.MUSD_CONVERSION_CTA_CLICKED,
    );
    expect(mockAddProperties).toHaveBeenCalledWith(
      expect.objectContaining({
        location: MUSD_EVENTS_CONSTANTS.EVENT_LOCATIONS.HOME_CASH_SECTION,
        cta_type: MUSD_EVENTS_CONSTANTS.MUSD_CTA_TYPES.PRIMARY,
        cta_click_target: 'cta_button',
        cta_text: 'Get mUSD',
      }),
    );
    expect(mockTrackEvent).toHaveBeenCalled();
  });

  it('tracks MUSD_CONVERSION_CTA_CLICKED with mobile-token-list-page when Get mUSD is pressed on full view', () => {
    renderWithProvider(<CashGetMusdEmptyState isFullView />);

    fireEvent.press(screen.getByTestId(CashGetMusdEmptyStateSelectors.BUTTON));

    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.MUSD_CONVERSION_CTA_CLICKED,
    );
    expect(mockAddProperties).toHaveBeenCalledWith(
      expect.objectContaining({
        location: MUSD_EVENTS_CONSTANTS.EVENT_LOCATIONS.MOBILE_TOKEN_LIST_PAGE,
        cta_type: MUSD_EVENTS_CONSTANTS.MUSD_CTA_TYPES.PRIMARY,
        cta_click_target: 'cta_button',
        cta_text: 'Get mUSD',
      }),
    );
    expect(mockTrackEvent).toHaveBeenCalled();
  });

  it('hides Get mUSD button when no convertible tokens and mUSD is not buyable', () => {
    mockUseMusdConversionFlowData.hasConvertibleTokens = false;
    mockUseMusdConversionFlowData.isMusdBuyableOnAnyChain = false;

    renderWithProvider(<CashGetMusdEmptyState />);

    expect(
      screen.queryByTestId(CashGetMusdEmptyStateSelectors.BUTTON),
    ).toBeNull();
    // Token row still renders
    expect(
      screen.getByTestId(CashGetMusdEmptyStateSelectors.ROW),
    ).toBeOnTheScreen();
  });

  it('registers Merkl claim hook with home_section on homepage', () => {
    renderWithProvider(<CashGetMusdEmptyState />);

    expect(mockUseMerklBonusClaim).toHaveBeenCalledWith(
      expect.objectContaining({
        chainId: CHAIN_IDS.LINEA_MAINNET,
      }),
      MUSD_EVENTS_CONSTANTS.EVENT_LOCATIONS.HOME_CASH_SECTION,
    );
  });

  it('registers Merkl claim hook with mobile-token-list-page in full view', () => {
    renderWithProvider(<CashGetMusdEmptyState isFullView />);

    expect(mockUseMerklBonusClaim).toHaveBeenCalledWith(
      expect.objectContaining({
        chainId: CHAIN_IDS.LINEA_MAINNET,
      }),
      MUSD_EVENTS_CONSTANTS.EVENT_LOCATIONS.MOBILE_TOKEN_LIST_PAGE,
    );
  });

  it('shows Claim bonus secondary button when claimable reward exists', () => {
    mockUseMerklBonusClaim.mockReturnValue({
      claimableReward: '12.34',
      lifetimeBonusClaimed: null,
      hasPendingClaim: false,
      isClaiming: false,
      error: null,
      claimRewards: mockClaimRewards,
      refetch: jest.fn(),
    });

    renderWithProvider(<CashGetMusdEmptyState />);

    const claimBtn = screen.getByTestId(
      CashGetMusdEmptyStateSelectors.CLAIM_BONUS_BUTTON,
    );
    expect(claimBtn).toBeOnTheScreen();
    expect(claimBtn).toHaveTextContent(/Claim/);
    // claimableReward 12.34 USD → user fiat via formatWithThreshold (locale-dependent separators)
    expect(claimBtn).toHaveTextContent(/12[,.]34/);
  });

  it('hides Claim bonus button when no claimable reward', () => {
    mockUseMerklBonusClaim.mockReturnValue({
      claimableReward: null,
      lifetimeBonusClaimed: null,
      hasPendingClaim: false,
      isClaiming: false,
      error: null,
      claimRewards: mockClaimRewards,
      refetch: jest.fn(),
    });

    renderWithProvider(<CashGetMusdEmptyState />);

    expect(
      screen.queryByTestId(CashGetMusdEmptyStateSelectors.CLAIM_BONUS_BUTTON),
    ).toBeNull();
  });

  it('calls claimRewards and tracks analytics when Claim bonus is pressed', () => {
    mockUseMerklBonusClaim.mockReturnValue({
      claimableReward: '1.00',
      lifetimeBonusClaimed: null,
      hasPendingClaim: false,
      isClaiming: false,
      error: null,
      claimRewards: mockClaimRewards,
      refetch: jest.fn(),
    });

    renderWithProvider(<CashGetMusdEmptyState />);

    fireEvent.press(
      screen.getByTestId(CashGetMusdEmptyStateSelectors.CLAIM_BONUS_BUTTON),
    );

    expect(mockClaimRewards).toHaveBeenCalled();
    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.MUSD_CLAIM_BONUS_BUTTON_CLICKED,
    );
    expect(mockAddProperties).toHaveBeenCalledWith(
      expect.objectContaining({
        location: MUSD_EVENTS_CONSTANTS.EVENT_LOCATIONS.HOME_CASH_SECTION,
        action_type: 'claim_bonus',
        button_text: expect.stringMatching(/Claim.*1\.00/),
      }),
    );
    expect(mockTrackEvent).toHaveBeenCalled();
  });
});
