import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Routes from '../../../../../constants/navigation/Routes';
import type { PredictPortfolioModel } from '../../hooks/usePredictPortfolio';
import {
  PredictPositionsEmptySelectorsIDs,
  PredictPositionsHistoryListSelectorsIDs,
  PredictPositionsViewSelectorsIDs,
} from '../../Predict.testIds';
import { PredictPositionStatus, type PredictPosition } from '../../types';
import PredictPositionsView from './PredictPositionsView';

jest.mock('react-native-reanimated', () => {
  const Reanimated = jest.requireActual('react-native-reanimated/mock');
  Reanimated.default.createAnimatedComponent = (
    Component: React.ComponentType,
  ) => Component;
  return Reanimated;
});

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: jest.fn(),
  useRoute: jest.fn(),
}));

const mockUsePredictPortfolio = jest.fn();
jest.mock('../../hooks/usePredictPortfolio', () => ({
  usePredictPortfolio: () => mockUsePredictPortfolio(),
}));

jest.mock('../../hooks/usePredictActionGuard', () => ({
  usePredictActionGuard: () => ({
    executeGuardedAction: (action: () => void | Promise<void>) => action(),
  }),
}));

jest.mock('../../components/PredictPositionsHistoryList', () => {
  const ReactLib = jest.requireActual('react');
  const { Text, View } = jest.requireActual('react-native');
  const { PredictPositionsHistoryListSelectorsIDs: testIds } =
    jest.requireActual('../../Predict.testIds');

  return function MockPredictPositionsHistoryList({
    claimPendingPositions,
    isPrivacyMode,
    isVisible,
  }: {
    claimPendingPositions?: PredictPosition[];
    isPrivacyMode?: boolean;
    isVisible: boolean;
  }) {
    return ReactLib.createElement(
      View,
      { testID: testIds.CONTAINER },
      ReactLib.createElement(Text, null, `history-visible:${isVisible}`),
      ReactLib.createElement(
        Text,
        null,
        `history-claim-pending-present:${claimPendingPositions !== undefined}`,
      ),
      ReactLib.createElement(
        Text,
        null,
        `history-claim-pending-count:${claimPendingPositions?.length ?? 0}`,
      ),
      ReactLib.createElement(
        Text,
        null,
        `history-privacy:${Boolean(isPrivacyMode)}`,
      ),
    );
  };
});

let mockPrivacyMode = false;
jest.mock('react-redux', () => ({
  useSelector: jest.fn(() => mockPrivacyMode),
}));

const mockNavigation = {
  canGoBack: jest.fn(),
  goBack: jest.fn(),
  navigate: jest.fn(),
};

const mockUseNavigation = useNavigation as jest.Mock;
const mockUseRoute = useRoute as jest.Mock;
const mockClaim = jest.fn();

const createClaimablePosition = (
  overrides: Partial<PredictPosition> = {},
): PredictPosition => ({
  amount: 1,
  avgPrice: 0.5,
  cashPnl: 1,
  claimable: true,
  currentValue: 4.5,
  endDate: '2026-05-25T00:00:00.000Z',
  icon: 'https://example.com/icon.png',
  id: 'claimable-position',
  initialValue: 1,
  marketId: 'market-1',
  outcome: 'Yes',
  outcomeId: 'outcome-1',
  outcomeIndex: 0,
  outcomeTokenId: 'token-1',
  percentPnl: 350,
  price: 0.5,
  providerId: 'provider-1',
  size: 1,
  status: PredictPositionStatus.WON,
  title: 'Prediction market',
  ...overrides,
});

const createPortfolio = (
  overrides: Partial<PredictPortfolioModel> = {},
): PredictPortfolioModel => ({
  accountStateError: null,
  actionableClaimablePositions: [],
  activePositions: [],
  availableBalance: 0,
  balanceError: null,
  claim: mockClaim,
  claimableAmount: 0,
  claimablePositionCount: 0,
  claimablePositions: [],
  claimablePositionsError: null,
  deposit: jest.fn(),
  error: null,
  hasClaimableWinnings: false,
  isBalanceLoading: false,
  isClaimPending: false,
  isDepositPending: false,
  isLoading: false,
  isOpenPositionsLoading: false,
  isPositionsLoading: false,
  isRefreshing: false,
  openPositionCount: 0,
  openPositions: [],
  openPositionsError: null,
  openPositionsValue: 0,
  portfolioValue: 0,
  positionsBadgeCount: 0,
  refetch: jest.fn(),
  showPnlLine: false,
  showUnrealizedPnl: false,
  totalUnrealizedPnlAmount: 0,
  totalUnrealizedPnlPercent: undefined,
  walletType: undefined,
  withdraw: jest.fn(),
  withdrawTransaction: null,
  ...overrides,
});

const renderScreen = (initialTab?: 'positions' | 'history') => {
  mockUseRoute.mockReturnValue({
    params: initialTab ? { initialTab } : undefined,
  });

  return render(<PredictPositionsView />);
};

const getMountedByTestId = (testID: string) =>
  screen.UNSAFE_getByProps({ testID });

const getMountedHistoryVisibilityText = (isVisible: boolean) =>
  screen.UNSAFE_getByProps({ children: `history-visible:${isVisible}` });

describe('PredictPositionsView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrivacyMode = false;
    mockNavigation.canGoBack.mockReturnValue(true);
    mockUseNavigation.mockReturnValue(mockNavigation);
    mockUsePredictPortfolio.mockReturnValue(createPortfolio());
  });

  it('renders the fixed header, summary placeholder, tabs, and positions tab by default', () => {
    renderScreen();

    expect(
      screen.getByTestId(PredictPositionsViewSelectorsIDs.CONTAINER),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(PredictPositionsViewSelectorsIDs.HEADER),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(PredictPositionsViewSelectorsIDs.SUMMARY),
    ).toBeOnTheScreen();
    expect(screen.getByText('$0.00')).toBeOnTheScreen();
    expect(
      screen.getByTestId(PredictPositionsViewSelectorsIDs.TABS),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(PredictPositionsViewSelectorsIDs.POSITIONS_TAB),
    ).toBeOnTheScreen();
    expect(screen.getByText('Active positions')).toBeOnTheScreen();
    expect(
      screen.getByTestId(PredictPositionsViewSelectorsIDs.HISTORY_TAB),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(
        PredictPositionsViewSelectorsIDs.POSITIONS_TAB_CONTENT,
      ),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(PredictPositionsEmptySelectorsIDs.CONTAINER),
    ).toBeOnTheScreen();
    expect(
      getMountedByTestId(PredictPositionsViewSelectorsIDs.HISTORY_TAB_CONTENT),
    ).toBeTruthy();
    expect(getMountedHistoryVisibilityText(false)).toBeTruthy();
  });

  it('uses the initial history tab from route params', () => {
    renderScreen('history');

    expect(
      screen.getByTestId(PredictPositionsViewSelectorsIDs.HISTORY_TAB_CONTENT),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(PredictPositionsHistoryListSelectorsIDs.CONTAINER),
    ).toBeOnTheScreen();
    expect(screen.getByText('history-visible:true')).toBeOnTheScreen();
    expect(
      getMountedByTestId(
        PredictPositionsViewSelectorsIDs.POSITIONS_TAB_CONTENT,
      ),
    ).toBeTruthy();
  });

  it('switches between Positions and History tabs', () => {
    renderScreen();

    fireEvent.press(
      screen.getByTestId(PredictPositionsViewSelectorsIDs.HISTORY_TAB),
    );

    expect(
      screen.getByTestId(PredictPositionsViewSelectorsIDs.HISTORY_TAB_CONTENT),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(PredictPositionsHistoryListSelectorsIDs.CONTAINER),
    ).toBeOnTheScreen();
    expect(screen.getByText('history-visible:true')).toBeOnTheScreen();

    fireEvent.press(
      screen.getByTestId(PredictPositionsViewSelectorsIDs.POSITIONS_TAB),
    );

    expect(
      screen.getByTestId(
        PredictPositionsViewSelectorsIDs.POSITIONS_TAB_CONTENT,
      ),
    ).toBeOnTheScreen();
    expect(getMountedHistoryVisibilityText(false)).toBeTruthy();
  });

  it('passes claim pending positions and privacy mode to History', () => {
    mockPrivacyMode = true;
    mockUsePredictPortfolio.mockReturnValue(
      createPortfolio({
        actionableClaimablePositions: [createClaimablePosition()],
      }),
    );

    renderScreen('history');

    expect(
      screen.getByText('history-claim-pending-present:true'),
    ).toBeOnTheScreen();
    expect(screen.getByText('history-claim-pending-count:1')).toBeOnTheScreen();
    expect(screen.getByText('history-privacy:true')).toBeOnTheScreen();
  });

  it('navigates back when the back button is pressed and the stack can go back', () => {
    renderScreen();

    fireEvent.press(
      screen.getByTestId(PredictPositionsViewSelectorsIDs.BACK_BUTTON),
    );

    expect(mockNavigation.goBack).toHaveBeenCalledTimes(1);
    expect(mockNavigation.navigate).not.toHaveBeenCalled();
  });

  it('returns to the Predict market list when the stack cannot go back', () => {
    mockNavigation.canGoBack.mockReturnValue(false);
    renderScreen();

    fireEvent.press(
      screen.getByTestId(PredictPositionsViewSelectorsIDs.BACK_BUTTON),
    );

    expect(mockNavigation.goBack).not.toHaveBeenCalled();
    expect(mockNavigation.navigate).toHaveBeenCalledWith(
      Routes.PREDICT.MARKET_LIST,
    );
  });
});
