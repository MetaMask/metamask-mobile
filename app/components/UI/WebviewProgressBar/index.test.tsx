import React from 'react';
import { shallow } from 'enzyme';
import WebviewProgressBar from './';

describe('WebviewProgressBar', () => {
  it('should render correctly', () => {
    const wrapper = shallow(<WebviewProgressBar />);
    expect(wrapper).toMatchSnapshot();
  });
});
