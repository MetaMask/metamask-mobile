import React from 'react';
import { shallow } from 'enzyme';
import ModalNavbarTitle from './';

describe('ModalNavbarTitle', () => {
  it('should render correctly', () => {
    const title = 'Test';

    const wrapper = shallow(<ModalNavbarTitle title={title} />);
    expect(wrapper).toMatchSnapshot();
  });
});
