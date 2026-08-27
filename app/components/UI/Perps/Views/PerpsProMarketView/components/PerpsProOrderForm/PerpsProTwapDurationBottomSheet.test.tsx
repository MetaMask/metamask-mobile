import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { PerpsProOrderFormSelectorsIDs } from '../../../../Perps.testIds';
import type { PerpsProTwapModel } from './PerpsProOrderForm.types';
import PerpsProTwapDurationBottomSheet from './PerpsProTwapDurationBottomSheet';

jest.mock('@metamask/design-system-twrnc-preset', () => {
  const tw = (..._args: unknown[]) => ({});
  tw.style = jest.fn(() => ({}));
  tw.color = jest.fn(() => undefined);
  return {
    useTailwind: () => tw,
    useTheme: () => 'light',
    Theme: { Light: 'light', Dark: 'dark' },
  };
});

const ids = PerpsProOrderFormSelectorsIDs;

const createTwap = (
  overrides: Partial<PerpsProTwapModel> = {},
): PerpsProTwapModel => ({
  days: '',
  hours: '',
  minutes: '5',
  randomize: false,
  onDaysChange: jest.fn(),
  onHoursChange: jest.fn(),
  onMinutesChange: jest.fn(),
  onRandomizeChange: jest.fn(),
  ...overrides,
});

describe('PerpsProTwapDurationBottomSheet', () => {
  it('renders the existing duration inputs inside the sheet', () => {
    render(
      <PerpsProTwapDurationBottomSheet
        twap={createTwap()}
        onClose={jest.fn()}
      />,
    );

    expect(screen.getByTestId(ids.TWAP_DURATION_SHEET)).toBeOnTheScreen();
    expect(screen.getByTestId(ids.TWAP_DAYS)).toBeOnTheScreen();
    expect(screen.getByTestId(ids.TWAP_HOURS)).toBeOnTheScreen();
    expect(screen.getByTestId(ids.TWAP_MINUTES)).toBeOnTheScreen();
  });

  it('forwards day, hour, and minute edits to the TWAP model', () => {
    const onDaysChange = jest.fn();
    const onHoursChange = jest.fn();
    const onMinutesChange = jest.fn();
    render(
      <PerpsProTwapDurationBottomSheet
        twap={createTwap({
          onDaysChange,
          onHoursChange,
          onMinutesChange,
        })}
        onClose={jest.fn()}
      />,
    );

    fireEvent.changeText(screen.getByTestId(ids.TWAP_DAYS), '1');
    fireEvent.changeText(screen.getByTestId(ids.TWAP_HOURS), '2');
    fireEvent.changeText(screen.getByTestId(ids.TWAP_MINUTES), '30');

    expect(onDaysChange).toHaveBeenCalledWith('1');
    expect(onHoursChange).toHaveBeenCalledWith('2');
    expect(onMinutesChange).toHaveBeenCalledWith('30');
  });

  it('closes from the standard sheet header affordance', () => {
    const onClose = jest.fn();
    render(
      <PerpsProTwapDurationBottomSheet twap={createTwap()} onClose={onClose} />,
    );

    fireEvent.press(screen.getByTestId(ids.TWAP_DURATION_SHEET_CLOSE));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders nothing while hidden', () => {
    render(
      <PerpsProTwapDurationBottomSheet
        isVisible={false}
        twap={createTwap()}
        onClose={jest.fn()}
      />,
    );

    expect(screen.queryByTestId(ids.TWAP_DURATION_SHEET)).not.toBeOnTheScreen();
  });
});
