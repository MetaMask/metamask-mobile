import React from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../../../util/test/renderWithProvider';
import PerpsPositionRow, { buildTpSlLabel } from './PerpsPositionRow';
import type { Position } from '@metamask/perps-controller';

jest.mock('../../../../../../UI/Perps/components/PerpsTokenLogo', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ symbol }: { symbol: string }) => (
      <View testID={`token-logo-${symbol}`} />
    ),
  };
});

jest.mock(
  '../../../../../../UI/Perps/components/PerpsLeverage/PerpsLeverage',
  () => {
    const { Text } = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: ({ maxLeverage }: { maxLeverage: string }) => (
        <Text>{maxLeverage}</Text>
      ),
    };
  },
);

const makePosition = (overrides?: Partial<Position>): Position => ({
  symbol: 'BTC',
  size: '0.01',
  entryPrice: '100000',
  positionValue: '1000',
  unrealizedPnl: '50',
  marginUsed: '100',
  leverage: { type: 'isolated', value: 10 },
  liquidationPrice: '90000',
  maxLeverage: 50,
  returnOnEquity: '0.5',
  cumulativeFunding: { allTime: '0', sinceOpen: '0', sinceChange: '0' },
  takeProfitPrice: undefined,
  stopLossPrice: undefined,
  takeProfitCount: 0,
  stopLossCount: 0,
  ...overrides,
});

describe('buildTpSlLabel', () => {
  it('returns null when neither TP nor SL is set', () => {
    const position = makePosition();

    const result = buildTpSlLabel(position);

    expect(result).toBeNull();
  });

  it('returns TP label when only take profit is set', () => {
    const position = makePosition({
      entryPrice: '1000',
      takeProfitPrice: '1200',
    });

    const result = buildTpSlLabel(position);

    expect(result).toBe('TP 20%');
  });

  it('returns SL label when only stop loss is set', () => {
    const position = makePosition({
      entryPrice: '1000',
      stopLossPrice: '900',
    });

    const result = buildTpSlLabel(position);

    expect(result).toBe('SL 10%');
  });

  it('returns both TP and SL when both are set', () => {
    const position = makePosition({
      entryPrice: '1000',
      takeProfitPrice: '1500',
      stopLossPrice: '800',
    });

    const result = buildTpSlLabel(position);

    expect(result).toBe('TP 50%, SL 20%');
  });

  it('uses custom labels when provided', () => {
    const position = makePosition({
      entryPrice: '1000',
      takeProfitPrice: '1100',
      stopLossPrice: '950',
    });

    const result = buildTpSlLabel(position, 'Take', 'Stop');

    expect(result).toBe('Take 10%, Stop 5%');
  });

  it('returns null when entry price is zero', () => {
    const position = makePosition({ entryPrice: '0' });

    const result = buildTpSlLabel(position);

    expect(result).toBeNull();
  });

  it('returns null when entry price is negative', () => {
    const position = makePosition({ entryPrice: '-100' });

    const result = buildTpSlLabel(position);

    expect(result).toBeNull();
  });

  it('uses absolute percentage for short positions (SL above entry)', () => {
    const position = makePosition({
      size: '-1',
      entryPrice: '1000',
      stopLossPrice: '1100',
    });

    const result = buildTpSlLabel(position);

    expect(result).toBe('SL 10%');
  });
});

describe('PerpsPositionRow', () => {
  it('renders long position with correct direction and symbol', () => {
    const position = makePosition({ symbol: 'ETH', size: '1' });

    renderWithProvider(<PerpsPositionRow position={position} />);

    expect(screen.getByText('Long ETH')).toBeOnTheScreen();
  });

  it('renders short position with correct direction and symbol', () => {
    const position = makePosition({ symbol: 'BTC', size: '-0.5' });

    renderWithProvider(<PerpsPositionRow position={position} />);

    expect(screen.getByText('Short BTC')).toBeOnTheScreen();
  });

  it('renders leverage badge with direction', () => {
    const position = makePosition({
      leverage: { type: 'isolated', value: 20 },
      size: '1',
    });

    renderWithProvider(<PerpsPositionRow position={position} />);

    expect(screen.getByText('20X long')).toBeOnTheScreen();
  });

  it('renders short leverage label for short positions', () => {
    const position = makePosition({
      leverage: { type: 'isolated', value: 5 },
      size: '-1',
    });

    renderWithProvider(<PerpsPositionRow position={position} />);

    expect(screen.getByText('5X short')).toBeOnTheScreen();
  });

  it('renders "No TP/SL" when neither is configured', () => {
    const position = makePosition();

    renderWithProvider(<PerpsPositionRow position={position} />);

    expect(screen.getByText('No TP/SL')).toBeOnTheScreen();
  });

  it('renders TP/SL label when configured', () => {
    const position = makePosition({
      entryPrice: '1000',
      takeProfitPrice: '1200',
      stopLossPrice: '800',
    });

    renderWithProvider(<PerpsPositionRow position={position} />);

    expect(screen.getByText('TP 20%, SL 20%')).toBeOnTheScreen();
  });

  it('renders positive ROE with success color', () => {
    const position = makePosition({ returnOnEquity: '0.15' });

    renderWithProvider(<PerpsPositionRow position={position} />);

    expect(screen.getByText('+15.0%')).toBeOnTheScreen();
  });

  it('renders negative ROE with error color', () => {
    const position = makePosition({ returnOnEquity: '-0.05' });

    renderWithProvider(<PerpsPositionRow position={position} />);

    expect(screen.getByText('-5.0%')).toBeOnTheScreen();
  });

  it('renders token logo with correct symbol', () => {
    const position = makePosition({ symbol: 'SOL' });

    renderWithProvider(<PerpsPositionRow position={position} />);

    expect(screen.getByTestId('token-logo-SOL')).toBeOnTheScreen();
  });

  it('calls onPress when row is pressed', () => {
    const onPress = jest.fn();
    const position = makePosition();

    renderWithProvider(
      <PerpsPositionRow position={position} onPress={onPress} />,
    );

    fireEvent.press(screen.getByTestId('perps-position-row-BTC'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('uses custom testID when provided', () => {
    const position = makePosition();

    renderWithProvider(
      <PerpsPositionRow position={position} testID="custom-row" />,
    );

    expect(screen.getByTestId('custom-row')).toBeOnTheScreen();
  });

  it('uses default testID based on symbol', () => {
    const position = makePosition({ symbol: 'DOGE' });

    renderWithProvider(<PerpsPositionRow position={position} />);

    expect(screen.getByTestId('perps-position-row-DOGE')).toBeOnTheScreen();
  });

  it('handles zero ROE correctly', () => {
    const position = makePosition({ returnOnEquity: '0' });

    renderWithProvider(<PerpsPositionRow position={position} />);

    expect(screen.getByText('+0.0%')).toBeOnTheScreen();
  });

  it('handles missing returnOnEquity gracefully', () => {
    const position = makePosition({
      returnOnEquity: undefined as unknown as string,
    });

    renderWithProvider(<PerpsPositionRow position={position} />);

    expect(screen.getByText('+0.0%')).toBeOnTheScreen();
  });
});
