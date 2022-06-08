import React from 'react';
import { shallow } from 'enzyme';
import ActionModal from './';

describe('ActionModal', () => {
  it('should render correctly', () => {
    const wrapper = shallow(<ActionModal />);
    expect(wrapper).toMatchSnapshot();
  });
});
