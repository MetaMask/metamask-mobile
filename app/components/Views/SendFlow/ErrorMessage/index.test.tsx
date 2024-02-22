import React from 'react';
import { shallow } from 'enzyme';
import ErrorMessage from './';

describe('ErrorMessage', () => {
  it('should render correctly', () => {
    const wrapper = shallow(<ErrorMessage errorMessage={'error'} />);
    expect(wrapper).toMatchSnapshot();
  });
});
