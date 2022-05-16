import React from 'react';
import { shallow } from 'enzyme';
import BiometryButton from './';

describe('BiometryButton', () => {
  it('should render correctly', () => {
    const wrapper = shallow(<BiometryButton />);
    expect(wrapper).toMatchSnapshot();
  });
});
