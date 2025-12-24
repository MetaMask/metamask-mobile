import { Box, DateTimePicker, Field } from '@metamask/snaps-sdk/jsx';
import { renderInterface } from '../testUtils';
import { act, fireEvent, waitFor } from '@testing-library/react-native';

import RNDateTimePicker from '@react-native-community/datetimepicker';
import { DateTime } from 'luxon';

jest.mock('../../../../core/Engine/Engine', () => ({
  controllerMessenger: {
    call: jest.fn(),
  },
  context: {
    SnapInterfaceController: {
      updateInterfaceState: jest.fn(),
    },
  },
}));

describe('SnapUIDateTimePicker', () => {
  it('renders a date time picker', () => {
    const { toJSON, getByTestId } = renderInterface(
      Box({
        children: DateTimePicker({
          name: 'date-time-picker',
        }),
      }),
    );

    expect(getByTestId('snap-ui-renderer__date-time-picker')).toBeTruthy();

    expect(toJSON()).toMatchSnapshot();
  });

  it('renders a date picker', () => {
    const { toJSON, getByTestId } = renderInterface(
      Box({
        children: DateTimePicker({
          name: 'date-picker',
          type: 'date',
        }),
      }),
    );

    expect(getByTestId('snap-ui-renderer__date-time-picker')).toBeTruthy();

    expect(toJSON()).toMatchSnapshot();
  });

  it('renders a time picker', () => {
    const { toJSON, getByTestId } = renderInterface(
      Box({
        children: DateTimePicker({
          name: 'time-picker',
          type: 'time',
        }),
      }),
    );

    expect(getByTestId('snap-ui-renderer__date-time-picker')).toBeTruthy();

    expect(toJSON()).toMatchSnapshot();
  });

  it('can select a date and time', async () => {
    const { getByTestId, UNSAFE_getByType, getByText } = renderInterface(
      Box({
        children: DateTimePicker({
          name: 'date-time-picker',
          type: 'datetime',
        }),
      }),
    );

    act(() => {
      fireEvent.press(
        getByTestId('snap-ui-renderer__date-time-picker--datetime-touchable'),
      );
    });

    await waitFor(() => UNSAFE_getByType(RNDateTimePicker));

    const date = new Date('2024-12-25T15:30:00Z');

    act(() => {
      fireEvent(
        UNSAFE_getByType(RNDateTimePicker),
        'onChange',
        {
          type: 'set',
          nativeEvent: {
            timestamp: date.getTime(),
            utcOffset: 0,
          },
        },
        date,
      );
    });

    act(() => {
      fireEvent.press(getByText('OK'));
    });

    expect(
      getByTestId('snap-ui-renderer__date-time-picker--datetime-input').props
        .value,
    ).toEqual(
      DateTime.fromJSDate(date).toLocaleString(DateTime.DATETIME_SHORT),
    );
  });

  it('can select a date', async () => {
    const { getByTestId, UNSAFE_getByType, getByText } = renderInterface(
      Box({
        children: DateTimePicker({
          name: 'date-picker',
          type: 'date',
        }),
      }),
    );

    act(() => {
      fireEvent.press(
        getByTestId('snap-ui-renderer__date-time-picker--date-touchable'),
      );
    });

    await waitFor(() => UNSAFE_getByType(RNDateTimePicker));

    const date = new Date('2024-12-25T15:30:00Z');

    act(() => {
      fireEvent(
        UNSAFE_getByType(RNDateTimePicker),
        'onChange',
        {
          type: 'set',
          nativeEvent: {
            timestamp: date.getTime(),
            utcOffset: 0,
          },
        },
        date,
      );
    });

    act(() => {
      fireEvent.press(getByText('OK'));
    });

    expect(
      getByTestId('snap-ui-renderer__date-time-picker--date-input').props.value,
    ).toEqual(
      DateTime.fromJSDate(date)
        .set({ hour: 0, minute: 0, second: 0, millisecond: 0 })
        .toLocaleString(DateTime.DATE_SHORT),
    );
  });

  it('can select a time', async () => {
    const { getByTestId, UNSAFE_getByType, getByText } = renderInterface(
      Box({
        children: DateTimePicker({
          name: 'time-picker',
          type: 'time',
        }),
      }),
    );

    act(() => {
      fireEvent.press(
        getByTestId('snap-ui-renderer__date-time-picker--time-touchable'),
      );
    });

    await waitFor(() => UNSAFE_getByType(RNDateTimePicker));

    const date = new Date('2024-12-25T15:30:00Z');

    act(() => {
      fireEvent(
        UNSAFE_getByType(RNDateTimePicker),
        'onChange',
        {
          type: 'set',
          nativeEvent: {
            timestamp: date.getTime(),
            utcOffset: 0,
          },
        },
        date,
      );
    });

    act(() => {
      fireEvent.press(getByText('OK'));
    });

    expect(
      getByTestId('snap-ui-renderer__date-time-picker--time-input').props.value,
    ).toEqual(
      DateTime.fromJSDate(date)
        .set({ second: 0, millisecond: 0 })
        .toLocaleString(DateTime.TIME_SIMPLE),
    );
  });

  it('renders inside a field', () => {
    const { toJSON, getByText, getByTestId } = renderInterface(
      Box({
        children: Field({
          label: 'Select date and time',
          children: DateTimePicker({
            name: 'date-time-picker',
          }),
        }),
      }),
    );

    expect(getByText('Select date and time')).toBeTruthy();
    expect(getByTestId('snap-ui-renderer__date-time-picker')).toBeTruthy();
    expect(toJSON()).toMatchSnapshot();
  });

  it('can show an error', () => {
    const { toJSON, getByText, getByTestId } = renderInterface(
      Box({
        children: Field({
          label: 'Select date and time',
          error: 'This is an error',
          children: DateTimePicker({
            name: 'date-time-picker',
          }),
        }),
      }),
    );

    expect(getByText('Select date and time')).toBeTruthy();
    expect(getByText('This is an error')).toBeTruthy();
    expect(getByTestId('snap-ui-renderer__date-time-picker')).toBeTruthy();
    expect(toJSON()).toMatchSnapshot();
  });
});
