import React from 'react';
import { render } from '@testing-library/react-native';
import AddCustomToken from './';

describe('AddCustomToken', () => {
  it('should render correctly', () => {
    const wrapper = render(<AddCustomToken />);
    expect(wrapper).toMatchSnapshot();
  });
});
