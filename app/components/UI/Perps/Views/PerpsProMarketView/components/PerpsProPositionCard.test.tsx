import { fireEvent, render, screen } from '@testing-library/react-native';
import type { Position } from '@metamask/perps-controller';
import React from 'react';
import { useSelector } from 'react-redux';
import { PerpsProMarketViewSelectorsIDs } from '../../../Perps.testIds';
import PerpsProPositionCard from './PerpsProPositionCard';

jest.mock('../../../components/PerpsTokenLogo', () => 'PerpsTokenLogo');

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(() => false),
}));

describe('PerpsProPositionCard', () => {
  const DOTS_SHORT = '•'.repeat(6);
  const position: Position = {
    symbol: 'ETH',
    size: '1.5',
    entryPrice: '2900',
    positionValue: '4350',
    unrealizedPnl: '150',
    marginUsed: '1450',
    leverage: { type: 'isolated', value: 3 },
    liquidationPrice: '2500',
    maxLeverage: 50,
    returnOnEquity: '0.103',
    cumulativeFunding: { allTime: '0', sinceOpen: '1.25', sinceChange: '0' },
    takeProfitPrice: '3500',
    stopLossPrice: '2000',
    takeProfitCount: 1,
    stopLossCount: 1,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useSelector as jest.Mock).mockReturnValue(false);
  });

  it('renders position summary metrics and action controls', () => {
    render(<PerpsProPositionCard position={position} />);

    expect(screen.getByText('ETH')).toBeOnTheScreen();
    expect(screen.getByText('3x Long')).toBeOnTheScreen();
    expect(screen.getByText(/1\.5 ETH/)).toBeOnTheScreen();
    expect(screen.getByText(/^\+\$150/)).toBeOnTheScreen();
    expect(screen.getByText('Close')).toBeOnTheScreen();
    expect(screen.getByText('Reverse')).toBeOnTheScreen();
    expect(screen.getByText('Share')).toBeOnTheScreen();
  });

  it('derives mark price and notional from positionValue', () => {
    render(
      <PerpsProPositionCard
        position={{
          ...position,
          // Live-enriched notional at mark $3,000 → mark display + header value
          positionValue: '4500',
          size: '1.5',
        }}
      />,
    );

    expect(screen.getByText(/1\.5 ETH • \$4,500/)).toBeOnTheScreen();
    expect(screen.getByText('$3,000')).toBeOnTheScreen();
  });

  it('renders TP/SL edit control when handler is provided', () => {
    const onEditTpSl = jest.fn();

    render(
      <PerpsProPositionCard position={position} onEditTpSl={onEditTpSl} />,
    );

    expect(
      screen.getByTestId(PerpsProMarketViewSelectorsIDs.POSITION_EDIT_TPSL),
    ).toBeOnTheScreen();
  });

  it('renders margin edit control for isolated positions when handler is provided', () => {
    const onEditMargin = jest.fn();

    render(
      <PerpsProPositionCard position={position} onEditMargin={onEditMargin} />,
    );

    expect(
      screen.getByTestId(PerpsProMarketViewSelectorsIDs.POSITION_EDIT_MARGIN),
    ).toBeOnTheScreen();
  });

  it('invokes edit TP/SL when the TP/SL value text is pressed', () => {
    const onEditTpSl = jest.fn();

    render(
      <PerpsProPositionCard position={position} onEditTpSl={onEditTpSl} />,
    );

    fireEvent.press(screen.getByText(/\$3,500.*\$2,000/));

    expect(onEditTpSl).toHaveBeenCalledWith(position);
  });

  it('invokes the market switch handler when the card is pressed', () => {
    const onPress = jest.fn();

    render(<PerpsProPositionCard position={position} onPress={onPress} />);

    fireEvent.press(
      screen.getByTestId(PerpsProMarketViewSelectorsIDs.POSITION_ROW),
    );

    expect(onPress).toHaveBeenCalledWith(position);
  });

  it('exposes the market switch as a labelled action for screen readers', () => {
    render(<PerpsProPositionCard position={position} onPress={jest.fn()} />);

    expect(screen.getByLabelText('Switch to the ETH market')).toBeOnTheScreen();
  });

  it('keeps action buttons scoped to their own handler when the card is pressable', () => {
    const onPress = jest.fn();
    const onClose = jest.fn();

    render(
      <PerpsProPositionCard
        position={position}
        onPress={onPress}
        onClose={onClose}
      />,
    );

    fireEvent.press(
      screen.getByTestId(PerpsProMarketViewSelectorsIDs.POSITION_CLOSE),
    );

    expect(onClose).toHaveBeenCalledWith(position);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('invokes edit margin when the margin value text is pressed', () => {
    const onEditMargin = jest.fn();

    render(
      <PerpsProPositionCard position={position} onEditMargin={onEditMargin} />,
    );

    fireEvent.press(screen.getByText('$1,450'));

    expect(onEditMargin).toHaveBeenCalledWith(position);
  });

  it('hides size, value, PnL, and key figures when privacy mode is enabled', () => {
    (useSelector as jest.Mock).mockReturnValue(true);

    render(<PerpsProPositionCard position={position} />);

    expect(screen.getByText('ETH')).toBeOnTheScreen();
    expect(screen.getByText('3x Long')).toBeOnTheScreen();
    expect(screen.queryByText(/1\.5 ETH/)).toBeNull();
    expect(screen.queryByText(/^\+\$150/)).toBeNull();
    expect(screen.queryByText('$2,900')).toBeNull();
    expect(screen.getAllByText(DOTS_SHORT).length).toBeGreaterThanOrEqual(3);
  });
});
