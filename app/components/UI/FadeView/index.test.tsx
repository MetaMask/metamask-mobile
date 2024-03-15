import React from 'react';
import { render } from '@testing-library/react-native';
import FadeView from './';

describe('FadeView', () => {
  it('should render correctly', () => {
    const { toJSON } = render(<FadeView visible />);
    expect(toJSON()).toMatchSnapshot();
  });
});
