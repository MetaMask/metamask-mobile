import { fireEvent, render, screen } from '@testing-library/react-native';
import type { TwapOrder } from '@metamask/perps-controller';
import React from 'react';
import { PerpsProMarketViewSelectorsIDs } from '../../../Perps.testIds';
import PerpsProTwapTerminateSheet from './PerpsProTwapTerminateSheet';

const twapOrder: TwapOrder = {
  orderId: 'twap-1',
  symbol: 'BTC',
  side: 'buy',
  size: '10',
  executedSize: '4',
  remainingSize: '6',
  executedNotional: '400',
  fillProgressBps: 4000,
  timeProgressBps: 5000,
  elapsedTimeMilliseconds: 600_000,
  durationMinutes: 30,
  randomize: false,
  reduceOnly: false,
  status: 'active',
  startedAt: 1_700_000_000_000,
  lastUpdated: 1_700_000_600_000,
  fills: [],
};

const ids = PerpsProMarketViewSelectorsIDs;

describe('PerpsProTwapTerminateSheet', () => {
  it('names the market being terminated', () => {
    // Arrange / Act
    render(
      <PerpsProTwapTerminateSheet
        twapOrder={twapOrder}
        onClose={jest.fn()}
        onConfirm={jest.fn()}
      />,
    );

    // Assert
    expect(screen.getByText(/BTC/u)).toBeOnTheScreen();
  });

  it('states that filled size survives the termination', () => {
    // Arrange / Act
    render(
      <PerpsProTwapTerminateSheet
        twapOrder={twapOrder}
        onClose={jest.fn()}
        onConfirm={jest.fn()}
      />,
    );

    // Assert: the user must not be surprised by leftover exposure
    expect(screen.getByText(/stays as a position/u)).toBeOnTheScreen();
  });

  it.each(['buy', 'sell'] as const)(
    'states that filled reduce-only %s size already reduced the position',
    (side) => {
      // Arrange / Act
      render(
        <PerpsProTwapTerminateSheet
          twapOrder={{ ...twapOrder, reduceOnly: true, side }}
          onClose={jest.fn()}
          onConfirm={jest.fn()}
        />,
      );

      // Assert
      expect(
        screen.getByText(/has reduced your existing position/u),
      ).toBeOnTheScreen();
      expect(screen.queryByText(/stays as a position/u)).toBeNull();
    },
  );

  it('passes the schedule to the confirm handler', () => {
    // Arrange
    const onConfirm = jest.fn();
    render(
      <PerpsProTwapTerminateSheet
        twapOrder={twapOrder}
        onClose={jest.fn()}
        onConfirm={onConfirm}
      />,
    );

    // Act
    fireEvent.press(screen.getByTestId(ids.TWAP_TERMINATE_CONFIRM));

    // Assert
    expect(onConfirm).toHaveBeenCalledWith(twapOrder);
  });

  it('closes without terminating when cancelled', () => {
    // Arrange
    const onClose = jest.fn();
    const onConfirm = jest.fn();
    render(
      <PerpsProTwapTerminateSheet
        twapOrder={twapOrder}
        onClose={onClose}
        onConfirm={onConfirm}
      />,
    );

    // Act
    fireEvent.press(screen.getByTestId(ids.TWAP_TERMINATE_CANCEL));

    // Assert
    expect(onClose).toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('blocks a second confirm while terminating', () => {
    // Arrange
    const onConfirm = jest.fn();
    render(
      <PerpsProTwapTerminateSheet
        twapOrder={twapOrder}
        onClose={jest.fn()}
        onConfirm={onConfirm}
        isTerminating
      />,
    );

    // Act
    fireEvent.press(screen.getByTestId(ids.TWAP_TERMINATE_CONFIRM));

    // Assert
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
