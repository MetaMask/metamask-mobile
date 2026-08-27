import type { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import React from 'react';
import { Platform, TextInput } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { strings } from '../../../../../../../../locales/i18n';
import { PerpsProOrderFormSelectorsIDs } from '../../../../Perps.testIds';
import type { PerpsProTwapModel } from './PerpsProOrderForm.types';
import PerpsProTwapDurationBottomSheet from './PerpsProTwapDurationBottomSheet';

jest.mock('@react-native-community/datetimepicker', () => 'DateTimePicker');

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
const originalPlatform = Platform.OS;

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

const pickerDate = (hours: number, minutes: number) => {
  const date = new Date(0);
  date.setUTCHours(hours, minutes);
  return date;
};

const pickerEvent = (
  type: DateTimePickerEvent['type'],
  date = pickerDate(0, 5),
): DateTimePickerEvent => ({
  type,
  nativeEvent: { timestamp: date.getTime(), utcOffset: 0 },
});

const renderSheet = (twap = createTwap(), onClose = jest.fn()) => {
  render(<PerpsProTwapDurationBottomSheet twap={twap} onClose={onClose} />);
  return { picker: screen.getByTestId(ids.TWAP_DURATION_PICKER), onClose };
};

describe('PerpsProTwapDurationBottomSheet', () => {
  beforeEach(() => {
    Platform.OS = 'ios';
  });

  afterAll(() => {
    Platform.OS = originalPlatform;
  });

  it('renders the native iOS countdown spinner without custom inputs', () => {
    const { picker } = renderSheet();

    expect(screen.getByTestId(ids.TWAP_DURATION_SHEET)).toBeOnTheScreen();
    expect(picker).toHaveProp('mode', 'countdown');
    expect(picker).toHaveProp('display', 'spinner');
    expect(picker).toHaveProp('timeZoneName', 'UTC');
    expect(picker).toHaveProp('themeVariant', 'light');
    expect(screen.UNSAFE_queryAllByType(TextInput)).toHaveLength(0);
  });

  it('updates the TWAP model live from the iOS picker', () => {
    const twap = createTwap();
    const onClose = jest.fn();
    const { picker } = renderSheet(twap, onClose);
    const selectedDate = pickerDate(1, 30);

    fireEvent(
      picker,
      'onChange',
      pickerEvent('set', selectedDate),
      selectedDate,
    );

    expect(twap.onDaysChange).toHaveBeenCalledWith('');
    expect(twap.onHoursChange).toHaveBeenCalledWith('1');
    expect(twap.onMinutesChange).toHaveBeenCalledWith('30');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('renders the existing validation error below five minutes', () => {
    const durationError = strings('perps.pro_order_form.twap.duration_range', {
      minDurationMinutes: 5,
      maxDurationHours: 24,
    });
    const { picker } = renderSheet(createTwap({ minutes: '4', durationError }));

    expect(picker.props.value).toEqual(pickerDate(0, 4));
    expect(screen.getByTestId(ids.TWAP_DURATION_ERROR)).toHaveTextContent(
      durationError,
    );
  });

  it('maps the five-minute native boundary', () => {
    const twap = createTwap({ minutes: '30' });
    const { picker } = renderSheet(twap);
    const selectedDate = pickerDate(0, 5);

    fireEvent(
      picker,
      'onChange',
      pickerEvent('set', selectedDate),
      selectedDate,
    );

    expect(twap.onHoursChange).toHaveBeenCalledWith('0');
    expect(twap.onMinutesChange).toHaveBeenCalledWith('5');
  });

  it('clamps an existing 24-hour duration to the native 23:59 ceiling', () => {
    const { picker } = renderSheet(
      createTwap({ days: '1', hours: '0', minutes: '0' }),
    );

    expect(picker.props.value).toEqual(pickerDate(23, 59));
  });

  it('closes from the sheet header without changing the duration', () => {
    const twap = createTwap();
    const onClose = jest.fn();
    renderSheet(twap, onClose);

    fireEvent.press(screen.getByTestId(ids.TWAP_DURATION_SHEET_CLOSE));

    expect(twap.onMinutesChange).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('uses the native Android time picker and closes after selection', () => {
    Platform.OS = 'android';
    const twap = createTwap();
    const onClose = jest.fn();
    const { picker } = renderSheet(twap, onClose);
    const selectedDate = pickerDate(2, 15);

    expect(picker).toHaveProp('mode', 'time');
    expect(picker).toHaveProp('display', 'spinner');
    expect(picker).toHaveProp('is24Hour', true);

    fireEvent(
      picker,
      'onChange',
      pickerEvent('set', selectedDate),
      selectedDate,
    );

    expect(twap.onHoursChange).toHaveBeenCalledWith('2');
    expect(twap.onMinutesChange).toHaveBeenCalledWith('15');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes an Android dismissal without changing the duration', () => {
    Platform.OS = 'android';
    const twap = createTwap();
    const onClose = jest.fn();
    const { picker } = renderSheet(twap, onClose);

    fireEvent(picker, 'onChange', pickerEvent('dismissed'));

    expect(twap.onMinutesChange).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
