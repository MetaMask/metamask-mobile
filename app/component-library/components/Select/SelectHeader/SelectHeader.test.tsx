// Third party dependencies.
import React from 'react';
import { render } from '@testing-library/react-native';

// Internal dependencies.
import SelectHeader from './SelectHeader';

describe('SelectHeader', () => {
  it('should render snapshot correctly', () => {
    const wrapper = render(<SelectHeader>Sample Header Title</SelectHeader>);
    expect(wrapper).toMatchSnapshot();
  });
});
