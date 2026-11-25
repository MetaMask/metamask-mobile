import { act, fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { useSelector } from 'react-redux';
import Routes from '../../../../../constants/navigation/Routes';
import {
  EARN_MODULE_COMPONENT_NAMES,
  EARN_MODULE_ENTRY_POINTS,
  EARN_MODULE_REDIRECT_TARGETS,
} from '../../../../../components/UI/Earn/constants/earnModuleEvents';
import useEarnHighestRate from '../../../../../components/UI/Earn/hooks/useEarnHighestRate';
import useMoneyVaultApy from '../../../../../components/UI/Money/hooks/useMoneyVaultApy';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { WalletActionsBottomSheetSelectorsIDs } from '../../../WalletActions/WalletActionsBottomSheet.testIds';
import RedesignedEarnTradeMenuRow from './RedesignedEarnTradeMenuRow';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

jest.mock('../../../../../components/UI/Earn/hooks/useEarnHighestRate', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../../../../../components/UI/Money/hooks/useMoneyVaultApy', () => ({
  __esModule: true,
  default: jest.fn(),
}));

const mockTrackEarnSurfaceClicked = jest.fn();
jest.mock('../../../../../components/UI/Earn/hooks/useEarnAnalytics', () => ({
  useEarnAnalytics: () => ({
    trackSurfaceClicked: mockTrackEarnSurfaceClicked,
  }),
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockOnActionSelected = jest.fn<
  void,
  [callback: () => void | Promise<void>]
>();
const mockUseEarnHighestRate = jest.mocked(useEarnHighestRate);
const mockUseMoneyVaultApy = jest.mocked(useMoneyVaultApy);

const renderRedesignedRow = ({
  isEarnEligible = true,
  isMoneyAccountVisible = true,
}: {
  isEarnEligible?: boolean;
  isMoneyAccountVisible?: boolean;
} = {}) => {
  mockUseSelector
    .mockReturnValueOnce(isEarnEligible)
    .mockReturnValueOnce(isMoneyAccountVisible);

  return render(
    <RedesignedEarnTradeMenuRow
      onActionSelected={mockOnActionSelected}
      isDisabled={false}
    />,
  );
};

describe('RedesignedEarnTradeMenuRow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseEarnHighestRate.mockReturnValue({ highestRate: undefined });
    mockUseMoneyVaultApy.mockReturnValue({
      apyPercent: undefined,
    } as unknown as ReturnType<typeof useMoneyVaultApy>);
  });

  it('renders the Money account APY tag', () => {
    mockUseMoneyVaultApy.mockReturnValue({
      apyPercent: 6.2,
    } as unknown as ReturnType<typeof useMoneyVaultApy>);

    const { getByTestId } = renderRedesignedRow();

    expect(mockUseEarnHighestRate).toHaveBeenCalledWith({ enabled: false });
    expect(mockUseMoneyVaultApy).toHaveBeenCalledWith({ enabled: true });
    expect(
      getByTestId(WalletActionsBottomSheetSelectorsIDs.EARN_RATE_TAG),
    ).toHaveTextContent('6.2% APY');
  });

  it('omits the rate tag when Money APY is unavailable', () => {
    const { queryByTestId } = renderRedesignedRow();

    expect(
      queryByTestId(WalletActionsBottomSheetSelectorsIDs.EARN_RATE_TAG),
    ).not.toBeOnTheScreen();
  });

  it('renders the latest highest Earn rate when Money account is hidden', () => {
    mockUseEarnHighestRate.mockReturnValue({
      highestRate: {
        type: 'APY',
        percentage: 3.1,
        status: 'ready',
      },
    });
    mockUseMoneyVaultApy.mockReturnValue({
      apyPercent: 6.2,
    } as unknown as ReturnType<typeof useMoneyVaultApy>);

    const { getByTestId, rerender } = renderRedesignedRow({
      isMoneyAccountVisible: false,
    });

    expect(mockUseEarnHighestRate).toHaveBeenCalledWith({ enabled: true });
    expect(mockUseMoneyVaultApy).toHaveBeenCalledWith({ enabled: false });
    expect(
      getByTestId(WalletActionsBottomSheetSelectorsIDs.EARN_RATE_TAG),
    ).toHaveTextContent('3.1% APY');

    mockUseEarnHighestRate.mockReturnValue({
      highestRate: {
        type: 'APR',
        percentage: 4.2,
        status: 'ready',
      },
    });
    mockUseSelector.mockReturnValueOnce(true).mockReturnValueOnce(false);
    rerender(
      <RedesignedEarnTradeMenuRow
        onActionSelected={mockOnActionSelected}
        isDisabled={false}
      />,
    );

    expect(
      getByTestId(WalletActionsBottomSheetSelectorsIDs.EARN_RATE_TAG),
    ).toHaveTextContent('4.2% APR');
  });

  it('hides the row when Earn section eligibility fails', () => {
    const { queryByTestId } = renderRedesignedRow({
      isEarnEligible: false,
    });

    expect(
      queryByTestId(WalletActionsBottomSheetSelectorsIDs.EARN_BUTTON),
    ).not.toBeOnTheScreen();
  });

  it('queues Earn section list navigation with Trade menu context', () => {
    const { getByTestId } = renderRedesignedRow();

    fireEvent.press(
      getByTestId(WalletActionsBottomSheetSelectorsIDs.EARN_BUTTON),
    );
    void mockOnActionSelected.mock.calls[0][0]();

    expect(mockNavigate).toHaveBeenCalledWith(Routes.EARN.ROOT, {
      screen: Routes.EARN.SEARCH_LIST,
      params: {
        analyticsContext: {
          entry_point: EARN_MODULE_ENTRY_POINTS.TRADE_MENU,
        },
      },
    });
  });

  it('tracks ready rate details when Earn row is pressed', () => {
    mockUseMoneyVaultApy.mockReturnValue({
      apyPercent: 6.2,
    } as unknown as ReturnType<typeof useMoneyVaultApy>);

    const { getByTestId } = renderRedesignedRow();

    act(() => {
      fireEvent.press(
        getByTestId(WalletActionsBottomSheetSelectorsIDs.EARN_BUTTON),
      );
    });

    expect(mockTrackEarnSurfaceClicked).toHaveBeenCalledWith({
      component_name: EARN_MODULE_COMPONENT_NAMES.EARN_TRADE_MENU_ROW,
      redirect_target: EARN_MODULE_REDIRECT_TARGETS.EARN_SECTION_LIST_VIEW,
      rate_type: 'apy',
      rate_percentage: 6.2,
    });
  });

  it('tracks APY type without percentage when Money APY is unavailable', () => {
    const { getByTestId } = renderRedesignedRow();

    act(() => {
      fireEvent.press(
        getByTestId(WalletActionsBottomSheetSelectorsIDs.EARN_BUTTON),
      );
    });

    expect(mockTrackEarnSurfaceClicked).toHaveBeenCalledWith({
      component_name: EARN_MODULE_COMPONENT_NAMES.EARN_TRADE_MENU_ROW,
      redirect_target: EARN_MODULE_REDIRECT_TARGETS.EARN_SECTION_LIST_VIEW,
      rate_type: 'apy',
    });
  });

  it('tracks the latest highest Earn rate when Money account is hidden', () => {
    mockUseEarnHighestRate.mockReturnValue({
      highestRate: {
        type: 'APY',
        percentage: 3.1,
        status: 'ready',
      },
    });

    const { getByTestId, rerender } = renderRedesignedRow({
      isMoneyAccountVisible: false,
    });

    mockUseEarnHighestRate.mockReturnValue({
      highestRate: {
        type: 'APR',
        percentage: 4.2,
        status: 'ready',
      },
    });
    mockUseSelector.mockReturnValueOnce(true).mockReturnValueOnce(false);
    rerender(
      <RedesignedEarnTradeMenuRow
        onActionSelected={mockOnActionSelected}
        isDisabled={false}
      />,
    );

    act(() => {
      fireEvent.press(
        getByTestId(WalletActionsBottomSheetSelectorsIDs.EARN_BUTTON),
      );
    });

    expect(mockTrackEarnSurfaceClicked).toHaveBeenCalledWith({
      component_name: EARN_MODULE_COMPONENT_NAMES.EARN_TRADE_MENU_ROW,
      redirect_target: EARN_MODULE_REDIRECT_TARGETS.EARN_SECTION_LIST_VIEW,
      rate_type: 'apr',
      rate_percentage: 4.2,
    });
  });
});
