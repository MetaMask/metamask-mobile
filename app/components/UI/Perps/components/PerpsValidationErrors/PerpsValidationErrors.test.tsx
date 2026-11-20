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

  it('renders nothing when there are no errors', () => {
    const { queryByTestId, toJSON } = render(
      <PerpsValidationErrors errors={[]} testID="errors" />,
    );

    expect(queryByTestId('errors')).toBeNull();
    expect(toJSON()).toBeNull();
  });
});
