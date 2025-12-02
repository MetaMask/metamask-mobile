// Third party dependencies.
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSelector } from 'react-redux';

// External dependencies.
import { MetaMetricsEvents } from '../../../core/Analytics';
import { WalletActionsBottomSheetSelectorsIDs } from '../../../../e2e/selectors/wallet/WalletActionsBottomSheet.selectors';
import { RampType } from '../../../reducers/fiatOrders/types';

// Internal dependencies.
import { useMetrics } from '../../hooks/useMetrics';
import useRampNetwork from '../Ramp/Aggregator/hooks/useRampNetwork';
import useDepositEnabled from '../Ramp/Deposit/hooks/useDepositEnabled';
import useRampsUnifiedV1Enabled from '../Ramp/hooks/useRampsUnifiedV1Enabled';
import { useRampNavigation } from '../Ramp/hooks/useRampNavigation';
import { trace, TraceName } from '../../../util/trace';
import FundActionMenu from './FundActionMenu';
import { RampsButtonClickData } from '../Ramp/hooks/useRampsButtonClickData';

// Mock BottomSheet component
jest.mock(
  '../../../component-library/components/BottomSheets/BottomSheet',
  () => {
    const { View } = jest.requireActual('react-native');
    const { forwardRef, useImperativeHandle } = jest.requireActual('react');

    const MockBottomSheet = forwardRef(
      (props: { children: React.ReactNode }, ref: React.Ref<unknown>) => {
        useImperativeHandle(ref, () => ({
          onOpenBottomSheet: jest.fn(),
          onCloseBottomSheet: jest.fn((callback?: () => void) => {
            if (callback) callback();
          }),
        }));

        return (
          <View testID="bottom-sheet" {...props}>
            {props.children}
          </View>
        );
      },
    );

    return {
      __esModule: true,
      default: MockBottomSheet,
    };
  },
);

// Mock dependencies
jest.mock('@react-navigation/native');
jest.mock('@react-navigation/compat', () => ({
  withNavigation: jest.fn((component) => component),
}));
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
  connect: jest.fn(() => (component: React.ComponentType) => component),
}));
jest.mock('../../hooks/useMetrics');
jest.mock('../Ramp/Aggregator/hooks/useRampNetwork');
jest.mock('../Ramp/Deposit/hooks/useDepositEnabled');
jest.mock('../Ramp/hooks/useRampsUnifiedV1Enabled');
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
  ramp_routing: undefined,
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
const mockUseMetrics = useMetrics as jest.MockedFunction<typeof useMetrics>;
const mockUseRampNetwork = useRampNetwork as jest.MockedFunction<
  typeof useRampNetwork
>;
const mockUseDepositEnabled = useDepositEnabled as jest.MockedFunction<
  typeof useDepositEnabled
>;
const mockUseRampsUnifiedV1Enabled =
  useRampsUnifiedV1Enabled as jest.MockedFunction<
    typeof useRampsUnifiedV1Enabled
  >;
const mockUseRampNavigation = useRampNavigation as jest.MockedFunction<
  typeof useRampNavigation
>;
const mockTrace = trace as jest.MockedFunction<typeof trace>;
const { getDecimalChainId } = jest.requireMock('../../../util/networks');
const { createBuyNavigationDetails, createSellNavigationDetails } =
  jest.requireMock('../Ramp/Aggregator/routes/utils');

describe('FundActionMenu', () => {
  // Mock functions
  const mockNavigate = jest.fn();
  const mockGoToBuy = jest.fn();
  const mockGoToAggregator = jest.fn();
  const mockGoToSell = jest.fn();
  const mockGoToDeposit = jest.fn();
  const mockTrackEvent = jest.fn();
  const mockCreateEventBuilder = jest.fn();
  const mockBuild = jest.fn();
  const mockAddProperties = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mocks
    mockUseNavigation.mockReturnValue({
      navigate: mockNavigate,
    } as never);

    mockUseRoute.mockReturnValue({
      params: {},
    } as never);

    mockUseSelector.mockImplementation((selector) => {
      const selectorString = selector.toString();
      if (selectorString.includes('selectChainId')) return '0x1';
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

    mockUseMetrics.mockReturnValue({
      trackEvent: mockTrackEvent,
      createEventBuilder: mockCreateEventBuilder,
    } as never);

    mockUseRampNetwork.mockReturnValue([true, true]);
    mockUseDepositEnabled.mockReturnValue({ isDepositEnabled: true });
    mockUseRampsUnifiedV1Enabled.mockReturnValue(false);
    mockUseRampNavigation.mockReturnValue({
      goToBuy: mockGoToBuy,
      goToAggregator: mockGoToAggregator,
      goToSell: mockGoToSell,
      goToDeposit: mockGoToDeposit,
    });
    getDecimalChainId.mockReturnValue(1);
    createBuyNavigationDetails.mockReturnValue(['BuyScreen', {}] as never);
    createSellNavigationDetails.mockReturnValue(['SellScreen', {}] as never);
  });

  describe('Component Rendering', () => {
    it('renders correctly with default props', () => {
      const { getByTestId } = render(<FundActionMenu />);
      expect(getByTestId('bottom-sheet')).toBeOnTheScreen();
    });

    it('renders deposit button when deposit is enabled', () => {
      const { getByTestId } = render(<FundActionMenu />);

      expect(
        getByTestId(WalletActionsBottomSheetSelectorsIDs.DEPOSIT_BUTTON),
      ).toBeOnTheScreen();

      const depositButton = getByTestId(
        WalletActionsBottomSheetSelectorsIDs.DEPOSIT_BUTTON,
      );
      expect(depositButton).toHaveTextContent(/fund_actionmenu\.deposit/);
      expect(depositButton).toHaveTextContent(
        /fund_actionmenu\.deposit_description/,
      );
    });

    it('does not render deposit button when deposit is disabled', () => {
      mockUseDepositEnabled.mockReturnValue({ isDepositEnabled: false });

      const { queryByTestId } = render(<FundActionMenu />);

      expect(
        queryByTestId(WalletActionsBottomSheetSelectorsIDs.DEPOSIT_BUTTON),
      ).toBeNull();
    });

    it('renders buy button when ramp network is supported', () => {
      const { getByTestId } = render(<FundActionMenu />);

      expect(
        getByTestId(WalletActionsBottomSheetSelectorsIDs.BUY_BUTTON),
      ).toBeOnTheScreen();

      const buyButton = getByTestId(
        WalletActionsBottomSheetSelectorsIDs.BUY_BUTTON,
      );
      expect(buyButton).toHaveTextContent(/fund_actionmenu\.buy/);
      expect(buyButton).toHaveTextContent(/fund_actionmenu\.buy_description/);
    });

    it('renders sell button when ramp network is supported', () => {
      const { getByTestId } = render(<FundActionMenu />);

      expect(
        getByTestId(WalletActionsBottomSheetSelectorsIDs.SELL_BUTTON),
      ).toBeOnTheScreen();

      const sellButton = getByTestId(
        WalletActionsBottomSheetSelectorsIDs.SELL_BUTTON,
      );
      expect(sellButton).toHaveTextContent(/fund_actionmenu\.sell/);
      expect(sellButton).toHaveTextContent(/fund_actionmenu\.sell_description/);
    });

    it('does not render sell button when ramp network is not supported', () => {
      mockUseRampNetwork.mockReturnValue([false, false]);

      const { queryByTestId } = render(<FundActionMenu />);

      expect(
        queryByTestId(WalletActionsBottomSheetSelectorsIDs.SELL_BUTTON),
      ).toBeNull();
    });

    it('renders sell button as disabled when user cannot sign transactions', () => {
      mockUseSelector.mockImplementation((selector) => {
        const selectorString = selector.toString();
        if (selectorString.includes('selectChainId')) return '0x1';
        if (selectorString.includes('selectCanSignTransactions')) return false;
        return undefined;
      });

      const { getByTestId } = render(<FundActionMenu />);

      const sellButton = getByTestId(
        WalletActionsBottomSheetSelectorsIDs.SELL_BUTTON,
      );
      expect(sellButton).toBeOnTheScreen();
      expect(sellButton.props.accessibilityState.disabled).toBe(true);
    });

    it('renders all buttons when all features are enabled', () => {
      const { getByTestId, queryByTestId } = render(<FundActionMenu />);

      expect(
        getByTestId(WalletActionsBottomSheetSelectorsIDs.DEPOSIT_BUTTON),
      ).toBeOnTheScreen();
      expect(
        getByTestId(WalletActionsBottomSheetSelectorsIDs.BUY_BUTTON),
      ).toBeOnTheScreen();
      expect(
        getByTestId(WalletActionsBottomSheetSelectorsIDs.SELL_BUTTON),
      ).toBeOnTheScreen();
      // Unified buy button not shown when hook returns false
      expect(
        queryByTestId(WalletActionsBottomSheetSelectorsIDs.BUY_UNIFIED_BUTTON),
      ).toBeNull();
    });

    it('renders unified buy button when useRampsUnifiedV1Enabled returns true', () => {
      mockUseRampsUnifiedV1Enabled.mockReturnValue(true);

      const { getByTestId } = render(<FundActionMenu />);

      expect(
        getByTestId(WalletActionsBottomSheetSelectorsIDs.BUY_UNIFIED_BUTTON),
      ).toBeOnTheScreen();
    });
  });

  describe('User Interactions', () => {
    it('calls deposit action when deposit button is pressed', async () => {
      const { getByTestId } = render(<FundActionMenu />);

      fireEvent.press(
        getByTestId(WalletActionsBottomSheetSelectorsIDs.DEPOSIT_BUTTON),
      );

      await waitFor(() => {
        expect(mockGoToDeposit).toHaveBeenCalled();
      });
    });

    it('calls aggregator action when buy button is pressed', async () => {
      mockUseRoute.mockReturnValue({
        params: { asset: { assetId: 'eip155:1/slip44:60' } },
      } as never);

      const { getByTestId } = render(<FundActionMenu />);

      fireEvent.press(
        getByTestId(WalletActionsBottomSheetSelectorsIDs.BUY_BUTTON),
      );

      await waitFor(() => {
        expect(mockGoToAggregator).toHaveBeenCalledWith({
          assetId: 'eip155:1/slip44:60',
        });
      });
    });

    it('does not trigger navigation when sell button is pressed but disabled', () => {
      mockUseSelector.mockImplementation((selector) => {
        const selectorString = selector.toString();
        if (selectorString.includes('selectChainId')) return '0x1';
        if (selectorString.includes('selectCanSignTransactions')) return false;
        return undefined;
      });

      const { getByTestId } = render(<FundActionMenu />);
      const sellButton = getByTestId(
        WalletActionsBottomSheetSelectorsIDs.SELL_BUTTON,
      );

      fireEvent.press(sellButton);

      expect(sellButton.props.accessibilityState.disabled).toBe(true);
    });

    it('calls buy action when unified buy button is pressed and useRampsUnifiedV1Enabled is true', async () => {
      mockUseRampsUnifiedV1Enabled.mockReturnValue(true);
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
  });

  describe('Navigation Behavior with Route Params', () => {
    it('uses custom onBuy function when provided in route params', async () => {
      const customOnBuy = jest.fn();
      mockUseRoute.mockReturnValue({
        params: { onBuy: customOnBuy },
      } as never);

      const { getByTestId } = render(<FundActionMenu />);

      fireEvent.press(
        getByTestId(WalletActionsBottomSheetSelectorsIDs.BUY_BUTTON),
      );

      await waitFor(() => {
        expect(customOnBuy).toHaveBeenCalledTimes(1);
      });
      expect(mockNavigate).not.toHaveBeenCalled();
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
        getByTestId(WalletActionsBottomSheetSelectorsIDs.BUY_BUTTON),
      );

      await waitFor(() => {
        expect(mockGoToAggregator).toHaveBeenCalledWith({
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
        getByTestId(WalletActionsBottomSheetSelectorsIDs.BUY_BUTTON),
      );

      await waitFor(() => {
        expect(mockGoToAggregator).toHaveBeenCalledWith({
          assetId: undefined,
        });
      });
    });

    it('prioritizes custom onBuy over asset context when both are provided', async () => {
      const customOnBuy = jest.fn();
      const assetContext = { address: '0x123', chainId: '0x89' };
      mockUseRoute.mockReturnValue({
        params: { onBuy: customOnBuy, asset: assetContext },
      } as never);

      const { getByTestId } = render(<FundActionMenu />);

      fireEvent.press(
        getByTestId(WalletActionsBottomSheetSelectorsIDs.BUY_BUTTON),
      );

      await waitFor(() => {
        expect(customOnBuy).toHaveBeenCalledTimes(1);
      });
      expect(createBuyNavigationDetails).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('shows buy button with custom onBuy even when ramp network is not supported', () => {
      const customOnBuy = jest.fn();
      mockUseRoute.mockReturnValue({
        params: { onBuy: customOnBuy },
      } as never);
      mockUseRampNetwork.mockReturnValue([false, false]);

      const { getByTestId } = render(<FundActionMenu />);

      expect(
        getByTestId(WalletActionsBottomSheetSelectorsIDs.BUY_BUTTON),
      ).toBeOnTheScreen();
    });
  });

  describe('Analytics Tracking', () => {
    it('tracks deposit analytics when deposit button is pressed', () => {
      const { getByTestId } = render(<FundActionMenu />);

      fireEvent.press(
        getByTestId(WalletActionsBottomSheetSelectorsIDs.DEPOSIT_BUTTON),
      );

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.RAMPS_BUTTON_CLICKED,
      );
      expect(mockAddProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          text: 'Deposit',
          location: 'FundActionMenu',
          chain_id_destination: 1,
          ramp_type: 'DEPOSIT',
          ramp_routing: undefined,
          is_authenticated: false,
          preferred_provider: undefined,
          order_count: 0,
          region: undefined,
        }),
      );
      expect(mockTrackEvent).toHaveBeenCalledWith(mockBuild());
    });

    it('tracks buy analytics when buy button is pressed (without custom onBuy)', async () => {
      const { getByTestId } = render(<FundActionMenu />);

      fireEvent.press(
        getByTestId(WalletActionsBottomSheetSelectorsIDs.BUY_BUTTON),
      );

      await waitFor(() => {
        expect(mockCreateEventBuilder).toHaveBeenCalledWith(
          MetaMetricsEvents.BUY_BUTTON_CLICKED,
        );
        expect(mockAddProperties).toHaveBeenCalledWith({
          text: 'Buy',
          location: 'FundActionMenu',
          chain_id_destination: 1,
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
        getByTestId(WalletActionsBottomSheetSelectorsIDs.BUY_BUTTON),
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
        getByTestId(WalletActionsBottomSheetSelectorsIDs.BUY_BUTTON),
      );

      await waitFor(() => {
        expect(mockAddProperties).toHaveBeenCalledWith({
          text: 'Buy',
          location: 'FundActionMenu',
          chain_id_destination: 137,
        });
      });
    });
  });

  describe('Tracing and Performance', () => {
    it('traces deposit experience when deposit button is pressed', async () => {
      const { getByTestId } = render(<FundActionMenu />);

      fireEvent.press(
        getByTestId(WalletActionsBottomSheetSelectorsIDs.DEPOSIT_BUTTON),
      );

      await waitFor(() => {
        expect(mockTrace).toHaveBeenCalledWith({
          name: TraceName.LoadDepositExperience,
        });
      });
    });

    it('traces buy ramp experience when buy button is pressed', async () => {
      const { getByTestId } = render(<FundActionMenu />);

      fireEvent.press(
        getByTestId(WalletActionsBottomSheetSelectorsIDs.BUY_BUTTON),
      );

      await waitFor(() => {
        expect(mockTrace).toHaveBeenCalledWith({
          name: TraceName.LoadRampExperience,
          tags: {
            rampType: RampType.BUY,
          },
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
        getByTestId(WalletActionsBottomSheetSelectorsIDs.BUY_BUTTON),
      );

      await waitFor(() => {
        expect(mockGoToAggregator).toHaveBeenCalledWith({
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
        getByTestId(WalletActionsBottomSheetSelectorsIDs.BUY_BUTTON),
      );

      await waitFor(() => {
        expect(mockGoToAggregator).toHaveBeenCalledWith({
          assetId: undefined,
        });
      });
    });

    it('handles different chain IDs correctly', () => {
      mockUseSelector.mockImplementation((selector) => {
        const selectorString = selector.toString();
        if (selectorString.includes('selectChainId')) return '0x89';
        if (selectorString.includes('selectCanSignTransactions')) return true;
        return undefined;
      });
      getDecimalChainId.mockReturnValue(137);

      const { getByTestId } = render(<FundActionMenu />);

      fireEvent.press(
        getByTestId(WalletActionsBottomSheetSelectorsIDs.DEPOSIT_BUTTON),
      );

      expect(mockAddProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          chain_id_destination: 137,
        }),
      );
    });
  });

  describe('Component Integration', () => {
    it('properly integrates with BottomSheet ref methods', () => {
      const { getByTestId } = render(<FundActionMenu />);

      expect(getByTestId('bottom-sheet')).toBeOnTheScreen();
    });

    it('displays correct strings from i18n', () => {
      const { getByTestId } = render(<FundActionMenu />);

      const depositButton = getByTestId(
        WalletActionsBottomSheetSelectorsIDs.DEPOSIT_BUTTON,
      );
      const buyButton = getByTestId(
        WalletActionsBottomSheetSelectorsIDs.BUY_BUTTON,
      );
      const sellButton = getByTestId(
        WalletActionsBottomSheetSelectorsIDs.SELL_BUTTON,
      );

      expect(depositButton).toHaveTextContent(/fund_actionmenu\.deposit/);
      expect(buyButton).toHaveTextContent(/fund_actionmenu\.buy/);
      expect(sellButton).toHaveTextContent(/fund_actionmenu\.sell/);
    });

    it('properly handles selector updates', () => {
      const { rerender } = render(<FundActionMenu />);

      mockUseSelector.mockImplementation((selector) => {
        const selectorString = selector.toString();
        if (selectorString.includes('selectChainId')) return '0x1';
        if (selectorString.includes('selectCanSignTransactions')) return false;
        return undefined;
      });

      rerender(<FundActionMenu />);

      const { getByTestId } = render(<FundActionMenu />);
      const sellButton = getByTestId(
        WalletActionsBottomSheetSelectorsIDs.SELL_BUTTON,
      );
      expect(sellButton.props.accessibilityState.disabled).toBe(true);
    });
  });
});
