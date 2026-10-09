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
import { selectIsEarnSectionEligible } from '../../../../../components/UI/Earn/selectors/eligibility';
import type { RootState } from '../../../../../reducers';
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

jest.mock('../../../../../components/UI/Earn/selectors/eligibility', () => ({
  selectIsEarnSectionEligible: jest.fn(),
}));

jest.mock('../../../../../components/UI/Earn/hooks/useEarnHighestRate', () => ({
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
const mockSelectIsEarnSectionEligible = jest.mocked(
  selectIsEarnSectionEligible,
);
const mockUseEarnHighestRate = jest.mocked(useEarnHighestRate);

const renderRedesignedRow = () =>
  render(
    <RedesignedEarnTradeMenuRow
      onActionSelected={mockOnActionSelected}
      isDisabled={false}
    />,
  );

describe('RedesignedEarnTradeMenuRow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigate.mockReset();
    mockUseSelector.mockImplementation((selector) => selector({} as RootState));
    mockSelectIsEarnSectionEligible.mockReturnValue(true);
    mockUseEarnHighestRate.mockReturnValue({ highestRate: undefined });
  });

  it.each([
    [
      { type: 'APY' as const, percentage: 6.2, status: 'ready' as const },
      '6.2% APY',
    ],
    [
      { type: 'APR' as const, percentage: 4.2, status: 'ready' as const },
      '4.2% APR',
    ],
  ])('renders the ready %s rate tag', (highestRate, copy) => {
    mockUseEarnHighestRate.mockReturnValue({ highestRate });

    const { getByTestId } = renderRedesignedRow();

    expect(mockUseEarnHighestRate).toHaveBeenCalled();
    expect(
      getByTestId(WalletActionsBottomSheetSelectorsIDs.EARN_RATE_TAG),
    ).toHaveTextContent(copy);
  });

  it('omits the rate tag when no ready rate is available', () => {
    const { queryByTestId } = renderRedesignedRow();

    expect(
      queryByTestId(WalletActionsBottomSheetSelectorsIDs.EARN_RATE_TAG),
    ).not.toBeOnTheScreen();
  });

  it('hides the row when Earn section eligibility fails', () => {
    mockSelectIsEarnSectionEligible.mockReturnValue(false);

    const { queryByTestId } = renderRedesignedRow();

    expect(
      queryByTestId(WalletActionsBottomSheetSelectorsIDs.EARN_BUTTON),
    ).not.toBeOnTheScreen();
  });

  it('queues Earn section list navigation with Trade menu context', () => {
    const { getByTestId } = renderRedesignedRow();

    fireEvent.press(
      getByTestId(WalletActionsBottomSheetSelectorsIDs.EARN_BUTTON),
    );
    mockOnActionSelected.mock.calls[0][0]();

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
    mockUseEarnHighestRate.mockReturnValue({
      highestRate: {
        type: 'APY',
        percentage: 6.2,
        status: 'ready',
      },
    });

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

  it('tracks rate type without percentage when rate is not ready', () => {
    mockUseEarnHighestRate.mockReturnValue({
      highestRate: {
        type: 'APR',
        status: 'error',
      },
    });

    const { getByTestId } = renderRedesignedRow();

    act(() => {
      fireEvent.press(
        getByTestId(WalletActionsBottomSheetSelectorsIDs.EARN_BUTTON),
      );
    });

    expect(mockTrackEarnSurfaceClicked).toHaveBeenCalledWith({
      component_name: EARN_MODULE_COMPONENT_NAMES.EARN_TRADE_MENU_ROW,
      redirect_target: EARN_MODULE_REDIRECT_TARGETS.EARN_SECTION_LIST_VIEW,
      rate_type: 'apr',
    });
  });
});
