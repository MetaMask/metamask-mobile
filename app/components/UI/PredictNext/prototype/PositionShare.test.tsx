import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { PALETTE } from './palette';
import { PositionOpened, shareCode } from './PositionShare';

jest.mock('./kaching', () => ({
  ConfirmationChime: () => null,
}));
jest.mock('../../../../util/deviceCapability', () => ({
  getHardwareTier: () => 'LOW',
}));

const model = {
  label: 'Panthers',
  eventTitle: 'Panthers vs. Eagles',
  color: PALETTE.panthers,
  cost: 10,
  payout: 9.02,
  code: '8F3A21',
  contracts: 22,
  avgPrice: 41,
};

describe('PositionOpened', () => {
  it('shows the payout headline above the share card', () => {
    render(<PositionOpened model={model} onDone={jest.fn()} />);

    expect(screen.getByText('You cashed out')).toBeOnTheScreen();
    expect(screen.getByText('-$0.98 on Panthers')).toBeOnTheScreen();
  });

  it('shows the closed-position share card and closes on Next', () => {
    const onDone = jest.fn();
    render(<PositionOpened model={model} onDone={onDone} />);

    expect(screen.getByText('@you')).toBeOnTheScreen();
    expect(screen.getByText('Panthers vs. Eagles')).toBeOnTheScreen();
    expect(screen.getByText('Code: 8F3A21')).toBeOnTheScreen();
    expect(screen.getByText('COST')).toBeOnTheScreen();
    expect(screen.getByText('PAID OUT')).toBeOnTheScreen();
    expect(screen.getByText('$10.00')).toBeOnTheScreen();
    expect(screen.getAllByText('$9.02')).toHaveLength(2);
    expect(screen.queryByText('22')).toBeNull();
    expect(screen.queryByText('41¢')).toBeNull();
    expect(screen.getByText('CLOSED POSITION')).toBeOnTheScreen();

    fireEvent.press(screen.getByTestId('position-share-next'));
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('builds a stable six-character code', () => {
    expect(shareCode('nfl-panthers', 62)).toMatch(/^[0-9A-F]{6}$/);
    expect(shareCode('nfl-panthers', 62)).toBe(shareCode('nfl-panthers', 62));
  });
});
