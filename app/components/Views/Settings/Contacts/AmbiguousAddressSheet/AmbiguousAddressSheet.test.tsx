import React from 'react';
import { shallow } from 'enzyme';
import AmbiguousAddressSheet from './AmbiguousAddressSheet';

describe('AmbiguousAddressSheet', () => {
  it('should render correctly', () => {
    const wrapper = shallow(<AmbiguousAddressSheet />);
    expect(wrapper).toMatchSnapshot();
  });
});
