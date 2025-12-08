import { Box, DateTimePicker, Field } from '@metamask/snaps-sdk/jsx';
import { renderInterface } from '../testUtils';
import { fireEvent } from '@testing-library/react-native';

import RNDateTimePicker from '@react-native-community/datetimepicker';
import { DateTime } from 'luxon';

jest.mock('../../../../core/Engine/Engine');

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

  it('can select a date and time', () => {
    const { getByTestId, UNSAFE_getByType } = renderInterface(
      Box({
        children: DateTimePicker({
          name: 'date-time-picker',
          type: 'datetime',
        }),
      }),
    );

    const date = new Date('2024-12-25T15:30:00Z');

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

    expect(
      getByTestId('snap-ui-renderer__date-time-picker-input').props.value,
    ).toEqual(
      DateTime.fromJSDate(date).toLocaleString(DateTime.DATETIME_SHORT),
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
