import React from 'react';
import { shallow } from 'enzyme';
import AddCustomToken from './';

describe('AddCustomToken', () => {
  it('should render correctly', () => {
    const wrapper = shallow(<AddCustomToken />);
    expect(wrapper).toMatchSnapshot();
  });
});
