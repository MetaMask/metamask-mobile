import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import CashGetMusdEmptyState from './CashGetMusdEmptyState';
import { CashGetMusdEmptyStateSelectors } from './CashGetMusdEmptyState.testIds';
import NavigationService from '../../../../../core/NavigationService';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { MUSD_EVENTS_CONSTANTS } from '../../../../UI/Earn/constants/events';

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

describe('CashGetMusdEmptyState', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseMusdConversionFlowData.isEmptyWallet = false;
    mockUseMusdConversionFlowData.hasConvertibleTokens = true;
    mockUseMusdConversionFlowData.isMusdBuyableOnAnyChain = true;
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

  it('tracks MUSD_CONVERSION_CTA_CLICKED with home_cash_section when Get mUSD is pressed', () => {
    renderWithProvider(<CashGetMusdEmptyState />);

    fireEvent.press(screen.getByTestId(CashGetMusdEmptyStateSelectors.BUTTON));

    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.MUSD_CONVERSION_CTA_CLICKED,
    );
    expect(mockAddProperties).toHaveBeenCalledWith(
      expect.objectContaining({
        location: MUSD_EVENTS_CONSTANTS.EVENT_LOCATIONS.HOME_CASH_SECTION,
        cta_type: MUSD_EVENTS_CONSTANTS.MUSD_CTA_TYPES.PRIMARY,
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
});
