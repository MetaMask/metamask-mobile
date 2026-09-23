import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import type { Region } from '../../types';
import CountrySelectField from './CountrySelectField';

jest.mock('@metamask/design-system-react-native', () => {
  const ReactActual = jest.requireActual('react');
  const { View, Text } = jest.requireActual('react-native');

  return {
    Box: ({
      children,
      testID,
    }: {
      children: React.ReactNode;
      testID?: string;
    }) => ReactActual.createElement(View, { testID }, children),
    Label: ({ children }: { children: React.ReactNode }) =>
      ReactActual.createElement(Text, null, children),
    Text: ({
      children,
      testID,
    }: {
      children: React.ReactNode;
      testID?: string;
    }) => ReactActual.createElement(Text, { testID }, children),
    Icon: ({ name }: { name: string }) =>
      ReactActual.createElement(View, { testID: `icon-${name}` }),
    Spinner: () => ReactActual.createElement(View, { testID: 'spinner' }),
    TextVariant: { BodyMd: 'BodyMd' },
    IconName: { ArrowDown: 'arrow-down' },
    IconSize: { Sm: 'sm' },
  };
});

const onPress = jest.fn();

const unitedKingdom: Region = {
  key: 'GB',
  name: 'United Kingdom',
  emoji: '🇬🇧',
};

function renderField(
  props: Partial<React.ComponentProps<typeof CountrySelectField>> = {},
) {
  return render(
    <CountrySelectField
      label="Country"
      selectedCountry={null}
      onPress={onPress}
      testID="country-select"
      loadingTestID="country-loading"
      {...props}
    />,
  );
}

describe('CountrySelectField', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the label and an empty field when no country is selected', () => {
    renderField();

    expect(screen.getByText('Country')).toBeOnTheScreen();
    expect(screen.getByTestId('country-select')).toBeOnTheScreen();
    expect(screen.queryByTestId('country-loading')).toBeNull();
  });

  it('shows the country flag and name', () => {
    renderField({ selectedCountry: unitedKingdom });

    expect(screen.getByTestId('country-select')).toHaveTextContent(
      '🇬🇧 United Kingdom',
    );
  });

  it('derives the flag from the country code when emoji is missing', () => {
    renderField({
      selectedCountry: { key: 'US', name: 'United States' },
    });

    expect(screen.getByTestId('country-select')).toHaveTextContent(
      '🇺🇸 United States',
    );
  });

  it('shows the spinner while countries are loading and none is selected', () => {
    renderField({ isLoading: true });

    expect(screen.getByTestId('country-loading')).toBeOnTheScreen();
    expect(screen.getByTestId('spinner')).toBeOnTheScreen();
    expect(screen.queryByTestId('country-select')).toBeNull();
  });

  it('keeps the selected country visible and disabled while loading', () => {
    renderField({ selectedCountry: unitedKingdom, isLoading: true });

    expect(screen.getByTestId('country-select')).toHaveTextContent(
      '🇬🇧 United Kingdom',
    );
    expect(screen.getByTestId('country-select')).toBeDisabled();
    expect(screen.queryByTestId('country-loading')).toBeNull();
  });

  it('disables the field when isDisabled is true', () => {
    renderField({ selectedCountry: unitedKingdom, isDisabled: true });

    expect(screen.getByTestId('country-select')).toBeDisabled();
  });

  it('calls onPress when the field is pressed', () => {
    renderField({ selectedCountry: unitedKingdom });

    fireEvent.press(screen.getByTestId('country-select'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
