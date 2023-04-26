import React from 'react';
import { render } from '@testing-library/react-native';
import ActionView from './';

describe('ActionView', () => {
  it('should render correctly', () => {
    const { toJSON } = render(<ActionView />);
    expect(toJSON()).toMatchSnapshot();
  });
});
