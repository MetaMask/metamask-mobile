import React from 'react';
import { act, fireEvent, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import PhoneNumberEntry, {
  type PhoneNumberEntryProps,
} from './PhoneNumberEntry';
import { getPhoneNumberEntryTestIds } from './PhoneNumberEntry.testIds';

const ids = getPhoneNumberEntryTestIds('phone-number-entry');

const renderEntry = (props: Partial<PhoneNumberEntryProps> = {}) => {
  const onSubmit = jest.fn().mockResolvedValue(undefined);
  const utils = renderWithProvider(
    <PhoneNumberEntry
      title="Verify your phone number"
      description="We’ll text you a code."
      ctaLabel="Send code"
      onSubmit={onSubmit}
      {...props}
    />,
    { state: {} },
  );
  return { onSubmit, ...utils };
};

const isDisabled = (node: { props: Record<string, unknown> }) =>
  Boolean(
    (node.props.accessibilityState as { disabled?: boolean } | undefined)
      ?.disabled ?? node.props.disabled,
  );

describe('PhoneNumberEntry', () => {
  it('renders the copy it is given', () => {
    const { getByText } = renderEntry();

    expect(getByText('Verify your phone number')).toBeOnTheScreen();
    expect(getByText('We’ll text you a code.')).toBeOnTheScreen();
    expect(getByText('Send code')).toBeOnTheScreen();
  });

  it('formats the number as the user types', () => {
    const { getByTestId } = renderEntry();

    fireEvent.changeText(getByTestId(ids.INPUT), '4155552671');

    expect(getByTestId(ids.INPUT).props.value).toBe('(415) 555-2671');
  });

  it('disables the button until the number is valid', () => {
    const { getByTestId } = renderEntry();
    expect(isDisabled(getByTestId(ids.SUBMIT_BUTTON))).toBe(true);

    fireEvent.changeText(getByTestId(ids.INPUT), '415555267');
    expect(isDisabled(getByTestId(ids.SUBMIT_BUTTON))).toBe(true);

    fireEvent.changeText(getByTestId(ids.INPUT), '4155552671');
    expect(isDisabled(getByTestId(ids.SUBMIT_BUTTON))).toBe(false);
  });

  it('shows the invalid message once the input is left incomplete', () => {
    const { getByTestId, queryByTestId } = renderEntry();

    fireEvent.changeText(getByTestId(ids.INPUT), '415');
    expect(queryByTestId(ids.INVALID)).toBeNull();

    fireEvent(getByTestId(ids.INPUT), 'blur');
    expect(getByTestId(ids.INVALID)).toBeOnTheScreen();

    fireEvent.changeText(getByTestId(ids.INPUT), '4155552671');
    expect(queryByTestId(ids.INVALID)).toBeNull();
  });

  it('submits a US number in E.164 form', async () => {
    const { getByTestId, onSubmit } = renderEntry();

    fireEvent.changeText(getByTestId(ids.INPUT), '4155552671');
    fireEvent.press(getByTestId(ids.SUBMIT_BUTTON));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        e164: '+14155552671',
        country: 'US',
        national: '4155552671',
      }),
    );
  });

  it('starts in the default country and an initial value', async () => {
    const { getByTestId, onSubmit } = renderEntry({
      defaultCountry: 'GB',
      initialValue: '07911 123456',
    });

    expect(getByTestId(ids.INPUT).props.value).toBe('7911 123456');
    fireEvent.press(getByTestId(ids.SUBMIT_BUTTON));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        e164: '+447911123456',
        country: 'GB',
        national: '7911123456',
      }),
    );
  });

  it('switches country for a pasted international number', async () => {
    const { getByTestId, onSubmit } = renderEntry();

    fireEvent.changeText(getByTestId(ids.INPUT), '+33 6 12 34 56 78');
    fireEvent.press(getByTestId(ids.SUBMIT_BUTTON));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        e164: '+33612345678',
        country: 'FR',
        national: '612345678',
      }),
    );
  });

  it('filters the country picker by name, code or calling code', async () => {
    const { getByTestId, getByText, queryByTestId, getByPlaceholderText } =
      renderEntry();

    fireEvent.press(getByTestId(ids.COUNTRY_BUTTON));
    const search = getByPlaceholderText('Search by country');

    expect(getByText('United States of America')).toBeOnTheScreen();

    fireEvent.changeText(search, 'fran');
    expect(getByText('France')).toBeOnTheScreen();
    expect(getByTestId(ids.COUNTRY_OPTION('FR'))).toBeOnTheScreen();
    expect(queryByTestId(ids.COUNTRY_OPTION('GB'))).toBeNull();

    fireEvent.changeText(search, '+44');
    expect(getByTestId(ids.COUNTRY_OPTION('GB'))).toBeOnTheScreen();
    expect(queryByTestId(ids.COUNTRY_OPTION('FR'))).toBeNull();

    ['1809', '+1 809', '+1787', '684'].forEach((query, index) => {
      fireEvent.changeText(search, query);
      const iso = ['DO', 'DO', 'PR', 'AS'][index];
      expect(getByTestId(ids.COUNTRY_OPTION(iso))).toBeOnTheScreen();
    });

    fireEvent.changeText(search, 'zzzz');
    expect(queryByTestId(ids.COUNTRY_OPTION('GB'))).toBeNull();
  });

  it('changes the country from the picker', async () => {
    const { getByTestId, getByPlaceholderText, queryByTestId, onSubmit } =
      renderEntry();

    fireEvent.press(getByTestId(ids.COUNTRY_BUTTON));
    fireEvent.changeText(getByPlaceholderText('Search by country'), '+44');
    fireEvent.press(getByTestId(ids.COUNTRY_OPTION('GB')));
    await waitFor(() => expect(queryByTestId(ids.COUNTRY_SHEET)).toBeNull());
    fireEvent.changeText(getByTestId(ids.INPUT), '7911123456');
    fireEvent.press(getByTestId(ids.SUBMIT_BUTTON));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ e164: '+447911123456', country: 'GB' }),
      ),
    );
  });

  it('submits from the keyboard once the number is valid', async () => {
    const { getByTestId, onSubmit } = renderEntry();

    fireEvent(getByTestId(ids.INPUT), 'submitEditing');
    expect(onSubmit).not.toHaveBeenCalled();

    fireEvent.changeText(getByTestId(ids.INPUT), '4155552671');
    fireEvent(getByTestId(ids.INPUT), 'submitEditing');

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
  });

  it('ignores a second submit while the first is pending', async () => {
    let resolve: () => void = () => undefined;
    const onSubmit = jest.fn(async () => {
      await new Promise<void>((done) => {
        resolve = done;
      });
    });
    const { getByTestId } = renderEntry({ onSubmit });

    fireEvent.changeText(getByTestId(ids.INPUT), '4155552671');
    fireEvent.press(getByTestId(ids.SUBMIT_BUTTON));
    fireEvent.press(getByTestId(ids.SUBMIT_BUTTON));
    await act(async () => resolve());

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('does not submit while isSubmitting', () => {
    const { getByTestId, onSubmit } = renderEntry({
      isSubmitting: true,
      initialValue: '+14155552671',
    });

    fireEvent.press(getByTestId(ids.SUBMIT_BUTTON));

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('survives a rejected submit', async () => {
    const onSubmit = jest.fn().mockRejectedValue(new Error('nope'));
    const { getByTestId } = renderEntry({
      onSubmit,
      initialValue: '+14155552671',
    });

    fireEvent.press(getByTestId(ids.SUBMIT_BUTTON));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
  });

  it('renders the disclaimer, as a string or a node', () => {
    const first = renderEntry({ disclaimer: 'The code comes from Kalshi.' });
    expect(first.getByTestId(ids.DISCLAIMER)).toBeOnTheScreen();
    expect(first.getByText('The code comes from Kalshi.')).toBeOnTheScreen();
    first.unmount();

    const second = renderEntry({ disclaimer: <Text>Custom notice</Text> });
    expect(second.getByText('Custom notice')).toBeOnTheScreen();
  });

  it('shows an example number for the country as the placeholder', () => {
    const { getByTestId } = renderEntry();

    expect(getByTestId(ids.INPUT).props.placeholder).toBe('(555) 123-4567');
  });

  it('renders no disclaimer by default', () => {
    const { queryByTestId } = renderEntry();

    expect(queryByTestId(ids.DISCLAIMER)).toBeNull();
  });

  it('shows the caller’s error, as a string or a node', () => {
    const first = renderEntry({ error: 'Too many attempts.' });
    expect(first.getByTestId(ids.ERROR)).toBeOnTheScreen();
    expect(first.getByText('Too many attempts.')).toBeOnTheScreen();
    first.unmount();

    const second = renderEntry({ error: <Text>Try again at 10:00</Text> });
    expect(second.getByText('Try again at 10:00')).toBeOnTheScreen();
  });

  it('prefixes its test ids', () => {
    const { getByTestId } = renderEntry({ testIdPrefix: 'kalshi-phone' });

    expect(
      getByTestId(getPhoneNumberEntryTestIds('kalshi-phone').INPUT),
    ).toBeOnTheScreen();
  });
});
