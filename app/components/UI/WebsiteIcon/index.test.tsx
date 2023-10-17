import React from 'react';
import { shallow } from 'enzyme';
import WebsiteIcon from './';

describe('WebsiteIcon', () => {
  it('should render correctly', () => {
    const wrapper = shallow(<WebsiteIcon title="title" url="url.com" />);
    expect(wrapper).toMatchSnapshot();
  });
});
