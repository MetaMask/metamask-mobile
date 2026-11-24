import React from 'react';
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';
import CardFormField from './CardFormField';

describe('CardFormField', () => {
  it('renders the label, control, helper and error text', () => {
    const { getByText, getByTestId } = render(
      <CardFormField
        label="Email"
        helpText="We'll send a code"
        helpTextTestID="field-help"
        errorText="Invalid email"
        errorTestID="field-error"
        testID="field"
      >
        <Text testID="control">control</Text>
      </CardFormField>,
    );

    expect(getByTestId('field')).toBeOnTheScreen();
    expect(getByText('Email')).toBeOnTheScreen();
    expect(getByTestId('control')).toBeOnTheScreen();
    expect(getByTestId('field-help')).toHaveTextContent("We'll send a code");
    expect(getByTestId('field-error')).toHaveTextContent('Invalid email');
  });

  it('omits the label, helper and error when not provided', () => {
    const { queryByTestId, getByTestId } = render(
      <CardFormField helpTextTestID="field-help" errorTestID="field-error">
        <Text testID="control">control</Text>
      </CardFormField>,
    );

    expect(getByTestId('control')).toBeOnTheScreen();
    expect(queryByTestId('field-help')).toBeNull();
    expect(queryByTestId('field-error')).toBeNull();
  });

  it('does not render an error for a null errorText', () => {
    const { queryByTestId } = render(
      <CardFormField label="Email" errorText={null} errorTestID="field-error">
        <Text>control</Text>
      </CardFormField>,
    );

    expect(queryByTestId('field-error')).toBeNull();
  });
});
