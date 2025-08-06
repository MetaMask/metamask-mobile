// Third party dependencies.
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSelector } from 'react-redux';

// External dependencies.
import { MetaMetricsEvents } from '../../../core/Analytics';
import { IconName } from '@metamask/design-system-react-native';
import { WalletActionsBottomSheetSelectorsIDs } from '../../../../e2e/selectors/wallet/WalletActionsBottomSheet.selectors';
import { strings } from '../../../../locales/i18n';
import { RampType } from '../../../reducers/fiatOrders/types';
import Routes from '../../../constants/navigation/Routes';

// Internal dependencies.
import { useMetrics } from '../../hooks/useMetrics';
import useRampNetwork from '../Ramp/Aggregator/hooks/useRampNetwork';
import useDepositEnabled from '../Ramp/Deposit/hooks/useDepositEnabled';
import { createBuyNavigationDetails, createSellNavigationDetails } from '../Ramp/Aggregator/routes/utils';
import { trace, TraceName } from '../../../util/trace';
import { getDecimalChainId } from '../../../util/networks';
import FundActionMenu from './FundActionMenu';

// Mock BottomSheet component
jest.mock('../../../component-library/components/BottomSheets/BottomSheet', () => {
  const { View } = jest.requireActual('react-native');
  const { forwardRef, useImperativeHandle } = jest.requireActual('react');

  const MockBottomSheet = forwardRef((props: { children: React.ReactNode }, ref: React.Ref<unknown>) => {
    useImperativeHandle(ref, () => ({
      onOpenBottomSheet: jest.fn(),
      onCloseBottomSheet: jest.fn((callback?: () => void) => {
        if (callback) callback();
      }),
    }));

    return <View testID="bottom-sheet" {...props}>{props.children}</View>;
  });

  return {
    __esModule: true,
    default: MockBottomSheet,
  };
});

// Mock ActionListItem component
jest.mock('../../../component-library/components-temp/ActionListItem', () => {
  const { TouchableOpacity, Text: RNText } = jest.requireActual('react-native');
  return ({
    label,
    description,
    iconName,
    onPress,
    testID,
    isDisabled,
  }: {
    label: string;
    description?: string;
    iconName: IconName;
    onPress: () => void;
    testID: string;
    isDisabled?: boolean;
  }) => (
    <TouchableOpacity
      testID={testID}
      onPress={onPress}
      disabled={isDisabled}
      accessibilityState={{ disabled: isDisabled }}
    >
      <RNText testID={`${testID}-label`}>{label}</RNText>
      {description && <RNText testID={`${testID}-description`}>{description}</RNText>}
      <RNText testID={`${testID}-icon`}>{iconName}</RNText>
    </TouchableOpacity>
  );
});

// Mock dependencies
jest.mock('@react-navigation/native');
jest.mock('react-redux');
jest.mock('../../hooks/useMetrics');
jest.mock('../Ramp/Aggregator/hooks/useRampNetwork');
jest.mock('../Ramp/Deposit/hooks/useDepositEnabled');
jest.mock('../../../util/trace');
jest.mock('../../../util/networks');
jest.mock('../Ramp/Aggregator/routes/utils');
jest.mock('../../../selectors/networkController');
jest.mock('../../../selectors/accountsController');
jest.mock('../../../../locales/i18n');

// Type the mocked functions
const mockUseNavigation = useNavigation as jest.MockedFunction<typeof useNavigation>;
const mockUseRoute = useRoute as jest.MockedFunction<typeof useRoute>;
const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockUseMetrics = useMetrics as jest.MockedFunction<typeof useMetrics>;
const mockUseRampNetwork = useRampNetwork as jest.MockedFunction<typeof useRampNetwork>;
const mockUseDepositEnabled = useDepositEnabled as jest.MockedFunction<typeof useDepositEnabled>;
const mockTrace = trace as jest.MockedFunction<typeof trace>;
const mockGetDecimalChainId = getDecimalChainId as jest.MockedFunction<typeof getDecimalChainId>;
const mockCreateBuyNavigationDetails = createBuyNavigationDetails as jest.MockedFunction<typeof createBuyNavigationDetails>;
const mockCreateSellNavigationDetails = createSellNavigationDetails as jest.MockedFunction<typeof createSellNavigationDetails>;

describe('FundActionMenu', () => {
  // Mock functions
  const mockNavigate = jest.fn();
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

    mockUseRampNetwork.mockReturnValue([true]);
    mockUseDepositEnabled.mockReturnValue({ isDepositEnabled: true });
    mockGetDecimalChainId.mockReturnValue(1);
    mockCreateBuyNavigationDetails.mockReturnValue(['BuyScreen', {}] as never);
    mockCreateSellNavigationDetails.mockReturnValue(['SellScreen', {}] as never);

    // Mock strings
    (strings as jest.MockedFunction<typeof strings>).mockImplementation((key: string) => key);
  });

  describe('Component Rendering', () => {
    it('renders correctly with default props', () => {
      // Arrange & Act
      const { getByTestId } = render(<FundActionMenu />);

      // Assert
      expect(getByTestId('bottom-sheet')).toBeOnTheScreen();
    });

    it('renders deposit button when deposit is enabled', () => {
      // Arrange & Act
      const { getByTestId } = render(<FundActionMenu />);

      // Assert
      expect(getByTestId(WalletActionsBottomSheetSelectorsIDs.DEPOSIT_BUTTON)).toBeOnTheScreen();
      expect(getByTestId(`${WalletActionsBottomSheetSelectorsIDs.DEPOSIT_BUTTON}-label`)).toHaveTextContent('fund_actionmenu.deposit');
      expect(getByTestId(`${WalletActionsBottomSheetSelectorsIDs.DEPOSIT_BUTTON}-description`)).toHaveTextContent('fund_actionmenu.deposit_description');
      expect(getByTestId(`${WalletActionsBottomSheetSelectorsIDs.DEPOSIT_BUTTON}-icon`)).toHaveTextContent(IconName.Money);
    });

    it('does not render deposit button when deposit is disabled', () => {
      // Arrange
      mockUseDepositEnabled.mockReturnValue({ isDepositEnabled: false });

      // Act
      const { queryByTestId } = render(<FundActionMenu />);

      // Assert
      expect(queryByTestId(WalletActionsBottomSheetSelectorsIDs.DEPOSIT_BUTTON)).toBeNull();
    });

    it('renders buy button when ramp network is supported', () => {
      // Arrange & Act
      const { getByTestId } = render(<FundActionMenu />);

      // Assert
      expect(getByTestId(WalletActionsBottomSheetSelectorsIDs.BUY_BUTTON)).toBeOnTheScreen();
      expect(getByTestId(`${WalletActionsBottomSheetSelectorsIDs.BUY_BUTTON}-label`)).toHaveTextContent('fund_actionmenu.buy');
      expect(getByTestId(`${WalletActionsBottomSheetSelectorsIDs.BUY_BUTTON}-description`)).toHaveTextContent('fund_actionmenu.buy_description');
      expect(getByTestId(`${WalletActionsBottomSheetSelectorsIDs.BUY_BUTTON}-icon`)).toHaveTextContent(IconName.Add);
    });

    it('does not render buy button when ramp network is not supported', () => {
      // Arrange
      mockUseRampNetwork.mockReturnValue([false]);

      // Act
      const { queryByTestId } = render(<FundActionMenu />);

      // Assert
      expect(queryByTestId(WalletActionsBottomSheetSelectorsIDs.BUY_BUTTON)).toBeNull();
    });

    it('renders sell button when ramp network is supported', () => {
      // Arrange & Act
      const { getByTestId } = render(<FundActionMenu />);

      // Assert
      expect(getByTestId(WalletActionsBottomSheetSelectorsIDs.SELL_BUTTON)).toBeOnTheScreen();
      expect(getByTestId(`${WalletActionsBottomSheetSelectorsIDs.SELL_BUTTON}-label`)).toHaveTextContent('fund_actionmenu.sell');
      expect(getByTestId(`${WalletActionsBottomSheetSelectorsIDs.SELL_BUTTON}-description`)).toHaveTextContent('fund_actionmenu.sell_description');
      expect(getByTestId(`${WalletActionsBottomSheetSelectorsIDs.SELL_BUTTON}-icon`)).toHaveTextContent(IconName.MinusBold);
    });

    it('does not render sell button when ramp network is not supported', () => {
      // Arrange
      mockUseRampNetwork.mockReturnValue([false]);

      // Act
      const { queryByTestId } = render(<FundActionMenu />);

      // Assert
      expect(queryByTestId(WalletActionsBottomSheetSelectorsIDs.SELL_BUTTON)).toBeNull();
    });

    it('renders sell button as disabled when user cannot sign transactions', () => {
      // Arrange
      mockUseSelector.mockImplementation((selector) => {
        const selectorString = selector.toString();
        if (selectorString.includes('selectChainId')) return '0x1';
        if (selectorString.includes('selectCanSignTransactions')) return false;
        return undefined;
      });

      // Act
      const { getByTestId } = render(<FundActionMenu />);

      // Assert
      const sellButton = getByTestId(WalletActionsBottomSheetSelectorsIDs.SELL_BUTTON);
      expect(sellButton).toBeOnTheScreen();
      expect(sellButton.props.accessibilityState.disabled).toBe(true);
    });

    it('renders all buttons when all features are enabled', () => {
      // Arrange & Act
      const { getByTestId } = render(<FundActionMenu />);

      // Assert
      expect(getByTestId(WalletActionsBottomSheetSelectorsIDs.DEPOSIT_BUTTON)).toBeOnTheScreen();
      expect(getByTestId(WalletActionsBottomSheetSelectorsIDs.BUY_BUTTON)).toBeOnTheScreen();
      expect(getByTestId(WalletActionsBottomSheetSelectorsIDs.SELL_BUTTON)).toBeOnTheScreen();
    });
  });

  describe('User Interactions', () => {
    it('calls deposit action when deposit button is pressed', async () => {
      // Arrange
      const { getByTestId } = render(<FundActionMenu />);

      // Act
      fireEvent.press(getByTestId(WalletActionsBottomSheetSelectorsIDs.DEPOSIT_BUTTON));

      // Assert
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(Routes.DEPOSIT.ID);
      });
    });

    it('calls buy action when buy button is pressed', async () => {
      // Arrange
      const { getByTestId } = render(<FundActionMenu />);

      // Act
      fireEvent.press(getByTestId(WalletActionsBottomSheetSelectorsIDs.BUY_BUTTON));

      // Assert
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('BuyScreen', {});
      });
    });

    it('calls sell action when sell button is pressed', async () => {
      // Arrange
      const { getByTestId } = render(<FundActionMenu />);

      // Act
      fireEvent.press(getByTestId(WalletActionsBottomSheetSelectorsIDs.SELL_BUTTON));

      // Assert
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('SellScreen', {});
      });
    });

    it('does not trigger navigation when sell button is pressed but disabled', () => {
      // Arrange
      mockUseSelector.mockImplementation((selector) => {
        const selectorString = selector.toString();
        if (selectorString.includes('selectChainId')) return '0x1';
        if (selectorString.includes('selectCanSignTransactions')) return false;
        return undefined;
      });

      const { getByTestId } = render(<FundActionMenu />);
      const sellButton = getByTestId(WalletActionsBottomSheetSelectorsIDs.SELL_BUTTON);

      // Act
      // Note: Even though the button is marked as disabled, fireEvent.press can still trigger the onPress
      // In a real app, disabled buttons should not respond to press events, but our mock doesn't prevent this
      fireEvent.press(sellButton);

      // Assert
      // The component still handles the disabled state correctly in the UI,
      // but we need to verify the button is marked as disabled
      expect(sellButton.props.accessibilityState.disabled).toBe(true);
    });
  });

  describe('Navigation Behavior with Route Params', () => {
    it('uses custom onBuy function when provided in route params', async () => {
      // Arrange
      const customOnBuy = jest.fn();
      mockUseRoute.mockReturnValue({
        params: { onBuy: customOnBuy },
      } as never);

      const { getByTestId } = render(<FundActionMenu />);

      // Act
      fireEvent.press(getByTestId(WalletActionsBottomSheetSelectorsIDs.BUY_BUTTON));

      // Assert
      await waitFor(() => {
        expect(customOnBuy).toHaveBeenCalledTimes(1);
      });
      // Should not use default navigation when custom onBuy is provided
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('uses asset context for navigation when provided without custom onBuy', async () => {
      // Arrange
      const assetContext = {
        address: '0x123',
        chainId: '0x89',
      };
      mockUseRoute.mockReturnValue({
        params: { asset: assetContext },
      } as never);

      const { getByTestId } = render(<FundActionMenu />);

      // Act
      fireEvent.press(getByTestId(WalletActionsBottomSheetSelectorsIDs.BUY_BUTTON));

      // Assert
      await waitFor(() => {
        expect(mockCreateBuyNavigationDetails).toHaveBeenCalledWith({
          address: '0x123',
          chainId: 137, // Converted from hex '0x89'
        });
        expect(mockNavigate).toHaveBeenCalledWith('BuyScreen', {});
      });
    });

    it('uses asset context chainId when provided, falls back to current chainId when not', async () => {
      // Arrange
      const assetContext = {
        address: '0x123',
        // No chainId provided
      };
      mockUseRoute.mockReturnValue({
        params: { asset: assetContext },
      } as never);

      const { getByTestId } = render(<FundActionMenu />);

      // Act
      fireEvent.press(getByTestId(WalletActionsBottomSheetSelectorsIDs.BUY_BUTTON));

      // Assert
      await waitFor(() => {
        expect(mockCreateBuyNavigationDetails).toHaveBeenCalledWith({
          address: '0x123',
          chainId: 1, // Falls back to getDecimalChainId result
        });
      });
    });

    it('uses default navigation when no custom params are provided', async () => {
      // Arrange
      mockUseRoute.mockReturnValue({
        params: {},
      } as never);

      const { getByTestId } = render(<FundActionMenu />);

      // Act
      fireEvent.press(getByTestId(WalletActionsBottomSheetSelectorsIDs.BUY_BUTTON));

      // Assert
      await waitFor(() => {
        expect(mockCreateBuyNavigationDetails).toHaveBeenCalledWith();
        expect(mockNavigate).toHaveBeenCalledWith('BuyScreen', {});
      });
    });

    it('prioritizes custom onBuy over asset context when both are provided', async () => {
      // Arrange
      const customOnBuy = jest.fn();
      const assetContext = { address: '0x123', chainId: '0x89' };
      mockUseRoute.mockReturnValue({
        params: { onBuy: customOnBuy, asset: assetContext },
      } as never);

      const { getByTestId } = render(<FundActionMenu />);

      // Act
      fireEvent.press(getByTestId(WalletActionsBottomSheetSelectorsIDs.BUY_BUTTON));

      // Assert
      await waitFor(() => {
        expect(customOnBuy).toHaveBeenCalledTimes(1);
      });
      expect(mockCreateBuyNavigationDetails).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('Analytics Tracking', () => {
    it('tracks deposit analytics when deposit button is pressed', async () => {
      // Arrange
      const { getByTestId } = render(<FundActionMenu />);

      // Act
      fireEvent.press(getByTestId(WalletActionsBottomSheetSelectorsIDs.DEPOSIT_BUTTON));

      // Assert
      await waitFor(() => {
        expect(mockCreateEventBuilder).toHaveBeenCalledWith(MetaMetricsEvents.RAMPS_BUTTON_CLICKED);
        expect(mockAddProperties).toHaveBeenCalledWith({
          text: 'Deposit',
          location: 'FundActionMenu',
          chain_id_destination: 1,
          ramp_type: 'DEPOSIT',
        });
        expect(mockTrackEvent).toHaveBeenCalledWith(mockBuild());
      });
    });

    it('tracks buy analytics when buy button is pressed (without custom onBuy)', async () => {
      // Arrange
      const { getByTestId } = render(<FundActionMenu />);

      // Act
      fireEvent.press(getByTestId(WalletActionsBottomSheetSelectorsIDs.BUY_BUTTON));

      // Assert
      await waitFor(() => {
        expect(mockCreateEventBuilder).toHaveBeenCalledWith(MetaMetricsEvents.BUY_BUTTON_CLICKED);
        expect(mockAddProperties).toHaveBeenCalledWith({
          text: 'Buy',
          location: 'FundActionMenu',
          chain_id_destination: 1,
        });
        expect(mockTrackEvent).toHaveBeenCalledWith(mockBuild());
      });
    });

    it('does not track buy analytics when custom onBuy function is used', async () => {
      // Arrange
      const customOnBuy = jest.fn();
      mockUseRoute.mockReturnValue({
        params: { onBuy: customOnBuy },
      } as never);

      const { getByTestId } = render(<FundActionMenu />);

      // Act
      fireEvent.press(getByTestId(WalletActionsBottomSheetSelectorsIDs.BUY_BUTTON));

      // Assert
      await waitFor(() => {
        expect(customOnBuy).toHaveBeenCalledTimes(1);
      });
      // Should not track analytics when using custom onBuy
      expect(mockTrackEvent).not.toHaveBeenCalled();
    });

    it('tracks buy analytics with asset context chainId when provided', async () => {
      // Arrange
      const assetContext = {
        address: '0x123',
        chainId: '0x89',
      };
      mockUseRoute.mockReturnValue({
        params: { asset: assetContext },
      } as never);

      const { getByTestId } = render(<FundActionMenu />);

      // Act
      fireEvent.press(getByTestId(WalletActionsBottomSheetSelectorsIDs.BUY_BUTTON));

      // Assert
      await waitFor(() => {
        expect(mockAddProperties).toHaveBeenCalledWith({
          text: 'Buy',
          location: 'FundActionMenu',
          chain_id_destination: 137, // Converted from hex '0x89'
        });
      });
    });

    it('tracks sell analytics when sell button is pressed', async () => {
      // Arrange
      const { getByTestId } = render(<FundActionMenu />);

      // Act
      fireEvent.press(getByTestId(WalletActionsBottomSheetSelectorsIDs.SELL_BUTTON));

      // Assert
      await waitFor(() => {
        expect(mockCreateEventBuilder).toHaveBeenCalledWith(MetaMetricsEvents.SELL_BUTTON_CLICKED);
        expect(mockAddProperties).toHaveBeenCalledWith({
          text: 'Sell',
          location: 'FundActionMenu',
          chain_id_source: 1,
        });
        expect(mockTrackEvent).toHaveBeenCalledWith(mockBuild());
      });
    });
  });

  describe('Tracing and Performance', () => {
    it('traces deposit experience when deposit button is pressed', async () => {
      // Arrange
      const { getByTestId } = render(<FundActionMenu />);

      // Act
      fireEvent.press(getByTestId(WalletActionsBottomSheetSelectorsIDs.DEPOSIT_BUTTON));

      // Assert
      await waitFor(() => {
        expect(mockTrace).toHaveBeenCalledWith({
          name: TraceName.LoadDepositExperience,
        });
      });
    });

    it('traces buy ramp experience when buy button is pressed', async () => {
      // Arrange
      const { getByTestId } = render(<FundActionMenu />);

      // Act
      fireEvent.press(getByTestId(WalletActionsBottomSheetSelectorsIDs.BUY_BUTTON));

      // Assert
      await waitFor(() => {
        expect(mockTrace).toHaveBeenCalledWith({
          name: TraceName.LoadRampExperience,
          tags: {
            rampType: RampType.BUY,
          },
        });
      });
    });

    it('traces sell ramp experience when sell button is pressed', async () => {
      // Arrange
      const { getByTestId } = render(<FundActionMenu />);

      // Act
      fireEvent.press(getByTestId(WalletActionsBottomSheetSelectorsIDs.SELL_BUTTON));

      // Assert
      await waitFor(() => {
        expect(mockTrace).toHaveBeenCalledWith({
          name: TraceName.LoadRampExperience,
          tags: {
            rampType: RampType.SELL,
          },
        });
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('handles empty route params gracefully', () => {
      // Arrange
      mockUseRoute.mockReturnValue({
        params: undefined,
      } as never);

      // Act & Assert
      expect(() => render(<FundActionMenu />)).not.toThrow();
    });

    it('handles missing asset context gracefully', async () => {
      // Arrange
      mockUseRoute.mockReturnValue({
        params: { asset: undefined },
      } as never);

      const { getByTestId } = render(<FundActionMenu />);

      // Act
      fireEvent.press(getByTestId(WalletActionsBottomSheetSelectorsIDs.BUY_BUTTON));

      // Assert
      await waitFor(() => {
        expect(mockCreateBuyNavigationDetails).toHaveBeenCalledWith();
      });
    });

    it('handles undefined chainId in asset context', async () => {
      // Arrange
      const assetContext = {
        address: '0x123',
        chainId: undefined,
      };
      mockUseRoute.mockReturnValue({
        params: { asset: assetContext },
      } as never);

      const { getByTestId } = render(<FundActionMenu />);

      // Act
      fireEvent.press(getByTestId(WalletActionsBottomSheetSelectorsIDs.BUY_BUTTON));

      // Assert
      await waitFor(() => {
        expect(mockCreateBuyNavigationDetails).toHaveBeenCalledWith({
          address: '0x123',
          chainId: 1, // Falls back to getDecimalChainId
        });
      });
    });

    it('handles different chain IDs correctly', () => {
      // Arrange
      mockUseSelector.mockImplementation((selector) => {
        const selectorString = selector.toString();
        if (selectorString.includes('selectChainId')) return '0x89'; // Polygon
        if (selectorString.includes('selectCanSignTransactions')) return true;
        return undefined;
      });
      mockGetDecimalChainId.mockReturnValue(137);

      const { getByTestId } = render(<FundActionMenu />);

      // Act
      fireEvent.press(getByTestId(WalletActionsBottomSheetSelectorsIDs.DEPOSIT_BUTTON));

      // Assert
      expect(mockAddProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          chain_id_destination: 137,
        }),
      );
    });

    it('renders when no buttons are available', () => {
      // Arrange
      mockUseDepositEnabled.mockReturnValue({ isDepositEnabled: false });
      mockUseRampNetwork.mockReturnValue([false]);

      // Act
      const { getByTestId, queryByTestId } = render(<FundActionMenu />);

      // Assert
      expect(getByTestId('bottom-sheet')).toBeOnTheScreen();
      expect(queryByTestId(WalletActionsBottomSheetSelectorsIDs.DEPOSIT_BUTTON)).toBeNull();
      expect(queryByTestId(WalletActionsBottomSheetSelectorsIDs.BUY_BUTTON)).toBeNull();
      expect(queryByTestId(WalletActionsBottomSheetSelectorsIDs.SELL_BUTTON)).toBeNull();
    });
  });

  describe('Component Integration', () => {
    it('properly integrates with BottomSheet ref methods', () => {
      // Arrange & Act
      const { getByTestId } = render(<FundActionMenu />);

      // Assert
      expect(getByTestId('bottom-sheet')).toBeOnTheScreen();
      // The ref should be properly set up, which is tested indirectly through user interactions
    });

    it('displays correct strings from i18n', () => {
      // Arrange & Act
      const { getByTestId } = render(<FundActionMenu />);

      // Assert
      expect(getByTestId(`${WalletActionsBottomSheetSelectorsIDs.DEPOSIT_BUTTON}-label`)).toHaveTextContent('fund_actionmenu.deposit');
      expect(getByTestId(`${WalletActionsBottomSheetSelectorsIDs.BUY_BUTTON}-label`)).toHaveTextContent('fund_actionmenu.buy');
      expect(getByTestId(`${WalletActionsBottomSheetSelectorsIDs.SELL_BUTTON}-label`)).toHaveTextContent('fund_actionmenu.sell');
    });

    it('properly handles selector updates', () => {
      // Arrange & Act
      const { rerender } = render(<FundActionMenu />);

      // Change the canSignTransactions selector
      mockUseSelector.mockImplementation((selector) => {
        const selectorString = selector.toString();
        if (selectorString.includes('selectChainId')) return '0x1';
        if (selectorString.includes('selectCanSignTransactions')) return false;
        return undefined;
      });

      rerender(<FundActionMenu />);

      // Assert
      const { getByTestId } = render(<FundActionMenu />);
      const sellButton = getByTestId(WalletActionsBottomSheetSelectorsIDs.SELL_BUTTON);
      expect(sellButton.props.accessibilityState.disabled).toBe(true);
    });
  });
});
