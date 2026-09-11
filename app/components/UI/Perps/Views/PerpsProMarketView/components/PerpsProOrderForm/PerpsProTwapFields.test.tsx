import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { PerpsProOrderFormSelectorsIDs } from '../../../../Perps.testIds';
import PerpsProTwapFields, {
  formatCompactTwapDuration,
  formatTwapRuntimeSummary,
} from './PerpsProTwapFields';
import type { PerpsProTwapModel } from './PerpsProOrderForm.types';

const buildTwapModel = (
  overrides: Partial<PerpsProTwapModel> = {},
): PerpsProTwapModel => ({
  days: '0',
  hours: '0',
  minutes: '30',
  randomize: false,
  durationError: undefined,
  onDaysChange: jest.fn(),
  onHoursChange: jest.fn(),
  onMinutesChange: jest.fn(),
  onRandomizeChange: jest.fn(),
  onRuntimeInfoPress: jest.fn(),
  ...overrides,
});

const ids = PerpsProOrderFormSelectorsIDs;

describe('formatCompactTwapDuration', () => {
  it('omits days when the schedule is under a day', () => {
    // Arrange / Act
    const result = formatCompactTwapDuration({
      days: '0',
      hours: '1',
      minutes: '30',
    });

    // Assert
    expect(result).toBe('1h 30m');
  });

  it('includes days once the schedule spans one', () => {
    // Arrange / Act
    const result = formatCompactTwapDuration({
      days: '2',
      hours: '3',
      minutes: '5',
    });

    // Assert
    expect(result).toBe('2d 3h 5m');
  });

  it('treats a non-numeric field as zero', () => {
    // Arrange / Act
    const result = formatCompactTwapDuration({
      days: '',
      hours: 'abc',
      minutes: '15',
    });

    // Assert
    expect(result).toBe('0h 15m');
  });
});

describe('formatTwapRuntimeSummary', () => {
  it('spells minutes out for a sub-hour runtime', () => {
    // Arrange / Act
    const result = formatTwapRuntimeSummary(30);

    // Assert: the Figma summary reads "30 mins", not the compact "0h 30m"
    expect(result).toBe('30 mins');
  });

  it('combines hours and minutes', () => {
    // Arrange / Act
    const result = formatTwapRuntimeSummary(90);

    // Assert
    expect(result).toBe('1 hr 30 mins');
  });

  it('uses singular units for a one-minute runtime', () => {
    // Arrange / Act
    const result = formatTwapRuntimeSummary(1);

    // Assert
    expect(result).toBe('1 min');
  });

  it('includes days once the runtime spans one', () => {
    // Arrange / Act
    const result = formatTwapRuntimeSummary(1500);

    // Assert
    expect(result).toBe('1 day 1 hr');
  });

  it('falls back to a placeholder when no runtime is set', () => {
    // Arrange / Act
    const result = formatTwapRuntimeSummary(0);

    // Assert
    expect(result).toBe('--');
  });
});

describe('PerpsProTwapFields', () => {
  it('renders the runtime value from the model', () => {
    // Arrange / Act
    render(
      <PerpsProTwapFields
        twap={buildTwapModel()}
        onDurationPress={jest.fn()}
      />,
    );

    // Assert
    expect(screen.getByTestId(ids.TWAP_DURATION_VALUE)).toHaveTextContent(
      '0h 30m',
    );
  });

  it('opens the duration picker when the runtime row is pressed', () => {
    // Arrange
    const onDurationPress = jest.fn();
    render(
      <PerpsProTwapFields
        twap={buildTwapModel()}
        onDurationPress={onDurationPress}
      />,
    );

    // Act
    fireEvent.press(screen.getByTestId(ids.TWAP_DURATION_BUTTON));

    // Assert
    expect(onDurationPress).toHaveBeenCalled();
  });

  it('exposes Randomize with an accessible name', () => {
    // Arrange / Act
    render(
      <PerpsProTwapFields
        twap={buildTwapModel()}
        onDurationPress={jest.fn()}
      />,
    );

    // Assert: the label is an element, so the name must be set explicitly
    expect(screen.getByTestId(ids.TWAP_RANDOMIZE)).toHaveProp(
      'accessibilityLabel',
      'Randomize',
    );
  });

  it('opens the runtime tooltip when the info affordance is pressed', () => {
    // Arrange
    const onRuntimeInfoPress = jest.fn();
    render(
      <PerpsProTwapFields
        twap={buildTwapModel({ onRuntimeInfoPress })}
        onDurationPress={jest.fn()}
      />,
    );

    // Act
    fireEvent.press(screen.getByTestId(ids.TWAP_DURATION_INFO));

    // Assert
    expect(onRuntimeInfoPress).toHaveBeenCalled();
  });

  it('reports a Randomize toggle to the model', () => {
    // Arrange
    const onRandomizeChange = jest.fn();
    render(
      <PerpsProTwapFields
        twap={buildTwapModel({ onRandomizeChange })}
        onDurationPress={jest.fn()}
      />,
    );

    // Act
    fireEvent.press(screen.getByTestId(ids.TWAP_RANDOMIZE));

    // Assert
    expect(onRandomizeChange).toHaveBeenCalled();
  });
});
