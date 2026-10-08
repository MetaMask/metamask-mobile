import { render } from '@testing-library/react-native';
import React from 'react';
import PerpsValidationErrors from './PerpsValidationErrors';

describe('PerpsValidationErrors', () => {
  it('renders every error message it is given', () => {
    const errors = ['Minimum order is $10', 'Limit price is too far'];

    const { getByText } = render(<PerpsValidationErrors errors={errors} />);

    expect(getByText('Minimum order is $10')).toBeOnTheScreen();
    expect(getByText('Limit price is too far')).toBeOnTheScreen();
  });

  it('renders the container with no messages when there are no errors', () => {
    const { getByTestId, toJSON } = render(
      <PerpsValidationErrors errors={[]} testID="errors" />,
    );

    expect(getByTestId('errors')).toBeOnTheScreen();
    expect(toJSON()).not.toHaveTextContent(/\w/);
  });
});
