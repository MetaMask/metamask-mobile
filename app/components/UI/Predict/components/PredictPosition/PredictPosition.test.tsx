import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import PredictPosition from './PredictPosition';
import {
  PredictPositionStatus,
  type PredictPosition as PredictPositionType,
} from '../../types';
import { PredictPositionSelectorsIDs } from '../../../../../../e2e/selectors/Predict/Predict.selectors';

const basePosition: PredictPositionType = {
  id: 'pos-1',
  providerId: 'polymarket',
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
  return render(<PredictPosition position={position} onPress={onPress} />);
};

describe('PredictPosition', () => {
  it('renders primary position info', () => {
    renderComponent();

    expect(screen.getByText(basePosition.title)).toBeOnTheScreen();
    expect(
      screen.getByText('$123.45 on Yes · 10 shares at 34¢'),
    ).toBeOnTheScreen();
    expect(screen.getByText('$2,345.67')).toBeOnTheScreen();
    expect(screen.getByText('5%')).toBeOnTheScreen();
  });

  it.each([
    { value: -3.5, expected: '-3%' },
    { value: 0, expected: '0%' },
    { value: 7.5, expected: '8%' },
  ])('formats percentPnl $value as $expected', ({ value, expected }) => {
    renderComponent({ percentPnl: value });

    expect(screen.getByText(expected)).toBeOnTheScreen();
  });

  it('displays plural shares when size is greater than 1', () => {
    renderComponent({
      initialValue: 50,
      outcome: 'No',
      avgPrice: 0.7,
      size: 10,
    });

    expect(
      screen.getByText('$50.00 on No · 10 shares at 70¢'),
    ).toBeOnTheScreen();
  });

  it('displays singular share when size is 1', () => {
    renderComponent({
      initialValue: 50,
      outcome: 'No',
      avgPrice: 0.7,
      size: 1,
    });

    expect(screen.getByText('$50.00 on No · 1 share at 70¢')).toBeOnTheScreen();
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

      expect(screen.getByText('$5,000.99')).toBeOnTheScreen();
    },
  );

  it('formats avgPrice with 1 decimal precision in cents', () => {
    renderComponent({ avgPrice: 0.456, size: 5 });

    expect(
      screen.getByText('$123.45 on Yes · 5 shares at 45.6¢'),
    ).toBeOnTheScreen();
  });

  it('formats avgPrice as whole cents when no decimals needed', () => {
    renderComponent({ avgPrice: 0.5, size: 2 });

    expect(
      screen.getByText('$123.45 on Yes · 2 shares at 50¢'),
    ).toBeOnTheScreen();
  });

  it('formats initialValue without decimals when minimumDecimals is 0', () => {
    renderComponent({ initialValue: 100, size: 3 });

    expect(
      screen.getByText('$100.00 on Yes · 3 shares at 34¢'),
    ).toBeOnTheScreen();
  });

  it('formats size with 2 decimal places', () => {
    renderComponent({ size: 10.5555, initialValue: 200 });

    expect(
      screen.getByText('$200.00 on Yes · 10.56 shares at 34¢'),
    ).toBeOnTheScreen();
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
    render(<PredictPosition position={position} />);

    expect(screen.getByText('Test Market Question?')).toBeOnTheScreen();
    expect(
      screen.getByText('$75.25 on Maybe · 7.50 shares at 62.5¢'),
    ).toBeOnTheScreen();
    expect(screen.getByText('$100.75')).toBeOnTheScreen();
    expect(screen.getByText('16%')).toBeOnTheScreen();
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

      expect(screen.getByText('$2,345.67')).toBeOnTheScreen();
      expect(screen.getByText('5%')).toBeOnTheScreen();
    });

    it('shows initial value line when optimistic', () => {
      renderComponent({ optimistic: true, initialValue: 123.45 });

      expect(
        screen.getByText('$123.45 on Yes · 10 shares at 34¢'),
      ).toBeOnTheScreen();
    });
  });
});
