import React from 'react';
import NavigationUnitTest from '.';
import { render } from '@testing-library/react-native';

describe('NavigationUnitTest', () => {
  it('should render correctly', () => {
    const wrapper = render(<NavigationUnitTest secondRoute={'TestScreen2'} />);
    expect(wrapper).toMatchSnapshot();
  });
});
