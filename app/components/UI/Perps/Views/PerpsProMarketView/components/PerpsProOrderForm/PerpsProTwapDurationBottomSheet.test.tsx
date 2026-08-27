import type { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { IconName } from '@metamask/design-system-react-native';
import React from 'react';
import { Platform, TextInput } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { strings } from '../../../../../../../../locales/i18n';
import { PERPS_TWAP_UI_CONFIG } from '../../../../constants/perpsConfig';
import { PerpsProOrderFormSelectorsIDs } from '../../../../Perps.testIds';
import type { PerpsProTwapModel } from './PerpsProOrderForm.types';
import PerpsProTwapDurationBottomSheet, {
  createFutureIosCountdownDate,
} from './PerpsProTwapDurationBottomSheet';

const mockDateTimePicker = jest.fn();
jest.mock('@react-native-community/datetimepicker', () => {
  const ReactActual = jest.requireActual('react');
  return {
    __esModule: true,
    default: (props: Record<string, unknown>) => {
      mockDateTimePicker(props);
      return ReactActual.createElement('DateTimePicker', props);
    },
  };
});

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
const iosCountdownReferenceMs = new Date(2026, 7, 27, 16, 0, 0).getTime();

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
  if (Platform.OS === 'ios') {
    const date = new Date(iosCountdownReferenceMs);
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + 1);
    date.setMinutes(hours * 60 + minutes);
    return date;
  }
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

const renderSheet = (
  twap = createTwap(),
  onClose = jest.fn(),
  triggerNativeLayout = true,
) => {
  render(<PerpsProTwapDurationBottomSheet twap={twap} onClose={onClose} />);
  const picker = screen.getByTestId(ids.TWAP_DURATION_PICKER);
  if (triggerNativeLayout) {
    fireEvent(picker, 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width: 320, height: 216 } },
    });
  }
  return {
    picker: screen.getByTestId(ids.TWAP_DURATION_PICKER),
    onClose,
  };
};

describe('PerpsProTwapDurationBottomSheet', () => {
  beforeEach(() => {
    Platform.OS = 'ios';
    mockDateTimePicker.mockClear();
    jest.spyOn(Date, 'now').mockReturnValue(iosCountdownReferenceMs);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(() => {
    Platform.OS = originalPlatform;
  });

  it('renders the native iOS countdown spinner without custom inputs', () => {
    const { picker } = renderSheet();

    expect(screen.getByTestId(ids.TWAP_DURATION_SHEET)).toBeOnTheScreen();
    expect(picker).toHaveProp('mode', 'countdown');
    expect(picker).toHaveProp('display', 'spinner');
    expect(picker).toHaveProp('themeVariant', 'light');
    expect(picker).not.toHaveProp('timeZoneName');
    expect(picker.props.value.getHours()).toBe(0);
    expect(picker.props.value.getMinutes()).toBe(5);
    expect(picker.props.value.getTime()).toBeGreaterThan(Date.now());
    expect(screen.getByTestId(ids.TWAP_DURATION_SHEET_CLOSE)).toBeOnTheScreen();
    expect(
      screen.UNSAFE_getByProps({ name: IconName.ArrowDown }).props.name,
    ).toBe(IconName.ArrowDown);
    expect(screen.UNSAFE_queryAllByType(TextInput)).toHaveLength(0);
  });

  it('passes a future 30-minute countdown value to the native iOS picker', () => {
    const { picker } = renderSheet(
      createTwap({ minutes: '30' }),
      jest.fn(),
      false,
    );

    expect(picker.props.value.getHours()).toBe(0);
    expect(picker.props.value.getMinutes()).toBe(30);
    expect(mockDateTimePicker).toHaveBeenCalledTimes(1);
    const initialTimestamp = picker.props.value.getTime();

    fireEvent(picker, 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width: 320, height: 216 } },
    });

    const renderedClockValues = mockDateTimePicker.mock.calls.map(([props]) => [
      props.value.getHours(),
      props.value.getMinutes(),
    ]);

    expect(renderedClockValues).toEqual([
      [0, 30],
      [0, 30],
    ]);
    const updatedPicker = screen.getByTestId(ids.TWAP_DURATION_PICKER);
    expect(updatedPicker.props.value.getHours()).toBe(0);
    expect(updatedPicker.props.value.getMinutes()).toBe(30);
    expect(updatedPicker.props.value.getTime()).toBeGreaterThan(Date.now());
    expect(updatedPicker.props.value.getTime()).toBe(initialTimestamp + 1);
  });

  it('skips a requested midnight normalized forward by a DST transition', () => {
    const createCandidate = jest.fn(
      (
        referenceMs: number,
        dayOffset: number,
        hours: number,
        minutes: number,
        milliseconds: number,
      ) => {
        const date = new Date(referenceMs);
        date.setDate(date.getDate() + dayOffset);
        date.setHours(
          dayOffset === 1 ? hours + 1 : hours,
          minutes,
          0,
          milliseconds,
        );
        return date;
      },
    );

    const date = createFutureIosCountdownDate(
      30,
      iosCountdownReferenceMs,
      false,
      createCandidate,
    );

    expect(createCandidate).toHaveBeenCalledTimes(2);
    expect(date.getHours()).toBe(0);
    expect(date.getMinutes()).toBe(30);
    expect(date.getTime()).toBeGreaterThan(iosCountdownReferenceMs);
  });

  it('omits duplicate running-time copy from the native picker sheet', () => {
    renderSheet();

    expect(
      screen.queryByText(strings('perps.pro_order_form.twap.running_time')),
    ).not.toBeOnTheScreen();
    expect(
      screen.queryByText(
        strings(
          'perps.pro_order_form.twap.valid_range',
          PERPS_TWAP_UI_CONFIG.DurationRangeI18nValues,
        ),
      ),
    ).not.toBeOnTheScreen();
  });

  it('maps iOS zero to a zero-minute duration without closing', () => {
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

    expect(twap.onDaysChange).toHaveBeenCalledWith('');
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

      expect(picker.props.value.getHours()).toBe(0);
      expect(picker.props.value.getMinutes()).toBe(minutes);
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

  it('displays an existing iOS 24-hour duration at the native ceiling', () => {
    const twap = createTwap({ days: '1', hours: '0', minutes: '0' });

    const { picker } = renderSheet(twap);

    expect(picker.props.value.getHours()).toBe(23);
    expect(picker.props.value.getMinutes()).toBe(59);
    expect(twap.onDaysChange).not.toHaveBeenCalled();
    expect(twap.onHoursChange).not.toHaveBeenCalled();
    expect(twap.onMinutesChange).not.toHaveBeenCalled();
  });

  it('preserves stored iOS 24 hours when reopen echoes the native ceiling', () => {
    const twap = createTwap({ days: '1', hours: '0', minutes: '0' });
    const { picker } = renderSheet(twap);
    const selectedDate = pickerDate(23, 59);

    fireEvent(
      picker,
      'onChange',
      pickerEvent('set', selectedDate),
      selectedDate,
    );

    expect(twap.onDaysChange).not.toHaveBeenCalled();
    expect(twap.onHoursChange).not.toHaveBeenCalled();
    expect(twap.onMinutesChange).not.toHaveBeenCalled();
  });

  it('displays an existing Android 24-hour duration at midnight', () => {
    Platform.OS = 'android';
    const twap = createTwap({ days: '1', hours: '0', minutes: '0' });

    const { picker } = renderSheet(twap);

    expect(picker.props.value.getUTCHours()).toBe(0);
    expect(picker.props.value.getUTCMinutes()).toBe(0);
    expect(twap.onDaysChange).not.toHaveBeenCalled();
    expect(twap.onHoursChange).not.toHaveBeenCalled();
    expect(twap.onMinutesChange).not.toHaveBeenCalled();
  });

  it('closes from the sheet dismiss control without changing the duration', () => {
    const twap = createTwap();
    const onClose = jest.fn();
    renderSheet(twap, onClose);

    fireEvent.press(screen.getByTestId(ids.TWAP_DURATION_SHEET_CLOSE));

    expect(twap.onMinutesChange).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it.each([
    {
      label: 'midnight as 24 hours',
      hours: 0,
      minutes: 0,
      expectedEvents: ['close', 'days:1', 'hours:0', 'minutes:0'],
    },
    {
      label: 'selected hours and minutes',
      hours: 5,
      minutes: 30,
      expectedEvents: ['close', 'days:', 'hours:5', 'minutes:30'],
    },
  ])(
    'closes Android before applying $label',
    ({ hours, minutes, expectedEvents }) => {
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
      const selectedDate = pickerDate(hours, minutes);

      expect(picker).toHaveProp('mode', 'time');
      expect(picker).toHaveProp('display', 'spinner');
      expect(picker).toHaveProp('is24Hour', true);
      expect(picker).toHaveProp('timeZoneName', 'UTC');

      fireEvent(
        picker,
        'onChange',
        pickerEvent('set', selectedDate),
        selectedDate,
      );

      expect(events).toEqual(expectedEvents);
      expect(
        screen.queryByTestId(ids.TWAP_DURATION_PICKER),
      ).not.toBeOnTheScreen();
    },
  );

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
