import React from 'react';
import { render } from '@testing-library/react-native';
import WebviewProgressBar from './';

describe('WebviewProgressBar', () => {
  it('should render correctly', () => {
    const wrapper = render(<WebviewProgressBar />);
    expect(wrapper).toMatchSnapshot();
  });
});
