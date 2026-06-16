// Third party dependencies.
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSelector } from 'react-redux';

// External dependencies.
import { MetaMetricsEvents } from '../../../core/Analytics';
import { WalletActionsBottomSheetSelectorsIDs } from '../../Views/WalletActions/WalletActionsBottomSheet.testIds';

// Internal dependencies.
import { useAnalytics } from '../../hooks/useAnalytics/useAnalytics';
import { createMockUseAnalyticsHook } from '../../../util/test/analyticsMock';
import { useRampNavigation } from '../Ramp/hooks/useRampNavigation';
import FundActionMenu from './FundActionMenu';
import { RampsButtonClickData } from '../Ramp/hooks/useRampsButtonClickData';

// Mock dependencies
jest.mock('@react-navigation/native');
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
  connect: jest.fn(() => (component: React.ComponentType) => component),
}));
jest.mock('../../hooks/useAnalytics/useAnalytics');
jest.mock('../Ramp/hooks/useRampNavigation');
jest.mock('../../../util/trace');
jest.mock('../../../util/networks', () => ({
  getDecimalChainId: jest.fn(),
}));
jest.mock('../Ramp/Aggregator/routes/utils', () => ({
  createBuyNavigationDetails: jest.fn(),
  createSellNavigationDetails: jest.fn(),
}));
jest.mock('../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => key),
}));

const mockButtonClickData: RampsButtonClickData = {
  is_authenticated: false,
  preferred_provider: undefined,
  order_count: 0,
};

jest.mock('../Ramp/hooks/useRampsButtonClickData', () => ({
  useRampsButtonClickData: jest.fn(() => mockButtonClickData),
}));

// Type the mocked functions
const mockUseNavigation = useNavigation as jest.MockedFunction<
  typeof useNavigation
>;
const mockUseRoute = useRoute as jest.MockedFunction<typeof useRoute>;
const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockUseAnalytics = jest.mocked(useAnalytics);
const mockUseRampNavigation = useRampNavigation as jest.MockedFunction<
  typeof useRampNavigation
>;
const { getDecimalChainId } = jest.requireMock('../../../util/networks');
const { createBuyNavigationDetails, createSellNavigationDetails } =
  jest.requireMock('../Ramp/Aggregator/routes/utils');

describe('FundActionMenu', () => {
  // Mock functions
  const mockNavigate = jest.fn();
  const mockGoToBuy = jest.fn();
  const mockGoToAggregator = jest.fn();
  const mockGoToSell = jest.fn();
  const mockTrackEvent = jest.fn();
  const mockCreateEventBuilder = jest.fn();
  const mockBuild = jest.fn();
  const mockAddProperties = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mocks
    mockUseNavigation.mockReturnValue({
      navigate: mockNavigate,
      goBack: jest.fn(),
    } as never);

    mockUseRoute.mockReturnValue({
      params: {},
    } as never);

    mockUseSelector.mockImplementation((selector) => {
      const selectorString = selector.toString();
      if (selectorString.includes('selectEvmChainId')) return '0x1';
      if (selectorString.includes('selectCanSignTransactions')) return true;
      return undefined;
    });

    mockAddProperties.mockReturnValue({
      addProperties: mockAddProperties,
      build: mockBuild,
    });

    mockCreateEventBuilder.mockReturnValue({
      addProperties: mockAddProperties,
      build: mockBuild,
    });

    mockUseAnalytics.mockReturnValue(
      createMockUseAnalyticsHook({
        trackEvent: mockTrackEvent,
        createEventBuilder: mockCreateEventBuilder,
      }),
    );

    mockUseRampNavigation.mockReturnValue({
      goToBuy: mockGoToBuy,
      goToAggregator: mockGoToAggregator,
      goToSell: mockGoToSell,
    });
    getDecimalChainId.mockReturnValue(1);
    createBuyNavigationDetails.mockReturnValue(['BuyScreen', {}] as never);
    createSellNavigationDetails.mockReturnValue(['SellScreen', {}] as never);
  });

  describe('Component Rendering', () => {
    it('renders correctly with default props', () => {
      const { getByTestId } = render(<FundActionMenu />);
      expect(getByTestId('fund-action-menu-bottom-sheet')).toBeOnTheScreen();
    });

    it('renders the unified buy button unconditionally', () => {
      const { getByTestId } = render(<FundActionMenu />);

      const buyButton = getByTestId(
        WalletActionsBottomSheetSelectorsIDs.BUY_UNIFIED_BUTTON,
      );
      expect(buyButton).toBeOnTheScreen();
      expect(buyButton).toHaveTextContent(/fund_actionmenu\.buy_unified/);
      expect(buyButton).toHaveTextContent(
        /fund_actionmenu\.buy_unified_description/,
      );
    });

    it('does not render the legacy buy or deposit buttons', () => {
      const { queryByTestId } = render(<FundActionMenu />);

      expect(
        queryByTestId(WalletActionsBottomSheetSelectorsIDs.BUY_BUTTON),
      ).toBeNull();
      expect(
        queryByTestId(WalletActionsBottomSheetSelectorsIDs.DEPOSIT_BUTTON),
      ).toBeNull();
    });

    it('renders sell button independently of the selected network', () => {
      const { getByTestId } = render(<FundActionMenu />);

      const sellButton = getByTestId(
        WalletActionsBottomSheetSelectorsIDs.SELL_BUTTON,
      );
      expect(sellButton).toBeOnTheScreen();
      expect(sellButton).toHaveTextContent(/fund_actionmenu\.sell/);
      expect(sellButton).toHaveTextContent(/fund_actionmenu\.sell_description/);
    });

    it('renders sell button when the selected network changes', () => {
      mockUseSelector.mockImplementation((selector) => {
        const selectorString = selector.toString();
        if (selectorString.includes('selectEvmChainId')) return '0x279f';
        if (selectorString.includes('selectCanSignTransactions')) return true;
        return undefined;
      });

      const { getByTestId } = render(<FundActionMenu />);

      expect(
        getByTestId(WalletActionsBottomSheetSelectorsIDs.SELL_BUTTON),
      ).toBeOnTheScreen();
    });

    it('renders sell button as disabled when user cannot sign transactions', () => {
      mockUseSelector.mockImplementation((selector) => {
        const selectorString = selector.toString();
        if (selectorString.includes('selectEvmChainId')) return '0x1';
        if (selectorString.includes('selectCanSignTransactions')) return false;
        return undefined;
      });

      const { getByTestId } = render(<FundActionMenu />);

      const sellButton = getByTestId(
        WalletActionsBottomSheetSelectorsIDs.SELL_BUTTON,
      );
      expect(sellButton).toBeOnTheScreen();
      expect(sellButton).toBeDisabled();
    });
  });

  describe('User Interactions', () => {
    it('calls goToBuy with the asset context when the unified buy button is pressed', async () => {
      mockUseRoute.mockReturnValue({
        params: { asset: { assetId: 'eip155:1/slip44:60' } },
      } as never);

      const { getByTestId } = render(<FundActionMenu />);

      fireEvent.press(
        getByTestId(WalletActionsBottomSheetSelectorsIDs.BUY_UNIFIED_BUTTON),
      );

      await waitFor(() => {
        expect(mockGoToBuy).toHaveBeenCalledWith({
          assetId: 'eip155:1/slip44:60',
        });
      });
    });

    it('does not trigger navigation when sell button is pressed but disabled', () => {
      mockUseSelector.mockImplementation((selector) => {
        const selectorString = selector.toString();
        if (selectorString.includes('selectEvmChainId')) return '0x1';
        if (selectorString.includes('selectCanSignTransactions')) return false;
        return undefined;
      });

      const { getByTestId } = render(<FundActionMenu />);
      const sellButton = getByTestId(
        WalletActionsBottomSheetSelectorsIDs.SELL_BUTTON,
      );

      fireEvent.press(sellButton);

      expect(sellButton).toBeDisabled();
    });
  });

  describe('Navigation Behavior with Route Params', () => {
    it('uses custom onBuy function when provided in route params', async () => {
      const customOnBuy = jest.fn();
      mockUseRoute.mockReturnValue({
        params: { onBuy: customOnBuy },
      } as never);

      const { getByTestId } = render(<FundActionMenu />);

      fireEvent.press(
        getByTestId(WalletActionsBottomSheetSelectorsIDs.BUY_UNIFIED_BUTTON),
      );

      await waitFor(() => {
        expect(customOnBuy).toHaveBeenCalledTimes(1);
      });
      expect(mockGoToBuy).not.toHaveBeenCalled();
    });

    it('uses asset context for navigation when provided without custom onBuy', async () => {
      const assetContext = {
        assetId: 'eip155:137/slip44:60',
      };
      mockUseRoute.mockReturnValue({
        params: { asset: assetContext },
      } as never);

      const { getByTestId } = render(<FundActionMenu />);

      fireEvent.press(
        getByTestId(WalletActionsBottomSheetSelectorsIDs.BUY_UNIFIED_BUTTON),
      );

      await waitFor(() => {
        expect(mockGoToBuy).toHaveBeenCalledWith({
          assetId: 'eip155:137/slip44:60',
        });
      });
    });

    it('uses default navigation when no custom params are provided', async () => {
      mockUseRoute.mockReturnValue({
        params: {},
      } as never);

      const { getByTestId } = render(<FundActionMenu />);

      fireEvent.press(
        getByTestId(WalletActionsBottomSheetSelectorsIDs.BUY_UNIFIED_BUTTON),
      );

      await waitFor(() => {
        expect(mockGoToBuy).toHaveBeenCalledWith({
          assetId: undefined,
        });
      });
    });

    it('shows unified buy button with custom onBuy independently of the selected network', () => {
      const customOnBuy = jest.fn();
      mockUseRoute.mockReturnValue({
        params: { onBuy: customOnBuy },
      } as never);

      const { getByTestId } = render(<FundActionMenu />);

      expect(
        getByTestId(WalletActionsBottomSheetSelectorsIDs.BUY_UNIFIED_BUTTON),
      ).toBeOnTheScreen();
    });
  });

  describe('Analytics Tracking', () => {
    it('tracks buy analytics when unified buy button is pressed (without custom onBuy)', async () => {
      const { getByTestId } = render(<FundActionMenu />);

      fireEvent.press(
        getByTestId(WalletActionsBottomSheetSelectorsIDs.BUY_UNIFIED_BUTTON),
      );

      await waitFor(() => {
        expect(mockCreateEventBuilder).toHaveBeenCalledWith(
          MetaMetricsEvents.RAMPS_BUTTON_CLICKED,
        );
        expect(mockAddProperties).toHaveBeenCalledWith({
          button_text: 'Buy',
          location: 'FundActionMenu',
          chain_id_destination: 1,
          ramp_type: 'UNIFIED_BUY_2',
          region: undefined,
          is_authenticated: false,
          preferred_provider: undefined,
          order_count: 0,
        });
        expect(mockTrackEvent).toHaveBeenCalledWith(mockBuild());
      });
    });

    it('does not track buy analytics when custom onBuy function is used', async () => {
      const customOnBuy = jest.fn();
      mockUseRoute.mockReturnValue({
        params: { onBuy: customOnBuy },
      } as never);

      const { getByTestId } = render(<FundActionMenu />);

      fireEvent.press(
        getByTestId(WalletActionsBottomSheetSelectorsIDs.BUY_UNIFIED_BUTTON),
      );

      await waitFor(() => {
        expect(customOnBuy).toHaveBeenCalledTimes(1);
      });
      expect(mockTrackEvent).not.toHaveBeenCalled();
    });

    it('tracks buy analytics with asset context chainId when provided', async () => {
      const assetContext = {
        address: '0x123',
        chainId: '0x89',
      };
      mockUseRoute.mockReturnValue({
        params: { asset: assetContext },
      } as never);

      const { getByTestId } = render(<FundActionMenu />);

      fireEvent.press(
        getByTestId(WalletActionsBottomSheetSelectorsIDs.BUY_UNIFIED_BUTTON),
      );

      await waitFor(() => {
        expect(mockAddProperties).toHaveBeenCalledWith({
          button_text: 'Buy',
          location: 'FundActionMenu',
          chain_id_destination: 137,
          ramp_type: 'UNIFIED_BUY_2',
          region: undefined,
          is_authenticated: false,
          preferred_provider: undefined,
          order_count: 0,
        });
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('handles empty route params gracefully', () => {
      mockUseRoute.mockReturnValue({
        params: undefined,
      } as never);

      expect(() => render(<FundActionMenu />)).not.toThrow();
    });

    it('handles missing asset context gracefully', async () => {
      mockUseRoute.mockReturnValue({
        params: { asset: undefined },
      } as never);

      const { getByTestId } = render(<FundActionMenu />);

      fireEvent.press(
        getByTestId(WalletActionsBottomSheetSelectorsIDs.BUY_UNIFIED_BUTTON),
      );

      await waitFor(() => {
        expect(mockGoToBuy).toHaveBeenCalledWith({
          assetId: undefined,
        });
      });
    });

    it('handles undefined assetId in asset context', async () => {
      const assetContext = {
        assetId: undefined,
      };
      mockUseRoute.mockReturnValue({
        params: { asset: assetContext },
      } as never);

      const { getByTestId } = render(<FundActionMenu />);

      fireEvent.press(
        getByTestId(WalletActionsBottomSheetSelectorsIDs.BUY_UNIFIED_BUTTON),
      );

      await waitFor(() => {
        expect(mockGoToBuy).toHaveBeenCalledWith({
          assetId: undefined,
        });
      });
    });
  });

  describe('Component Integration', () => {
    it('properly integrates with BottomSheet ref methods', () => {
      const { getByTestId } = render(<FundActionMenu />);

      expect(getByTestId('fund-action-menu-bottom-sheet')).toBeOnTheScreen();
    });

    it('displays correct strings from i18n', () => {
      const { getByTestId } = render(<FundActionMenu />);

      const buyButton = getByTestId(
        WalletActionsBottomSheetSelectorsIDs.BUY_UNIFIED_BUTTON,
      );
      const sellButton = getByTestId(
        WalletActionsBottomSheetSelectorsIDs.SELL_BUTTON,
      );

      expect(buyButton).toHaveTextContent(/fund_actionmenu\.buy_unified/);
      expect(sellButton).toHaveTextContent(/fund_actionmenu\.sell/);
    });
  });
});
