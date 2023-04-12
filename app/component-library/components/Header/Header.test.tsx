// Third party dependencies.
import React from 'react';
import { shallow } from 'enzyme';

// Internal dependencies.
import Header from './Header';

describe('Header', () => {
  it('should render correctly', () => {
    const wrapper = shallow(<Header>Sample Header Title</Header>);
    expect(wrapper).toMatchSnapshot();
  });
});
