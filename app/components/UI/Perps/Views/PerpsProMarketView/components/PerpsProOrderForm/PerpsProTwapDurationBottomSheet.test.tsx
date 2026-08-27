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

  it('maps iOS midnight to 24 hours without closing the sheet', () => {
    const twap = createTwap();
    const onClose = jest.fn();
    const { picker } = renderSheet(twap, onClose);
    const selectedDate = pickerDate(0, 0);

    fireEvent(
      picker,
      'onChange',
      pickerEvent('set', selectedDate),
      selectedDate,
    );

    expect(twap.onDaysChange).toHaveBeenCalledWith('1');
    expect(twap.onHoursChange).toHaveBeenCalledWith('0');
    expect(twap.onMinutesChange).toHaveBeenCalledWith('0');
    expect(onClose).not.toHaveBeenCalled();
  });

  it.each([1, 2, 3, 4])(
    'keeps 0:%s below the five-minute boundary',
    (minutes) => {
      const durationError = strings(
        'perps.pro_order_form.twap.duration_range',
        {
          minDurationMinutes: 5,
          maxDurationHours: 24,
        },
      );
      const twap = createTwap({ minutes: String(minutes), durationError });
      const { picker } = renderSheet(twap);
      const selectedDate = pickerDate(0, minutes);

      fireEvent(
        picker,
        'onChange',
        pickerEvent('set', selectedDate),
        selectedDate,
      );

      expect(picker.props.value).toEqual(selectedDate);
      expect(twap.onDaysChange).toHaveBeenCalledWith('');
      expect(twap.onHoursChange).toHaveBeenCalledWith('0');
      expect(twap.onMinutesChange).toHaveBeenCalledWith(String(minutes));
      expect(screen.getByTestId(ids.TWAP_DURATION_ERROR)).toHaveTextContent(
        durationError,
      );
    },
  );

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

  it.each(['ios', 'android'] as const)(
    'maps an existing 24-hour duration to native midnight on %s',
    (platform) => {
      Platform.OS = platform;

      const { picker } = renderSheet(
        createTwap({ days: '1', hours: '0', minutes: '0' }),
      );

      expect(picker.props.value).toEqual(pickerDate(0, 0));
    },
  );

  it('closes from the sheet header without changing the duration', () => {
    const twap = createTwap();
    const onClose = jest.fn();
    renderSheet(twap, onClose);

    fireEvent.press(screen.getByTestId(ids.TWAP_DURATION_SHEET_CLOSE));

    expect(twap.onMinutesChange).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes Android before applying midnight as 24 hours', () => {
    Platform.OS = 'android';
    const events: string[] = [];
    const twap = createTwap({
      onDaysChange: jest.fn((value) => events.push(`days:${value}`)),
      onHoursChange: jest.fn((value) => events.push(`hours:${value}`)),
      onMinutesChange: jest.fn((value) => events.push(`minutes:${value}`)),
    });
    const Harness = () => {
      const [visible, setVisible] = React.useState(true);
      return visible ? (
        <PerpsProTwapDurationBottomSheet
          twap={twap}
          onClose={() => {
            events.push('close');
            setVisible(false);
          }}
        />
      ) : null;
    };
    render(<Harness />);
    const picker = screen.getByTestId(ids.TWAP_DURATION_PICKER);
    const selectedDate = pickerDate(0, 0);

    expect(picker).toHaveProp('mode', 'time');
    expect(picker).toHaveProp('display', 'spinner');
    expect(picker).toHaveProp('is24Hour', true);

    fireEvent(
      picker,
      'onChange',
      pickerEvent('set', selectedDate),
      selectedDate,
    );

    expect(events).toEqual(['close', 'days:1', 'hours:0', 'minutes:0']);
    expect(
      screen.queryByTestId(ids.TWAP_DURATION_PICKER),
    ).not.toBeOnTheScreen();
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
