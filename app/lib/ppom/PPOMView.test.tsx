import React from 'react';
import { shallow } from 'enzyme';

import { PPOMView } from './PPOMView';

describe('PPOMView', () => {
  it('should render correctly', () => {
    const wrapper = shallow(<PPOMView />);
    expect(wrapper).toMatchSnapshot();
  });
});
