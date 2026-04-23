import React, { type ReactNode } from 'react';
import { renderHook, act } from '@testing-library/react-hooks';
import {
  ToastContext,
  ToastVariants,
} from '../../../../component-library/components/Toast';
import {
  PredictPositionStatus,
  Recurrence,
  type PredictMarket,
  type PredictPosition,
} from '../types';
import { PredictEventValues } from '../constants/eventNames';
import { usePredictCashOut } from './usePredictCashOut';

import { POLYMARKET_PROVIDER_ID } from '../providers/polymarket/constants';

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
}));

const mockExecuteGuardedAction = jest.fn();
jest.mock('./usePredictActionGuard', () => ({
  usePredictActionGuard: () => ({
    executeGuardedAction: mockExecuteGuardedAction,
    isEligible: true,
  }),
}));

const mockOpenSellSheet = jest.fn();
jest.mock('../contexts', () => ({
  usePredictPreviewSheet: () => ({
    openBuySheet: jest.fn(),
    openSellSheet: mockOpenSellSheet,
  }),
}));

const mockLoggerError = jest.fn();
jest.mock('../../../../util/Logger', () => ({
  error: (...args: unknown[]) => mockLoggerError(...args),
}));

const mockShowToast = jest.fn();
const toastRef = { current: { showToast: mockShowToast } };

const ToastWrapper = ({ children }: { children: ReactNode }) =>
  React.createElement(
    ToastContext.Provider,
    { value: { toastRef } as never },
    children,
  );

const createMarket = (
  overrides: Partial<PredictMarket> = {},
): PredictMarket => ({
  id: 'market-1',
  providerId: POLYMARKET_PROVIDER_ID,
  slug: 'will-btc-hit-100k',
  title: 'Will BTC hit 100k?',
  description: 'Test market',
  endDate: '2025-12-31T00:00:00Z',
  image: 'https://example.com/market.png',
  status: 'open',
  recurrence: Recurrence.NONE,
  category: 'crypto',
  tags: [],
  outcomes: [
    {
      id: 'outcome-1',
      providerId: POLYMARKET_PROVIDER_ID,
      marketId: 'market-1',
      title: 'Yes',
      description: 'Yes outcome',
      image: 'https://example.com/yes.png',
      status: 'open',
      tokens: [{ id: '0', title: 'Yes', price: 0.67 }],
      volume: 1000,
      groupItemTitle: 'Yes',
    },
    {
      id: 'outcome-2',
      providerId: POLYMARKET_PROVIDER_ID,
      marketId: 'market-1',
      title: 'No',
      description: 'No outcome',
      image: 'https://example.com/no.png',
      status: 'open',
      tokens: [{ id: '1', title: 'No', price: 0.33 }],
      volume: 500,
      groupItemTitle: 'No',
    },
  ],
  liquidity: 10000,
  volume: 50000,
  ...overrides,
});

const createPosition = (
  overrides: Partial<PredictPosition> = {},
): PredictPosition => ({
  id: 'pos-1',
  providerId: POLYMARKET_PROVIDER_ID,
  marketId: 'market-1',
  outcomeId: 'outcome-1',
  outcomeTokenId: '0',
  icon: 'https://example.com/icon.png',
  title: 'Will BTC hit 100k?',
  outcome: 'Yes',
  outcomeIndex: 0,
  amount: 10,
  price: 0.67,
  status: PredictPositionStatus.OPEN,
  size: 50,
  cashPnl: 15.5,
  percentPnl: 5.25,
  initialValue: 100,
  currentValue: 115.5,
  avgPrice: 0.5,
  claimable: false,
  endDate: '2025-12-31T00:00:00Z',
  ...overrides,
});

describe('usePredictCashOut', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockExecuteGuardedAction.mockImplementation((callback) => callback());
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('calls executeGuardedAction with CASHOUT attemptedAction', () => {
    const market = createMarket();
    const position = createPosition();
    const { result } = renderHook(
      () => usePredictCashOut({ market, callerName: 'TestCaller' }),
      { wrapper: ToastWrapper },
    );

    act(() => {
      result.current.onCashOut(position);
    });

    expect(mockExecuteGuardedAction).toHaveBeenCalledWith(
      expect.any(Function),
      { attemptedAction: PredictEventValues.ATTEMPTED_ACTION.CASHOUT },
    );
  });

  it('opens sell sheet with matching outcome, market, and position', () => {
    const market = createMarket();
    const position = createPosition({ outcomeId: 'outcome-1' });
    const { result } = renderHook(
      () => usePredictCashOut({ market, callerName: 'TestCaller' }),
      { wrapper: ToastWrapper },
    );

    act(() => {
      result.current.onCashOut(position);
    });

    expect(mockOpenSellSheet).toHaveBeenCalledWith({
      market,
      position,
      outcome: market.outcomes[0],
      entryPoint: PredictEventValues.ENTRY_POINT.PREDICT_MARKET_DETAILS,
    });
  });

  it('finds correct outcome when position references second outcome', () => {
    const market = createMarket();
    const position = createPosition({ outcomeId: 'outcome-2' });
    const { result } = renderHook(
      () => usePredictCashOut({ market, callerName: 'TestCaller' }),
      { wrapper: ToastWrapper },
    );

    act(() => {
      result.current.onCashOut(position);
    });

    expect(mockOpenSellSheet).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: market.outcomes[1] }),
    );
  });

  it('logs error with callerName when outcome is not found', () => {
    const market = createMarket();
    const position = createPosition({ outcomeId: 'non-existent' });
    const { result } = renderHook(
      () => usePredictCashOut({ market, callerName: 'MyComponent' }),
      { wrapper: ToastWrapper },
    );

    act(() => {
      result.current.onCashOut(position);
    });

    expect(mockOpenSellSheet).not.toHaveBeenCalled();
    expect(mockLoggerError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        component: 'MyComponent',
        positionId: 'pos-1',
        outcomeId: 'non-existent',
      }),
    );
  });

  it('shows toast when outcome is not found', () => {
    const market = createMarket();
    const position = createPosition({ outcomeId: 'non-existent' });
    const { result } = renderHook(
      () => usePredictCashOut({ market, callerName: 'TestCaller' }),
      { wrapper: ToastWrapper },
    );

    act(() => {
      result.current.onCashOut(position);
    });

    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: ToastVariants.Icon,
        hasNoTimeout: false,
        labelOptions: expect.arrayContaining([
          expect.objectContaining({ isBold: true }),
        ]),
      }),
    );
  });

  it('does not call openSellSheet when outcome is not found', () => {
    const market = createMarket();
    const position = createPosition({ outcomeId: 'non-existent' });
    const { result } = renderHook(
      () => usePredictCashOut({ market, callerName: 'TestCaller' }),
      { wrapper: ToastWrapper },
    );

    act(() => {
      result.current.onCashOut(position);
    });

    expect(mockOpenSellSheet).not.toHaveBeenCalled();
  });

  it('preserves callerName across multiple onCashOut calls', () => {
    const market = createMarket();
    const { result } = renderHook(
      () => usePredictCashOut({ market, callerName: 'PredictPicks' }),
      { wrapper: ToastWrapper },
    );

    act(() => {
      result.current.onCashOut(
        createPosition({ id: 'pos-a', outcomeId: 'non-existent' }),
      );
    });

    act(() => {
      result.current.onCashOut(
        createPosition({ id: 'pos-b', outcomeId: 'non-existent' }),
      );
    });

    expect(mockLoggerError).toHaveBeenCalledTimes(2);
    expect(mockLoggerError).toHaveBeenNthCalledWith(
      1,
      expect.any(Error),
      expect.objectContaining({
        component: 'PredictPicks',
        positionId: 'pos-a',
      }),
    );
    expect(mockLoggerError).toHaveBeenNthCalledWith(
      2,
      expect.any(Error),
      expect.objectContaining({
        component: 'PredictPicks',
        positionId: 'pos-b',
      }),
    );
  });
});
