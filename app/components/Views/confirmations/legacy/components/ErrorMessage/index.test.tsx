import React from 'react';
import { render } from '@testing-library/react-native';
import ErrorMessage from '.';

describe('ErrorMessage', () => {
  it('should render correctly', () => {
    const { toJSON } = render(<ErrorMessage errorMessage={'error'} />);
    expect(toJSON()).toMatchSnapshot();
  });
});
