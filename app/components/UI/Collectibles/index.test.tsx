import React from 'react';
import { shallow } from 'enzyme';
import Collectibles from './';

describe('Collectibles', () => {
  it('should render correctly', () => {
    const wrapper = shallow(<Collectibles />);
    expect(wrapper).toMatchSnapshot();
  });
});
