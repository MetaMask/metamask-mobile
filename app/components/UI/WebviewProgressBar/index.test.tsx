import React from 'react';
import { render } from '@testing-library/react-native';
import WebviewProgressBar from './';

describe('WebviewProgressBar', () => {
  it('should render correctly', () => {
    const { toJSON } = render(<WebviewProgressBar />);
    expect(toJSON()).toMatchSnapshot();
  });
});
