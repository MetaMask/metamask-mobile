import React from 'react';
import { shallow } from 'enzyme';
import Link from './';

describe('Link', () => {
  it('should render correctly', () => {
    const wrapper = shallow(<Link onPress={jest.fn}>{`I'm a Link!`}</Link>);
    expect(wrapper).toMatchSnapshot();
  });
});
