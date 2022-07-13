import React from 'react';
import { shallow } from 'enzyme';
import Tag from './Tag';

describe('Tag', () => {
  it('should render correctly', () => {
    const wrapper = shallow(<Tag label={'Imported'} />);
    expect(wrapper).toMatchSnapshot();
  });
});
