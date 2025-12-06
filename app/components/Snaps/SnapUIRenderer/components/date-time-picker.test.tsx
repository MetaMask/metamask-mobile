import { Box, DateTimePicker, Field } from '@metamask/snaps-sdk/jsx';
import { renderInterface } from '../testUtils';

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
