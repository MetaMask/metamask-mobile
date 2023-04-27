import React from 'react';
import { shallow } from 'enzyme';
import ImportPrivateKeySuccess from './';

describe('ImportPrivateKeySuccess', () => {
  it('should render correctly', () => {
    const wrapper = shallow(<ImportPrivateKeySuccess route={{ params: {} }} />);
    expect(wrapper).toMatchSnapshot();
  });
});
