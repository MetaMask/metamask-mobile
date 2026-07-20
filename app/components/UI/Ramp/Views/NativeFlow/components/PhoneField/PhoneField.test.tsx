import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import type { Country } from '@metamask/ramps-controller';
import PhoneField from './PhoneField';
import { ThemeContext, mockTheme } from '../../../../../../../util/theme';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('../../../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
  I18nEvents: { addListener: jest.fn() },
}));

jest.mock('../../../../../../../util/navigation/navUtils', () => ({
  ...jest.requireActual('../../../../../../../util/navigation/navUtils'),
  createNavigationDetails:
    (..._args: unknown[]) =>
    (params: unknown) => ['MockRoute', params],
}));

jest.mock('../../../../utils/formatNumberToTemplate', () => ({
  formatNumberToTemplate: (num: string) => num,
}));

const makeCountry = (isoCode: string, flag: string, prefix: string): Country =>
  ({
    isoCode,
    name: isoCode,
    flag,
    currency: '',
    supported: { buy: true, sell: true },
    phone: { prefix, placeholder: `${isoCode} placeholder`, template: 'XXX' },
  }) as Country;

const US = makeCountry('US', '🇺🇸', '+1');
const PT = makeCountry('PT', '🇵🇹', '+351');
const GB = makeCountry('GB', '🇬🇧', '+44');
const countries = [US, PT, GB];

const renderField = (
  props: Partial<React.ComponentProps<typeof PhoneField>> = {},
) =>
  render(
    <ThemeContext.Provider value={mockTheme}>
      <PhoneField
        label="Phone number"
        value=""
        onChangeText={jest.fn()}
        countries={countries}
        fallbackCountry={US}
        testID="phone-input"
        countrySelectorTestID="phone-country-selector"
        {...props}
      />
    </ThemeContext.Provider>,
  );

describe('PhoneField', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the fallback country prefix by default', () => {
    const { getByText } = renderField();
    expect(getByText('+1')).toBeOnTheScreen();
  });

  it('infers the phone country from a prefilled number prefix', () => {
    const { getByText } = renderField({
      fallbackCountry: PT,
      initialNumber: '+447123456789',
      value: '+447123456789',
    });
    expect(getByText('+44')).toBeOnTheScreen();
  });

  it('opens the country selector with the current selection', () => {
    const { getByTestId } = renderField();

    fireEvent.press(getByTestId('phone-country-selector'));

    expect(mockNavigate).toHaveBeenCalledWith(
      'MockRoute',
      expect.objectContaining({
        countries,
        selectedCountry: expect.objectContaining({ isoCode: 'US' }),
        onCountrySelect: expect.any(Function),
      }),
    );
  });

  it('re-prefixes the local digits when a new country is selected', () => {
    const onChangeText = jest.fn();
    const { getByTestId, getByText } = renderField({
      fallbackCountry: PT,
      initialNumber: '+351912345678',
      value: '+351912345678',
      onChangeText,
    });

    fireEvent.press(getByTestId('phone-country-selector'));
    act(() => {
      mockNavigate.mock.calls[0][1].onCountrySelect(GB);
    });

    expect(onChangeText).toHaveBeenCalledWith('+44912345678');
    expect(getByText('+44')).toBeOnTheScreen();
  });

  it('emits the prefixed number on text input', () => {
    const onChangeText = jest.fn();
    const { getByTestId } = renderField({ onChangeText });

    fireEvent.changeText(getByTestId('phone-input'), '1234567890');

    expect(onChangeText).toHaveBeenCalledWith('+11234567890');
  });

  it('does not advance to the next field on a single keystroke', () => {
    const onSubmitEditing = jest.fn();
    // Local digits go from "1" to "12": one new digit, not autofill.
    const { getByTestId } = renderField({ value: '+11', onSubmitEditing });

    fireEvent.changeText(getByTestId('phone-input'), '12');

    expect(onSubmitEditing).not.toHaveBeenCalled();
  });

  it('advances to the next field when the number is autofilled', () => {
    const onSubmitEditing = jest.fn();
    const { getByTestId } = renderField({ onSubmitEditing });

    fireEvent.changeText(getByTestId('phone-input'), '5551234');

    expect(onSubmitEditing).toHaveBeenCalled();
  });

  it.each([
    ['a plain international number', '+447123456789'],
    ['a number with leading whitespace', '  +447123456789'],
    ['a tel: URI', 'tel:+447123456789'],
    ['a plain international number without plus sign', 'tel:447123456789'],
  ])(
    'strips the prefix instead of duplicating it when pasting %s',
    (_label, pasted) => {
      const onChangeText = jest.fn();
      // Selected country is GB (+44); the user pastes a full +44 number.
      const { getByTestId } = renderField({
        fallbackCountry: GB,
        onChangeText,
      });

      fireEvent.changeText(getByTestId('phone-input'), pasted);

      // Prefix is applied once — not `+44447123456789`.
      expect(onChangeText).toHaveBeenCalledWith('+447123456789');
    },
  );
});
