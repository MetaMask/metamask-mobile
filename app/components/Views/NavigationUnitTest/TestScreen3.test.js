import React from 'react';
import NavigationUnitTest from '.';
import { render } from 'enzyme';

describe('NavigationUnitTest', () => {
  it('should render correctly', () => {
    const wrapper = render(<NavigationUnitTest />);
    expect(wrapper).toMatchSnapshot();
  });
});
