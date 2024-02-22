import React from 'react';
import NavigationUnitTest from '.';
import { render } from '@testing-library/react-native';

describe('NavigationUnitTest', () => {
  it('should render correctly', () => {
    const wrapper = render(<NavigationUnitTest firstRoute={'TestScreen1'} />);
    expect(wrapper).toMatchSnapshot();
  });
});
