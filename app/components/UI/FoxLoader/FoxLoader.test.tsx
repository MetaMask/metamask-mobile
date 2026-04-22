// FoxLoader.test.js
import React from 'react';
import { render } from '@testing-library/react-native';
import FoxLoader from './FoxLoader';

describe('FoxLoader', () => {
  it('renders correctly and matches snapshot', () => {
    const { toJSON } = render(<FoxLoader />);
    expect(toJSON()).toMatchSnapshot();
  });
});
