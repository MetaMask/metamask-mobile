import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import Routes from '../../../../../constants/navigation/Routes';
import { PredictEventValues } from '../../constants/eventNames';
import type { PredictPortfolioModel } from '../../hooks/usePredictPortfolio';
import {
  PredictPositionsEmptySelectorsIDs,
  PredictPositionsListSelectorsIDs,
} from '../../Predict.testIds';
import { PredictPosition, PredictPositionStatus } from '../../types';
import PredictPositionsList from './PredictPositionsList';

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: jest.fn(),
}));

jest.mock('../PredictPositionsEmpty', () => {
  const ReactLib = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  const { PredictPositionsEmptySelectorsIDs: testIds } = jest.requireActual(
    '../../Predict.testIds',
  );

  return function MockPredictPositionsEmpty() {
    return ReactLib.createElement(View, { testID: testIds.CONTAINER });
  };
});

jest.mock('../PredictPosition/PredictPosition', () => {
  const ReactLib = jest.requireActual('react');
  const { Pressable, Text } = jest.requireActual('react-native');

  return function MockPredictPosition({
    onPress,
    position,
    privacyMode,
  }: {
    onPress?: (position: { id: string }) => void;
    position: { id: string; title: string };
    privacyMode: boolean;
  }) {
    return ReactLib.createElement(
      Pressable,
      {
        accessibilityLabel: `open-${position.id}`,
        onPress: () => onPress?.(position),
        testID: 'mock-position-card',
      },
      ReactLib.createElement(
        Text,
        null,
        `open:${position.title}:${privacyMode ? 'private' : 'public'}`,
      ),
    );
  };
});

jest.mock('../PredictPositionResolved/PredictPositionResolved', () => {
  const ReactLib = jest.requireActual('react');
  const { Pressable, Text } = jest.requireActual('react-native');

  return function MockPredictPositionResolved({
    onPress,
    position,
    privacyMode,
  }: {
    onPress?: (position: { id: string }) => void;
    position: { id: string; title: string };
    privacyMode: boolean;
  }) {
    return ReactLib.createElement(
      Pressable,
      {
        accessibilityLabel: `claimable-${position.id}`,
        onPress: () => onPress?.(position),
        testID: 'mock-position-card',
      },
      ReactLib.createElement(
        Text,
        null,
        `claimable:${position.title}:${privacyMode ? 'private' : 'public'}`,
      ),
    );
  };
});

const mockNavigation = {
  navigate: jest.fn(),
};

const mockUseNavigation = useNavigation as jest.Mock;

const createPosition = (
  id: string,
  overrides: Partial<PredictPosition> = {},
): PredictPosition => ({
  amount: 10,
  avgPrice: 1,
  cashPnl: 0,
  claimable: false,
  currentValue: 100,
  endDate: '2026-01-01T00:00:00Z',
  icon: 'https://example.com/icon.png',
  id,
  initialValue: 100,
  marketId: `market-${id}`,
  outcome: 'Yes',
  outcomeId: `outcome-${id}`,
  outcomeIndex: 0,
  outcomeTokenId: `token-${id}`,
  percentPnl: 0,
  price: 1,
  providerId: 'provider',
  size: 10,
  status: PredictPositionStatus.OPEN,
  title: `Market ${id}`,
  ...overrides,
});

const mockClaim = jest.fn();
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
  withdrawTransaction: undefined,
  ...overrides,
});

const renderList = ({
  isPrivacyMode = false,
  portfolio = createPortfolio(),
}: {
  isPrivacyMode?: boolean;
  portfolio?: PredictPortfolioModel;
} = {}) =>
  render(
    <PredictPositionsList
      isPrivacyMode={isPrivacyMode}
      portfolio={portfolio}
    />,
  );

describe('PredictPositionsList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseNavigation.mockReturnValue(mockNavigation);
  });

  it('renders claimable positions before open positions', () => {
    const olderClaimablePosition = createPosition('older-claimable', {
      claimable: true,
      endDate: '2026-01-01T00:00:00Z',
      status: PredictPositionStatus.WON,
      title: 'Older claimable',
    });
    const newerClaimablePosition = createPosition('newer-claimable', {
      claimable: true,
      endDate: '2026-02-01T00:00:00Z',
      status: PredictPositionStatus.WON,
      title: 'Newer claimable',
    });
    const openPosition = createPosition('open', {
      title: 'Open position',
    });

    renderList({
      portfolio: createPortfolio({
        actionableClaimablePositions: [
          olderClaimablePosition,
          newerClaimablePosition,
        ],
        openPositions: [openPosition],
      }),
    });

    expect(
      screen.getByTestId(
        PredictPositionsListSelectorsIDs.CLAIMABLE_POSITIONS_LIST,
      ),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(PredictPositionsListSelectorsIDs.OPEN_POSITIONS_LIST),
    ).toBeOnTheScreen();

    const cards = screen.getAllByTestId('mock-position-card');
    expect(cards[0]).toHaveProp(
      'accessibilityLabel',
      'claimable-newer-claimable',
    );
    expect(cards[1]).toHaveProp(
      'accessibilityLabel',
      'claimable-older-claimable',
    );
    expect(cards[2]).toHaveProp('accessibilityLabel', 'open-open');
  });

  it('navigates to market details when a position is pressed', () => {
    const openPosition = createPosition('open', {
      marketId: 'market-open',
    });

    renderList({
      portfolio: createPortfolio({
        openPositions: [openPosition],
      }),
    });

    fireEvent.press(screen.getByLabelText('open-open'));

    expect(mockNavigation.navigate).toHaveBeenCalledWith(
      Routes.PREDICT.MARKET_DETAILS,
      {
        entryPoint: PredictEventValues.ENTRY_POINT.HOMEPAGE_POSITIONS,
        marketId: 'market-open',
      },
    );
  });

  it('renders the shared empty state when there are no positions', () => {
    renderList();

    expect(
      screen.getByTestId(PredictPositionsEmptySelectorsIDs.CONTAINER),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(PredictPositionsListSelectorsIDs.CONTAINER),
    ).toBeNull();
  });

  it('renders a loading state while positions are loading without cached positions', () => {
    renderList({
      portfolio: createPortfolio({
        isPositionsLoading: true,
      }),
    });

    expect(
      screen.getByTestId(PredictPositionsListSelectorsIDs.LOADING_STATE),
    ).toBeOnTheScreen();
    expect(
      screen.getAllByTestId(PredictPositionsListSelectorsIDs.SKELETON_ROW),
    ).toHaveLength(3);
    expect(
      screen.queryByTestId(PredictPositionsEmptySelectorsIDs.CONTAINER),
    ).toBeNull();
  });

  it('passes privacy mode to rendered position rows', () => {
    renderList({
      isPrivacyMode: true,
      portfolio: createPortfolio({
        actionableClaimablePositions: [
          createPosition('claimable', {
            claimable: true,
            status: PredictPositionStatus.WON,
            title: 'Claimable position',
          }),
        ],
        openPositions: [
          createPosition('open', {
            title: 'Open position',
          }),
        ],
      }),
    });

    expect(
      screen.getByText('claimable:Claimable position:private'),
    ).toBeOnTheScreen();
    expect(screen.getByText('open:Open position:private')).toBeOnTheScreen();
  });
});
