import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { WalletActionsBottomSheetSelectorsIDs } from '../../Views/WalletActions/WalletActionsBottomSheet.testIds';
import { RampType } from '../../../reducers/fiatOrders/types';
import { useAnalytics } from '../../hooks/useAnalytics/useAnalytics';
import { createMockUseAnalyticsHook } from '../../../util/test/analyticsMock';
import useRampNetwork from '../Ramp/Aggregator/hooks/useRampNetwork';
import useDepositEnabled from '../Ramp/Deposit/hooks/useDepositEnabled';
import { useRampNavigation } from '../Ramp/hooks/useRampNavigation';
import { trace, TraceName } from '../../../util/trace';
import FundActionMenu from './FundActionMenu';
import { RampsButtonClickData } from '../Ramp/hooks/useRampsButtonClickData';

jest.mock('@react-navigation/native');
jest.mock('@metamask/design-system-react-native', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  const actual = jest.requireActual('@metamask/design-system-react-native');

  return {
    ...actual,
    BottomSheet: ReactActual.forwardRef(
      (
        {
          children,
          testID,
        }: {
          children: React.ReactNode;
          testID?: string;
        },
        ref: React.Ref<{ onCloseBottomSheet: (callback: () => void) => void }>,
      ) => {
        ReactActual.useImperativeHandle(ref, () => ({
          onCloseBottomSheet: (callback: () => void) => callback(),
        }));

        return <View testID={testID}>{children}</View>;
      },
    ),
  };
});
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
  connect: jest.fn(() => (component: React.ComponentType) => component),
}));
jest.mock('../../hooks/useAnalytics/useAnalytics');
jest.mock('../Ramp/Aggregator/hooks/useRampNetwork');
jest.mock('../Ramp/Deposit/hooks/useDepositEnabled');
jest.mock('../Ramp/hooks/useRampNavigation');
jest.mock('../../../util/trace');
jest.mock('../../../util/networks', () => ({
  getDecimalChainId: jest.fn(),
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

const mockUseNavigation = useNavigation as jest.MockedFunction<
  typeof useNavigation
>;
const mockUseRoute = useRoute as jest.MockedFunction<typeof useRoute>;
const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockUseAnalytics = jest.mocked(useAnalytics);
const mockUseRampNetwork = useRampNetwork as jest.MockedFunction<
  typeof useRampNetwork
>;
const mockUseDepositEnabled = useDepositEnabled as jest.MockedFunction<
  typeof useDepositEnabled
>;
const mockUseRampNavigation = useRampNavigation as jest.MockedFunction<
  typeof useRampNavigation
>;
const mockTrace = trace as jest.MockedFunction<typeof trace>;
const { getDecimalChainId } = jest.requireMock('../../../util/networks');

describe('FundActionMenu', () => {
  const mockNavigate = jest.fn();
  const mockGoToBuy = jest.fn();
  const mockGoToSell = jest.fn();
  const mockGoToDeposit = jest.fn();
  const mockTrackEvent = jest.fn();
  const mockCreateEventBuilder = jest.fn();
  const mockBuild = jest.fn();
  const mockAddProperties = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseNavigation.mockReturnValue({
      navigate: mockNavigate,
      goBack: jest.fn(),
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
    mockUseAnalytics.mockReturnValue(
      createMockUseAnalyticsHook({
        trackEvent: mockTrackEvent,
        createEventBuilder: mockCreateEventBuilder,
      }),
    );
    mockUseRampNetwork.mockReturnValue([true, true]);
    mockUseDepositEnabled.mockReturnValue({ isDepositEnabled: true });
    mockUseRampNavigation.mockReturnValue({
      goToBuy: mockGoToBuy,
      goToAggregator: jest.fn(),
      goToSell: mockGoToSell,
      goToDeposit: mockGoToDeposit,
    });
    getDecimalChainId.mockReturnValue(1);
  });

  it('renders buy, deposit, and sell actions when available', () => {
    const { getByTestId } = render(<FundActionMenu />);

    expect(
      getByTestId(WalletActionsBottomSheetSelectorsIDs.BUY_UNIFIED_BUTTON),
    ).toBeOnTheScreen();
    expect(
      getByTestId(WalletActionsBottomSheetSelectorsIDs.DEPOSIT_BUTTON),
    ).toBeOnTheScreen();
    expect(
      getByTestId(WalletActionsBottomSheetSelectorsIDs.SELL_BUTTON),
    ).toBeOnTheScreen();
  });

  it('does not render deposit button when deposit is disabled', () => {
    mockUseDepositEnabled.mockReturnValue({ isDepositEnabled: false });

    const { queryByTestId } = render(<FundActionMenu />);

    expect(
      queryByTestId(WalletActionsBottomSheetSelectorsIDs.DEPOSIT_BUTTON),
    ).toBeNull();
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

    expect(
      getByTestId(WalletActionsBottomSheetSelectorsIDs.SELL_BUTTON),
    ).toBeDisabled();
  });

  it('calls buy action when buy button is pressed', async () => {
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

  it('uses custom onBuy when provided in route params', async () => {
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
    expect(mockTrackEvent).not.toHaveBeenCalled();
  });

  it('tracks unified buy analytics when buy button is pressed', async () => {
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
        ramp_routing: undefined,
        is_authenticated: false,
        preferred_provider: undefined,
        order_count: 0,
      });
      expect(mockTrackEvent).toHaveBeenCalledWith(mockBuild());
    });
  });

  it('calls deposit action and tracks deposit analytics when deposit button is pressed', async () => {
    const { getByTestId } = render(<FundActionMenu />);

    fireEvent.press(
      getByTestId(WalletActionsBottomSheetSelectorsIDs.DEPOSIT_BUTTON),
    );

    await waitFor(() => {
      expect(mockGoToDeposit).toHaveBeenCalled();
      expect(mockAddProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          button_text: 'Deposit',
          location: 'FundActionMenu',
          ramp_type: 'DEPOSIT',
        }),
      );
      expect(mockTrace).toHaveBeenCalledWith({
        name: TraceName.LoadDepositExperience,
      });
    });
  });

  it('keeps sell action enabled with sell-specific trace configuration', () => {
    const { getByTestId } = render(<FundActionMenu />);

    expect(
      getByTestId(WalletActionsBottomSheetSelectorsIDs.SELL_BUTTON),
    ).toBeOnTheScreen();
    expect(mockTrace).not.toHaveBeenCalledWith({
      name: TraceName.LoadRampExperience,
      tags: { rampType: RampType.BUY },
    });
  });
});
