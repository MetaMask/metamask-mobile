import React from 'react';
import { render } from '@testing-library/react-native';
import Root from './';

describe('Root', () => {
  it('should render correctly', () => {
    const { toJSON } = render(<Root />);
    expect(toJSON()).toMatchSnapshot();
  });
});
