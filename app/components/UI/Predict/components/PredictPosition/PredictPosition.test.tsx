import React from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import PredictPosition from './PredictPosition';
import {
  PredictPositionStatus,
  type PredictPosition as PredictPositionType,
} from '../../types';
import { PredictPositionSelectorsIDs } from '../../Predict.testIds';

import { POLYMARKET_PROVIDER_ID } from '../../providers/polymarket/constants';

jest.mock('../../selectors/featureFlags', () => {
  const feeCollection = {
    enabled: true,
    metamaskFee: 0.02,
    providerFee: 0.02,
  };

  return {
    ...jest.requireActual('../../selectors/featureFlags'),
    selectPredictFeeCollectionFlag: jest.fn(() => feeCollection),
  };
});
jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string, vars?: Record<string, string | number>) => {
    if (key === 'predict.position_info' && vars) {
      return `${vars.initialValue} on ${vars.outcome} to win ${vars.shares}`;
    }
    return key;
  }),
}));

const basePosition: PredictPositionType = {
  id: 'pos-1',
  providerId: POLYMARKET_PROVIDER_ID,
  marketId: 'market-1',
  outcomeId: 'outcome-1',
  outcomeTokenId: '0',
  icon: 'https://example.com/icon.png',
  title: 'Will ETF be approved?',
  outcome: 'Yes',
  outcomeIndex: 0,
  amount: 10,
  price: 0.67,
  status: PredictPositionStatus.OPEN,
  size: 10,
  cashPnl: 100,
  percentPnl: 5.25,
  initialValue: 123.45,
  currentValue: 2345.67,
  avgPrice: 0.34,
  claimable: false,
  endDate: '2025-12-31T00:00:00Z',
};

const renderComponent = (
  overrides?: Partial<PredictPositionType>,
  onPress?: (position: PredictPositionType) => void,
) => {
  const position: PredictPositionType = {
    ...basePosition,
    ...overrides,
  } as PredictPositionType;
  return renderWithProvider(
    <PredictPosition
      position={position}
      onPress={onPress}
      privacyMode={false}
    />,
    { state: { engine: { backgroundState } } },
  );
};

describe('PredictPosition', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders primary position info', () => {
    renderComponent();

    expect(screen.getByText(basePosition.title)).toBeOnTheScreen();
    expect(screen.getByText('$123.45 on Yes to win $10')).toBeOnTheScreen();
    expect(screen.getByText('$2,251.84')).toBeOnTheScreen();
    expect(screen.getByText('1724.09%')).toBeOnTheScreen();
  });

  it.each([
    { currentValue: 50, initialValue: 100, expected: '-52%' },
    { currentValue: 100, initialValue: 96, expected: '0%' },
    { currentValue: 100, initialValue: 50, expected: '92%' },
  ])(
    'formats derived percent PnL from net value for currentValue $currentValue',
    ({ currentValue, initialValue, expected }) => {
      renderComponent({ currentValue, initialValue });

      expect(screen.getByText(expected)).toBeOnTheScreen();
    },
  );

  it('displays plural shares when size is greater than 1', () => {
    renderComponent({
      initialValue: 50,
      outcome: 'No',
      avgPrice: 0.7,
      size: 10,
    });

    expect(screen.getByText('$50 on No to win $10')).toBeOnTheScreen();
  });

  it('displays singular share when size is 1', () => {
    renderComponent({
      initialValue: 50,
      outcome: 'No',
      avgPrice: 0.7,
      size: 1,
    });

    expect(screen.getByText('$50 on No to win $1')).toBeOnTheScreen();
  });

  it('renders icon image with correct URI', () => {
    const iconUrl = 'https://example.com/icon.png';
    renderComponent({ icon: iconUrl });

    const image = screen.getByTestId(
      PredictPositionSelectorsIDs.CURRENT_POSITION_CARD,
    );
    expect(image).toBeOnTheScreen();
  });

  it('calls onPress handler when pressed', () => {
    const mockOnPress = jest.fn();
    renderComponent({}, mockOnPress);

    fireEvent.press(
      screen.getByTestId(PredictPositionSelectorsIDs.CURRENT_POSITION_CARD),
    );

    expect(mockOnPress).toHaveBeenCalledTimes(1);
    expect(mockOnPress).toHaveBeenCalledWith(basePosition);
  });

  it('calls onPress with overridden position data', () => {
    const mockOnPress = jest.fn();
    const customPosition = {
      initialValue: 999,
      outcome: 'Maybe',
      size: 5,
    };
    renderComponent(customPosition, mockOnPress);

    fireEvent.press(
      screen.getByTestId(PredictPositionSelectorsIDs.CURRENT_POSITION_CARD),
    );

    expect(mockOnPress).toHaveBeenCalledWith({
      ...basePosition,
      ...customPosition,
    });
  });

  it('renders without onPress handler', () => {
    renderComponent();

    const card = screen.getByTestId(
      PredictPositionSelectorsIDs.CURRENT_POSITION_CARD,
    );

    expect(card).toBeOnTheScreen();
  });

  it.each([
    { value: 10.5, description: 'positive' },
    { value: -5.3, description: 'negative' },
    { value: 0, description: 'zero' },
  ])(
    'renders currentValue correctly for $description percentPnl',
    ({ value }) => {
      renderComponent({ percentPnl: value, currentValue: 5000.99 });

      expect(screen.getByText('$4,800.95')).toBeOnTheScreen();
    },
  );

  it('formats avgPrice with 1 decimal precision in cents', () => {
    renderComponent({ avgPrice: 0.456, size: 5 });

    expect(screen.getByText('$123.45 on Yes to win $5')).toBeOnTheScreen();
  });

  it('formats avgPrice as whole cents when no decimals needed', () => {
    renderComponent({ avgPrice: 0.5, size: 2 });

    expect(screen.getByText('$123.45 on Yes to win $2')).toBeOnTheScreen();
  });

  it('formats initialValue without decimals when minimumDecimals is 0', () => {
    renderComponent({ initialValue: 100, size: 3 });

    expect(screen.getByText('$100 on Yes to win $3')).toBeOnTheScreen();
  });

  it('formats size with 2 decimal places', () => {
    renderComponent({ size: 10.5555, initialValue: 200 });

    expect(screen.getByText('$200 on Yes to win $10.56')).toBeOnTheScreen();
  });

  it('renders all position properties correctly', () => {
    const position: PredictPositionType = {
      id: 'test-id',
      providerId: 'test-provider',
      marketId: 'test-market',
      outcomeId: 'test-outcome',
      outcomeTokenId: '1',
      icon: 'https://test.com/icon.png',
      title: 'Test Market Question?',
      outcome: 'Maybe',
      outcomeIndex: 1,
      amount: 50,
      price: 0.8,
      status: PredictPositionStatus.WON,
      size: 7.5,
      cashPnl: 25.5,
      percentPnl: 15.75,
      initialValue: 75.25,
      currentValue: 100.75,
      avgPrice: 0.625,
      claimable: true,
      endDate: '2026-01-01T00:00:00Z',
    };
    renderWithProvider(
      <PredictPosition position={position} privacyMode={false} />,
      { state: { engine: { backgroundState } } },
    );

    expect(screen.getByText('Test Market Question?')).toBeOnTheScreen();
    expect(screen.getByText('$75.25 on Maybe to win $7.50')).toBeOnTheScreen();
    expect(screen.getByText('$96.72')).toBeOnTheScreen();
    expect(screen.getByText('28.53%')).toBeOnTheScreen();
  });

  describe('optimistic updates UI', () => {
    it('hides current value when position is optimistic', () => {
      renderComponent({ optimistic: true, currentValue: 2345.67 });

      expect(screen.queryByText('$2,345.67')).toBeNull();
    });

    it('hides percent PnL when position is optimistic', () => {
      renderComponent({ optimistic: true, percentPnl: 5.25 });

      expect(screen.queryByText('+5.25%')).toBeNull();
    });

    it('shows actual values when position is not optimistic', () => {
      renderComponent({ optimistic: false });

      expect(screen.getByText('$2,251.84')).toBeOnTheScreen();
      expect(screen.getByText('1724.09%')).toBeOnTheScreen();
    });

    it('shows initial value line when optimistic', () => {
      renderComponent({ optimistic: true, initialValue: 123.45 });

      expect(screen.getByText('$123.45 on Yes to win $10')).toBeOnTheScreen();
    });
  });

  describe('privacy mode', () => {
    it('hides monetary values when privacy mode is enabled', () => {
      const { queryByText, getByText, queryAllByText } = renderWithProvider(
        <PredictPosition position={basePosition} privacyMode />,
        { state: { engine: { backgroundState } } },
      );

      expect(queryByText('$2,251.84')).toBeNull();
      expect(queryByText('1724.09%')).toBeNull();
      expect(queryByText('$123.45 on Yes to win $10')).toBeNull();
      expect(getByText(basePosition.title)).toBeOnTheScreen();
      expect(queryAllByText(/•+/).length).toBeGreaterThan(0);
    });

    it('displays monetary values when privacy mode is disabled', () => {
      renderComponent();

      expect(screen.getByText('$123.45 on Yes to win $10')).toBeOnTheScreen();
      expect(screen.getByText('$2,251.84')).toBeOnTheScreen();
      expect(screen.getByText('1724.09%')).toBeOnTheScreen();
    });
  });
});
