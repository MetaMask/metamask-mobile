import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import {
  PredictCryptoUpDownPositionsSelectorsIDs,
  getPredictCryptoUpDownPositionSelector,
} from '../../Predict.testIds';
import {
  PredictMarketStatus,
  PredictPositionStatus,
  Recurrence,
  Side,
  type OrderPreview,
  type PredictMarket,
  type PredictPosition,
} from '../../types';
import { PredictEventValues } from '../../constants/eventNames';
import { usePredictActionGuard } from '../../hooks/usePredictActionGuard';
import { usePredictCashOut } from '../../hooks/usePredictCashOut';
import { usePredictClaim } from '../../hooks/usePredictClaim';
import { usePredictOrderPreview } from '../../hooks/usePredictOrderPreview';
import PredictCryptoUpDownPosition from './PredictCryptoUpDownPosition';
import PredictCryptoUpDownPositions from './PredictCryptoUpDownPositions';

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({
    style: jest.fn(() => ({})),
  }),
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useIsFocused: jest.fn(),
  useNavigation: jest.fn(),
}));

jest.mock('../../hooks/usePredictActionGuard', () => ({
  usePredictActionGuard: jest.fn(),
}));

jest.mock('../../hooks/usePredictCashOut', () => ({
  usePredictCashOut: jest.fn(),
}));

jest.mock('../../hooks/usePredictClaim', () => ({
  usePredictClaim: jest.fn(),
}));

jest.mock('../../hooks/usePredictOrderPreview', () => ({
  usePredictOrderPreview: jest.fn(),
}));

const mockUseIsFocused = useIsFocused as jest.MockedFunction<
  typeof useIsFocused
>;
const mockUseNavigation = useNavigation as jest.MockedFunction<
  typeof useNavigation
>;
const mockUsePredictActionGuard = usePredictActionGuard as jest.MockedFunction<
  typeof usePredictActionGuard
>;
const mockUsePredictCashOut = usePredictCashOut as jest.MockedFunction<
  typeof usePredictCashOut
>;
const mockUsePredictClaim = usePredictClaim as jest.MockedFunction<
  typeof usePredictClaim
>;
const mockUsePredictOrderPreview =
  usePredictOrderPreview as jest.MockedFunction<typeof usePredictOrderPreview>;

const mockOnCashOut = jest.fn();
const mockClaim = jest.fn();
const mockExecuteGuardedAction = jest.fn();
const mockNavigation = {
  navigate: jest.fn(),
};

const initialState = {
  engine: {
    backgroundState,
  },
};

const createMarket = (
  overrides: Partial<PredictMarket> = {},
): PredictMarket => ({
  id: 'market-1',
  providerId: 'polymarket',
  slug: 'btc-up-or-down-5m',
  title: 'BTC Up or Down - 5 Minutes',
  description: 'Will BTC go up or down?',
  endDate: '2026-12-31T00:00:00Z',
  image: 'https://example.com/btc.png',
  status: 'open',
  recurrence: Recurrence.NONE,
  category: 'crypto',
  tags: ['crypto'],
  outcomes: [
    {
      id: 'outcome-1',
      providerId: 'polymarket',
      marketId: 'market-1',
      title: 'BTC Up or Down',
      description: 'BTC Up or Down',
      image: 'https://example.com/up.png',
      status: 'open',
      tokens: [
        { id: 'up-token', title: 'Up', price: 0.55 },
        { id: 'down-token', title: 'Down', price: 0.45 },
      ],
      volume: 1000,
      groupItemTitle: 'BTC',
    },
  ],
  liquidity: 10000,
  volume: 50000,
  ...overrides,
});

const createPosition = (
  overrides: Partial<PredictPosition> = {},
): PredictPosition => ({
  id: 'position-1',
  providerId: 'polymarket',
  marketId: 'market-1',
  outcomeId: 'outcome-1',
  outcomeTokenId: 'up-token',
  currentValue: 130,
  title: 'BTC Up or Down - 5 Minutes',
  outcome: 'Up',
  icon: 'https://example.com/icon.png',
  amount: 100,
  price: 0.5,
  status: PredictPositionStatus.OPEN,
  size: 10,
  outcomeIndex: 0,
  percentPnl: 30,
  cashPnl: 30,
  claimable: false,
  initialValue: 100,
  avgPrice: 0.45,
  endDate: '2026-12-31T00:00:00Z',
  ...overrides,
});

const createOrderPreview = (
  overrides: Partial<OrderPreview> = {},
): OrderPreview => ({
  marketId: 'market-1',
  outcomeId: 'outcome-1',
  outcomeTokenId: 'up-token',
  timestamp: 1000,
  side: Side.SELL,
  sharePrice: 0.5,
  maxAmountSpent: 10,
  minAmountReceived: 142.5,
  slippage: 0.01,
  tickSize: 0.01,
  minOrderSize: 1,
  negRisk: false,
  ...overrides,
});

const renderPosition = ({
  market = createMarket(),
  marketStatus = PredictMarketStatus.OPEN,
  position = createPosition(),
}: {
  market?: PredictMarket;
  marketStatus?: PredictMarketStatus;
  position?: PredictPosition;
} = {}) =>
  renderWithProvider(
    <PredictCryptoUpDownPosition
      market={market}
      marketStatus={marketStatus}
      position={position}
    />,
    { state: initialState },
  );

describe('PredictCryptoUpDownPosition', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseIsFocused.mockReturnValue(true);
    mockUseNavigation.mockReturnValue(mockNavigation);
    mockExecuteGuardedAction.mockImplementation((callback) => callback());
    mockUsePredictActionGuard.mockReturnValue({
      executeGuardedAction: mockExecuteGuardedAction,
      isEligible: true,
    });
    mockUsePredictCashOut.mockReturnValue({ onCashOut: mockOnCashOut });
    mockUsePredictClaim.mockReturnValue({
      claim: mockClaim,
      isClaimPending: false,
    });
    mockUsePredictOrderPreview.mockReturnValue({
      preview: null,
      isCalculating: false,
      isLoading: false,
      error: null,
    });
  });

  it('renders open position value from sell preview and wires cash out action', () => {
    const position = createPosition();
    const market = createMarket();
    mockUsePredictOrderPreview.mockReturnValue({
      preview: createOrderPreview({ minAmountReceived: 142.5 }),
      isCalculating: false,
      isLoading: false,
      error: null,
    });

    renderPosition({ market, position });

    expect(
      screen.getByTestId(
        getPredictCryptoUpDownPositionSelector.row(position.id),
      ),
    ).toBeOnTheScreen();
    expect(screen.getByText('Up')).toBeOnTheScreen();
    expect(screen.getByText(/Entry 45/u)).toBeOnTheScreen();
    expect(screen.getByText('+$42.50')).toBeOnTheScreen();
    expect(mockUsePredictOrderPreview).toHaveBeenCalledWith({
      marketId: position.marketId,
      outcomeId: position.outcomeId,
      outcomeTokenId: position.outcomeTokenId,
      side: Side.SELL,
      size: position.size,
      autoRefreshTimeout: 5000,
    });

    fireEvent.press(
      screen.getByTestId(
        getPredictCryptoUpDownPositionSelector.cashOutButton(position.id),
      ),
    );

    expect(mockOnCashOut).toHaveBeenCalledWith(position);
  });

  it('renders negative open position value without auto refresh when screen is unfocused', () => {
    const position = createPosition({
      id: 'position-negative',
      currentValue: 75,
      outcomeTokenId: 'down-token',
    });
    mockUseIsFocused.mockReturnValue(false);

    renderPosition({ position });

    expect(screen.getByText('Down')).toBeOnTheScreen();
    expect(screen.getByText('-$25')).toBeOnTheScreen();
    expect(mockUsePredictOrderPreview).toHaveBeenCalledWith(
      expect.objectContaining({
        autoRefreshTimeout: undefined,
      }),
    );
  });

  it('disables cash out button and hides stale value for optimistic open position', () => {
    const position = createPosition({ optimistic: true });

    renderPosition({ position });

    expect(screen.queryByText('$30')).not.toBeOnTheScreen();
    expect(
      screen.getByTestId(
        getPredictCryptoUpDownPositionSelector.cashOutButton(position.id),
      ),
    ).toBeDisabled();
  });

  it('renders claimable resolved position and calls guarded claim action', () => {
    const position = createPosition({
      id: 'position-claimable',
      claimable: true,
      currentValue: 175,
      status: PredictPositionStatus.WON,
    });

    renderPosition({
      position,
      marketStatus: PredictMarketStatus.RESOLVED,
    });

    expect(screen.getByText(/Won \$175/u)).toBeOnTheScreen();
    expect(
      screen.queryByTestId(
        getPredictCryptoUpDownPositionSelector.cashOutButton(position.id),
      ),
    ).toBeNull();

    fireEvent.press(
      screen.getByTestId(
        getPredictCryptoUpDownPositionSelector.claimButton(position.id),
      ),
    );

    expect(mockExecuteGuardedAction).toHaveBeenCalledWith(
      expect.any(Function),
      { attemptedAction: PredictEventValues.ATTEMPTED_ACTION.CLAIM },
    );
    expect(mockClaim).toHaveBeenCalledTimes(1);
  });

  it('does not call claim when the guarded claim action is blocked', () => {
    mockExecuteGuardedAction.mockImplementation(() => undefined);
    mockUsePredictActionGuard.mockReturnValue({
      executeGuardedAction: mockExecuteGuardedAction,
      isEligible: false,
    });
    const position = createPosition({
      id: 'position-claim-blocked',
      claimable: true,
      currentValue: 175,
      status: PredictPositionStatus.WON,
    });

    renderPosition({
      position,
      marketStatus: PredictMarketStatus.RESOLVED,
    });

    fireEvent.press(
      screen.getByTestId(
        getPredictCryptoUpDownPositionSelector.claimButton(position.id),
      ),
    );

    expect(mockExecuteGuardedAction).toHaveBeenCalledWith(
      expect.any(Function),
      { attemptedAction: PredictEventValues.ATTEMPTED_ACTION.CLAIM },
    );
    expect(mockClaim).not.toHaveBeenCalled();
  });

  it('renders lost resolved position without claim action', () => {
    const position = createPosition({
      id: 'position-lost',
      currentValue: 40,
      initialValue: 100,
      status: PredictPositionStatus.LOST,
      claimable: true,
    });

    renderPosition({
      position,
      marketStatus: PredictMarketStatus.CLOSED,
    });

    expect(screen.getByText(/Lost \$100/u)).toBeOnTheScreen();
    expect(
      screen.queryByTestId(
        getPredictCryptoUpDownPositionSelector.claimButton(position.id),
      ),
    ).toBeNull();
  });

  it('falls back to position outcome when market token is unavailable', () => {
    const position = createPosition({
      outcomeId: 'missing-outcome',
      outcomeTokenId: 'missing-token',
      outcome: 'Fallback Up',
    });

    renderPosition({ position });

    expect(screen.getByText('Fallback Up')).toBeOnTheScreen();
  });
});

describe('PredictCryptoUpDownPositions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseIsFocused.mockReturnValue(true);
    mockUseNavigation.mockReturnValue(mockNavigation);
    mockExecuteGuardedAction.mockImplementation((callback) => callback());
    mockUsePredictActionGuard.mockReturnValue({
      executeGuardedAction: mockExecuteGuardedAction,
      isEligible: true,
    });
    mockUsePredictCashOut.mockReturnValue({ onCashOut: mockOnCashOut });
    mockUsePredictClaim.mockReturnValue({
      claim: mockClaim,
      isClaimPending: false,
    });
    mockUsePredictOrderPreview.mockReturnValue({
      preview: null,
      isCalculating: false,
      isLoading: false,
      error: null,
    });
  });

  it('renders nothing when rows are empty', () => {
    renderWithProvider(<PredictCryptoUpDownPositions rows={[]} />, {
      state: initialState,
    });

    expect(
      screen.queryByTestId(PredictCryptoUpDownPositionsSelectorsIDs.SECTION),
    ).toBeNull();
  });

  it('renders header and position rows', () => {
    const openPosition = createPosition({ id: 'position-open' });
    const resolvedPosition = createPosition({
      id: 'position-resolved',
      currentValue: 160,
      claimable: true,
      status: PredictPositionStatus.WON,
    });

    renderWithProvider(
      <PredictCryptoUpDownPositions
        rows={[
          {
            position: openPosition,
            market: createMarket(),
            marketStatus: PredictMarketStatus.OPEN,
          },
          {
            position: resolvedPosition,
            market: createMarket({ status: 'resolved' }),
            marketStatus: PredictMarketStatus.RESOLVED,
          },
        ]}
      />,
      { state: initialState },
    );

    expect(
      screen.getByTestId(PredictCryptoUpDownPositionsSelectorsIDs.SECTION),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(PredictCryptoUpDownPositionsSelectorsIDs.LIST),
    ).toBeOnTheScreen();
    expect(screen.getByText('Your positions')).toBeOnTheScreen();
    expect(
      screen.getByTestId(
        getPredictCryptoUpDownPositionSelector.row(openPosition.id),
      ),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(
        getPredictCryptoUpDownPositionSelector.row(resolvedPosition.id),
      ),
    ).toBeOnTheScreen();
  });
});
